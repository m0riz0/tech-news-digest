import type { ArticleJson } from "@/lib/article-json";
import { formatJstDateTime } from "@/lib/datetime";
import { SourceLabel } from "./SourceLabel";

/** 記事カード(F-22)。一覧・picks 共用の基本レイアウト */
export function ArticleCard({ article }: { article: ArticleJson }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-owl-border dark:bg-owl-surface">
      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-owl-muted">
        <SourceLabel source={article.source} />
        <span>·</span>
        <time dateTime={article.published_at}>
          {formatJstDateTime(new Date(article.published_at))}
        </time>
      </div>

      <h3 className="mt-1.5 text-base font-semibold leading-snug">
        {article.title_ja ?? article.title_original}
      </h3>
      {article.title_ja && (
        <p className="mt-0.5 text-xs text-stone-400 dark:text-owl-faint">
          {article.title_original}
        </p>
      )}

      {article.summary_ja && (
        <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-owl-text/85">
          {article.summary_ja}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-owl-border/50 dark:text-owl-cyan"
            >
              #{tag}
            </span>
          ))}
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-owl-blue"
        >
          元記事を読む ↗
        </a>
      </div>
    </article>
  );
}
