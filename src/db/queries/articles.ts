import { getDb } from "@/db/client";
import { articleTags, articles, sources, tags } from "@/db/schema";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";

/** 画面・APIで共用する記事の表示用形状(docs/06 §3.1) */
export type ArticleListItem = {
  id: number;
  source: { slug: string; name: string };
  titleJa: string | null;
  titleOriginal: string;
  summaryJa: string | null;
  url: string;
  tags: string[];
  publishedAt: Date;
};

export type ArticleListParams = {
  limit: number;
  cursor?: { publishedAt: Date; id: number };
  tagSlug?: string;
  sourceSlug?: string;
};

export type ArticleListResult = {
  articles: ArticleListItem[];
  hasMore: boolean;
};

/**
 * 記事一覧(published_at DESC、カーソルページネーション)。
 * 対象は processed のみ(docs/06 §3.1)。failed 記事の原文タイトル表示は
 * 将来判断とし、一覧はAI処理済みに限定する。
 */
export async function listArticles(params: ArticleListParams): Promise<ArticleListResult> {
  const db = getDb();
  const conditions = [eq(articles.status, "processed")];

  if (params.cursor) {
    conditions.push(
      or(
        lt(articles.publishedAt, params.cursor.publishedAt),
        and(eq(articles.publishedAt, params.cursor.publishedAt), lt(articles.id, params.cursor.id)),
      )!,
    );
  }
  if (params.sourceSlug) {
    conditions.push(eq(sources.slug, params.sourceSlug));
  }
  if (params.tagSlug) {
    conditions.push(
      sql`exists (select 1 from ${articleTags} at join ${tags} t on t.id = at.tag_id where at.article_id = ${articles.id} and t.slug = ${params.tagSlug})`,
    );
  }

  const rows = await db
    .select({
      id: articles.id,
      url: articles.url,
      titleJa: articles.titleJa,
      titleOriginal: articles.titleOriginal,
      summaryJa: articles.summaryJa,
      publishedAt: articles.publishedAt,
      sourceSlug: sources.slug,
      sourceName: sources.name,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(params.limit + 1);

  const hasMore = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const tagMap = await fetchTagsFor(page.map((r) => r.id));

  return {
    articles: page.map((r) => ({
      id: r.id,
      source: { slug: r.sourceSlug, name: r.sourceName },
      titleJa: r.titleJa,
      titleOriginal: r.titleOriginal,
      summaryJa: r.summaryJa,
      url: r.url,
      tags: tagMap.get(r.id) ?? [],
      publishedAt: r.publishedAt,
    })),
    hasMore,
  };
}

/** 記事IDごとのタグ名一覧をまとめて取得 */
export async function fetchTagsFor(articleIds: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (articleIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({ articleId: articleTags.articleId, name: tags.name })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(inArray(articleTags.articleId, articleIds));

  for (const row of rows) {
    const list = map.get(row.articleId) ?? [];
    list.push(row.name);
    map.set(row.articleId, list);
  }
  return map;
}
