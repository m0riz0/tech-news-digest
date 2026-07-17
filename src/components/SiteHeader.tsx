import Link from "next/link";

export function SiteHeader({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Tech News Digest
        </Link>
        <div className="text-xs text-stone-500">
          {lastUpdated && <span>最終更新 {lastUpdated}</span>}
        </div>
      </div>
    </header>
  );
}
