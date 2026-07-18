import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-stone-200 bg-white dark:border-owl-border dark:bg-owl-bg">
      <div className="mx-auto max-w-3xl px-4 py-6 text-xs text-stone-500 dark:text-owl-muted">
        <p>記事の要約はAIによって生成されています。正確な内容は必ず元記事をご確認ください。</p>
        <p className="mt-2">
          <Link href="/about" className="underline hover:text-stone-700 dark:hover:text-owl-text">
            About / 免責・出典方針・削除依頼
          </Link>
        </p>
        <p className="mt-2 text-stone-400 dark:text-owl-muted/70">
          © {new Date().getFullYear()} Tech News Digest（運営: m0riz0）
        </p>
      </div>
    </footer>
  );
}
