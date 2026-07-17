import Parser from "rss-parser";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articles, fetchLogs, sources } from "@/db/schema";
import { listActiveSources } from "@/db/queries/sources";
import { extractArticleText, stripHtml } from "./extract-content";

/** レート枠ガード(docs/09 §5): 初回取得・障害復旧時の大量流入を防ぐ */
const MAX_NEW_PER_SOURCE = 20;
const INITIAL_FETCH_DAYS = 3;
/** AI入力用本文の上限(docs/04 §3.2) */
const CONTENT_MAX_CHARS = 8_000;
/** フィード本文がこれ未満なら記事ページから本文抽出を試みる */
const MIN_CONTENT_CHARS = 500;
/** 本文抽出のリクエスト間隔(docs/09 §2) */
const EXTRACT_DELAY_MS = 2_000;

const parser = new Parser({
  timeout: 20_000,
  headers: {
    "User-Agent": "tech-news-digest-bot/0.1 (personal news reader; contact via site About page)",
  },
});

export type FetchSummary = {
  sourcesTotal: number;
  sourcesFailed: number;
  newArticles: number;
  errors: { source: string; message: string }[];
};

/**
 * 全アクティブメディアのフィードを取得し、新規記事を pending で保存する。
 * 冪等性: guid(なければURL)のUNIQUE制約で重複排除(F-02)。
 * 1メディアの失敗は記録してスキップし、他メディアは継続(F-05)。
 */
export async function fetchFeeds(): Promise<FetchSummary> {
  const db = getDb();
  const activeSources = await listActiveSources();
  const summary: FetchSummary = {
    sourcesTotal: activeSources.length,
    sourcesFailed: 0,
    newArticles: 0,
    errors: [],
  };

  const oldestAllowed = new Date(Date.now() - INITIAL_FETCH_DAYS * 24 * 60 * 60 * 1000);

  for (const source of activeSources) {
    try {
      const feed = await parser.parseURL(source.feedUrl);
      let inserted = 0;

      for (const entry of feed.items ?? []) {
        if (inserted >= MAX_NEW_PER_SOURCE) break;
        const url = entry.link;
        const title = entry.title?.trim();
        if (!url || !title) continue;

        const publishedAt = entry.isoDate ? new Date(entry.isoDate) : new Date();
        if (publishedAt < oldestAllowed) continue;

        const guid = entry.guid || url;
        let content = pickFeedContent(entry);

        if (content.length < MIN_CONTENT_CHARS) {
          const extracted = await extractArticleText(url);
          if (extracted) content = extracted;
          await sleep(EXTRACT_DELAY_MS);
        }

        const result = await db
          .insert(articles)
          .values({
            sourceId: source.id,
            guid,
            url,
            titleOriginal: title,
            contentText: content.slice(0, CONTENT_MAX_CHARS) || null,
            publishedAt,
            status: "pending",
          })
          .onConflictDoNothing({ target: articles.guid })
          .returning({ id: articles.id });

        inserted += result.length;
      }

      summary.newArticles += inserted;
      await db
        .update(sources)
        .set({ lastFetchedAt: new Date() })
        .where(eq(sources.id, source.id));
      await db.insert(fetchLogs).values({
        sourceId: source.id,
        status: "success",
        newArticles: inserted,
      });
    } catch (err) {
      summary.sourcesFailed += 1;
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push({ source: source.slug, message });
      await db.insert(fetchLogs).values({
        sourceId: source.id,
        status: "error",
        errorMessage: message.slice(0, 1000),
      });
    }
  }

  return summary;
}

function pickFeedContent(entry: {
  content?: string;
  contentSnippet?: string;
  summary?: string;
  "content:encoded"?: string;
}): string {
  const raw = entry["content:encoded"] || entry.content || entry.summary || entry.contentSnippet;
  return raw ? stripHtml(raw) : "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
