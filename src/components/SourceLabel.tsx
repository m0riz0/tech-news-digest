import type { ArticleJson } from "@/lib/article-json";
import { faviconUrl } from "@/lib/favicon";

/** メディアのfavicon+名前(記事カード・Pickカード共用) */
export function SourceLabel({ source }: { source: ArticleJson["source"] }) {
  const icon = faviconUrl(source.site_url);
  return (
    <span className="flex items-center gap-1.5 font-medium text-stone-600 dark:text-stone-300">
      {icon && (
        // 装飾用アイコン(alt空)。Googleのfaviconサービスは未知ドメインでも
        // デフォルト画像を返すため onError 処理は不要
        <img src={icon} alt="" width={16} height={16} loading="lazy" className="rounded-sm" />
      )}
      {source.name}
    </span>
  );
}
