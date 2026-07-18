import type { ArticleJson } from "@/lib/article-json";
import { formatJstDateTime } from "@/lib/datetime";
import { SourceLabel } from "./SourceLabel";

export type PickJson = {
  rank: number;
  reason: string;
  article: ArticleJson;
};

/** 今日の5本用カード(選定理由つき。docs/03 §3) */
export function PickCard({ pick }: { pick: PickJson }) {
  const { article } = pick;
  return (
    <article className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900 dark:bg-stone-900">
      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
          {pick.rank}
        </span>
        <SourceLabel source={article.source} />
        <span>·</span>
        <time dateTime={article.published_at}>
          {formatJstDateTime(new Date(article.published_at))}
        </time>
      </div>

      <h3 className="mt-2 text-lg font-bold leading-snug">
        {article.title_ja ?? article.title_original}
      </h3>

      {article.summary_ja && (
        <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          {article.summary_ja}
        </p>
      )}

      <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
        <span className="font-medium">選定理由:</span> {pick.reason}
      </p>

      <div className="mt-3 text-right">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          元記事を読む ↗
        </a>
      </div>
    </article>
  );
}
