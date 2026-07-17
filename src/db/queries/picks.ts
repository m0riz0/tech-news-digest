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
        source: { slug: r.sourceSlug, name: r.sourceName },
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

/** 過去24時間の processed 記事(curator の入力用)。importance 降順 */
export async function listCurationCandidates(limit: number) {
  const db = getDb();
  return db
    .select({
      id: articles.id,
      titleJa: articles.titleJa,
      summaryJa: articles.summaryJa,
      importance: articles.importance,
      sourceName: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      sql`${articles.status} = 'processed' and ${articles.processedAt} > now() - interval '24 hours'`,
    )
    .orderBy(desc(articles.importance), desc(articles.publishedAt))
    .limit(limit);
}
