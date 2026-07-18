"use client";

import type { ArticleJson } from "@/lib/article-json";
import { useState } from "react";
import { ArticleCard } from "./ArticleCard";

type TagOption = { slug: string; name: string };

type Props = {
  initialArticles: ArticleJson[];
  initialCursor: string | null;
  tags: TagOption[];
};

type ArticlesResponse = {
  articles: ArticleJson[];
  next_cursor: string | null;
  has_more: boolean;
};

/** 最新記事一覧+タグ絞り込み+「もっと見る」(F-21, F-23, F-26) */
export function ArticleList({ initialArticles, initialCursor, tags }: Props) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [articles, setArticles] = useState(initialArticles);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchArticles(
    tag: string | null,
    cursorParam?: string,
  ): Promise<ArticlesResponse> {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (cursorParam) params.set("cursor", cursorParam);
    const res = await fetch(`/api/v1/articles?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function selectTag(tag: string | null) {
    if (tag === selectedTag || loading) return;
    setSelectedTag(tag);
    setError(null);

    if (tag === null) {
      // タグなしの初期一覧に戻すだけなので再フェッチ不要
      setArticles(initialArticles);
      setCursor(initialCursor);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchArticles(tag);
      setArticles(data.articles);
      setCursor(data.has_more ? data.next_cursor : null);
    } catch {
      setError("読み込みに失敗しました。時間をおいて再度お試しください。");
      setArticles([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchArticles(selectedTag, cursor);
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

      {tags.length > 0 && (
        <fieldset className="mt-3 flex flex-wrap gap-1.5 border-0 p-0">
          <legend className="sr-only">タグで絞り込み</legend>
          <TagChip label="すべて" active={selectedTag === null} onClick={() => selectTag(null)} />
          {tags.map((tag) => (
            <TagChip
              key={tag.slug}
              label={`#${tag.name}`}
              active={selectedTag === tag.slug}
              onClick={() => selectTag(tag.slug)}
            />
          ))}
        </fieldset>
      )}

      <div className="mt-3 space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
        {articles.length === 0 && !loading && (
          <p className="text-sm text-stone-500 dark:text-owl-muted">
            {selectedTag ? "該当する記事がありません。" : "記事がまだありません。"}
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-owl-red">{error}</p>}
      {cursor && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-6 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-owl-border dark:bg-owl-surface dark:text-owl-text/85 dark:hover:bg-owl-border/60"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </section>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-stone-800 text-white dark:bg-owl-blue dark:text-owl-bg"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-owl-surface dark:text-owl-muted dark:hover:bg-owl-border dark:hover:text-owl-text"
      }`}
    >
      {label}
    </button>
  );
}
