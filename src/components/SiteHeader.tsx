import Link from "next/link";

export function SiteHeader({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <header className="border-b border-stone-200 bg-white dark:border-owl-border dark:bg-owl-bg">
      <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-4">
        <div>
          <Link href="/" className="text-xl font-bold tracking-tight">
            TechBeacon
          </Link>
          <p className="mt-1 text-xs text-stone-500 dark:text-owl-muted">
            AIが厳選する、海外Tech・AIニュース。
          </p>
        </div>
        <div className="text-xs text-stone-500 dark:text-owl-muted">
          {lastUpdated && <span>最終更新 {lastUpdated}</span>}
        </div>
      </div>
    </header>
  );
}
