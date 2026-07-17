import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6 text-xs text-stone-500">
        <p>
          記事の要約はAIによって生成されています。正確な内容は必ず元記事をご確認ください。
        </p>
        <p className="mt-2">
          <Link href="/about" className="underline hover:text-stone-700">
            About / 免責・出典方針・削除依頼
          </Link>
        </p>
      </div>
    </footer>
  );
}
