import { getDb } from "@/db/client";
import { articles, dailyPicks, sources } from "@/db/schema";
import { asc, desc, eq, lte, sql } from "drizzle-orm";
import type { ArticleListItem } from "./articles";
import { fetchTagsFor } from "./articles";

export type PickItem = {
  rank: number;
  reason: string;
  article: ArticleListItem;
};

export type PicksResult = {
  pickDate: string;
  picks: PickItem[];
} | null;

/**
 * 「今日の5本」。当日(JST)分が未生成なら直近の存在する日付の分を返す
 * (トップを空にしない。docs/06 §3.2)
 */
export async function getLatestPicks(todayJst: string): Promise<PicksResult> {
  const db = getDb();

  const latest = await db
    .select({ pickDate: dailyPicks.pickDate })
    .from(dailyPicks)
    .where(lte(dailyPicks.pickDate, todayJst))
    .orderBy(desc(dailyPicks.pickDate))
    .limit(1);

  if (latest.length === 0) return null;
  const pickDate = latest[0].pickDate;

  const rows = await db
    .select({
      rank: dailyPicks.rank,
      reason: dailyPicks.reason,
      id: articles.id,
      url: articles.url,
      titleJa: articles.titleJa,
      titleOriginal: articles.titleOriginal,
      summaryJa: articles.summaryJa,
      publishedAt: articles.publishedAt,
      sourceSlug: sources.slug,
      sourceName: sources.name,
      sourceSiteUrl: sources.siteUrl,
    })
    .from(dailyPicks)
    .innerJoin(articles, eq(dailyPicks.articleId, articles.id))
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(dailyPicks.pickDate, pickDate))
    .orderBy(asc(dailyPicks.rank));

  const tagMap = await fetchTagsFor(rows.map((r) => r.id));

  return {
    pickDate,
    picks: rows.map((r) => ({
      rank: r.rank,
      reason: r.reason,
      article: {
        id: r.id,
        source: { slug: r.sourceSlug, name: r.sourceName, siteUrl: r.sourceSiteUrl },
        titleJa: r.titleJa,
        titleOriginal: r.titleOriginal,
        summaryJa: r.summaryJa,
        url: r.url,
        tags: tagMap.get(r.id) ?? [],
        publishedAt: r.publishedAt,
      },
    })),
  };
}

/** 当日分の picks を洗い替えで保存(curator から使用) */
export async function replacePicks(
  pickDate: string,
  picks: { articleId: number; rank: number; reason: string }[],
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(dailyPicks).where(eq(dailyPicks.pickDate, pickDate));
    if (picks.length > 0) {
      await tx.insert(dailyPicks).values(
        picks.map((p) => ({
          pickDate,
          articleId: p.articleId,
          rank: p.rank,
          reason: p.reason,
        })),
      );
    }
  });
}

/** curator の候補ウィンドウ(直近72時間)。当日取得分に限定せず直近の重要記事を対象にする */
const CANDIDATE_WINDOW_HOURS = 72;

/**
 * curator の入力候補: 直近72時間に公開された processed 記事(importance 降順)。
 * 過去の「今日の5本」に選ばれた記事は除外する(同じ記事が枠を占領し続けるのを防ぐ)。
 * 当日分(pick_date = todayJst)は除外しない — 同日のバッチ再実行で picks を
 * 洗い替えできるようにするため。
 */
export async function listCurationCandidates(limit: number, todayJst: string) {
  const db = getDb();
  return db
    .select({
      id: articles.id,
      titleJa: articles.titleJa,
      summaryJa: articles.summaryJa,
      importance: articles.importance,
      publishedAt: articles.publishedAt,
      sourceName: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      sql`${articles.status} = 'processed'
        and ${articles.publishedAt} > now() - interval '${sql.raw(String(CANDIDATE_WINDOW_HOURS))} hours'
        and not exists (
          select 1 from ${dailyPicks} dp
          where dp.article_id = ${articles.id} and dp.pick_date < ${todayJst}
        )`,
    )
    .orderBy(desc(articles.importance), desc(articles.publishedAt))
    .limit(limit);
}
