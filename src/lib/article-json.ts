import type { ArticleListItem } from "@/db/queries/articles";

/**
 * 記事のJSON表現(docs/06 §3.1)。
 * APIレスポンスとサーバー→クライアントコンポーネントのprops共用。
 * 日時はISO 8601(UTC)で持ち、表示側でJST変換する。
 */
export type ArticleJson = {
  id: number;
  source: { slug: string; name: string };
  title_ja: string | null;
  title_original: string;
  summary_ja: string | null;
  url: string;
  tags: string[];
  published_at: string;
};

export function toArticleJson(a: ArticleListItem): ArticleJson {
  return {
    id: a.id,
    source: a.source,
    title_ja: a.titleJa,
    title_original: a.titleOriginal,
    summary_ja: a.summaryJa,
    url: a.url,
    tags: a.tags,
    published_at: a.publishedAt.toISOString(),
  };
}
