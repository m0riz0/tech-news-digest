"use client";

import { useState } from "react";
import type { ArticleJson } from "@/lib/article-json";
import { ArticleCard } from "./ArticleCard";

type Props = {
  initialArticles: ArticleJson[];
  initialCursor: string | null;
};

/** 最新記事一覧+「もっと見る」(F-21, F-23)。追加読み込みは公開APIを使う */
export function ArticleList({ initialArticles, initialCursor }: Props) {
  const [articles, setArticles] = useState(initialArticles);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/articles?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        articles: ArticleJson[];
        next_cursor: string | null;
        has_more: boolean;
      };
      setArticles((prev) => [...prev, ...data.articles]);
      setCursor(data.has_more ? data.next_cursor : null);
    } catch {
      setError("読み込みに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold">最新記事</h2>
      <div className="mt-3 space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
        {articles.length === 0 && (
          <p className="text-sm text-stone-500">記事がまだありません。</p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {cursor && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </section>
  );
}
