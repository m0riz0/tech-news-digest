import { ArticleList } from "@/components/ArticleList";
import { PicksSection } from "@/components/PicksSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { PickJson } from "@/components/PickCard";
import { listArticles } from "@/db/queries/articles";
import { getLatestPicks } from "@/db/queries/picks";
import { type ArticleJson, toArticleJson } from "@/lib/article-json";
import { encodeCursor } from "@/lib/api-helpers";
import { formatJstDateTime, toJstDateString } from "@/lib/datetime";

/** ISR: バッチ更新頻度(1日3回)に対して5分間隔で十分(docs/04 §4) */
export const revalidate = 300;

const PAGE_SIZE = 20;

type PageData = {
  picks: { pickDate: string; picks: PickJson[] } | null;
  articles: ArticleJson[];
  nextCursor: string | null;
  lastUpdated: string | null;
};

async function loadPageData(): Promise<PageData> {
  try {
    const [picksResult, articlesResult] = await Promise.all([
      getLatestPicks(toJstDateString()),
      listArticles({ limit: PAGE_SIZE }),
    ]);

    const articles = articlesResult.articles;
    const last = articles.at(-1);
    return {
      picks: picksResult && {
        pickDate: picksResult.pickDate,
        picks: picksResult.picks.map((p) => ({
          rank: p.rank,
          reason: p.reason,
          article: toArticleJson(p.article),
        })),
      },
      articles: articles.map(toArticleJson),
      nextCursor:
        articlesResult.hasMore && last ? encodeCursor(last.publishedAt, last.id) : null,
      lastUpdated: articles[0] ? formatJstDateTime(new Date()) : null,
    };
  } catch (err) {
    // DB未接続時(初期セットアップ・ビルド時)もページ自体は表示する
    console.error("failed to load page data:", err);
    return { picks: null, articles: [], nextCursor: null, lastUpdated: null };
  }
}

export default async function HomePage() {
  const data = await loadPageData();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader lastUpdated={data.lastUpdated ?? undefined} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-6">
        {data.picks && <PicksSection pickDate={data.picks.pickDate} picks={data.picks.picks} />}
        <ArticleList initialArticles={data.articles} initialCursor={data.nextCursor} />
      </main>
      <SiteFooter />
    </div>
  );
}
