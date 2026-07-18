import { PickCard, type PickJson } from "./PickCard";

export function PicksSection({ pickDate, picks }: { pickDate: string; picks: PickJson[] }) {
  if (picks.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-bold">
        🔥 今日読むべき{picks.length}本{" "}
        <span className="text-sm font-normal text-stone-500 dark:text-stone-400">({pickDate})</span>
      </h2>
      <div className="mt-3 space-y-3">
        {picks.map((pick) => (
          <PickCard key={pick.article.id} pick={pick} />
        ))}
      </div>
    </section>
  );
}
