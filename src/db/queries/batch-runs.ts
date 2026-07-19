import { getDb } from "@/db/client";
import { batchRuns } from "@/db/schema";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

/** 直近で完了したfetchバッチの完了日時を返す(ヘッダーの「最終更新」表示用) */
export async function getLatestFetchFinishedAt(): Promise<Date | null> {
  const db = getDb();
  const rows = await db
    .select({ finishedAt: batchRuns.finishedAt })
    .from(batchRuns)
    .where(
      and(
        eq(batchRuns.job, "fetch"),
        inArray(batchRuns.status, ["success", "partial"]),
        isNotNull(batchRuns.finishedAt),
      ),
    )
    .orderBy(desc(batchRuns.finishedAt))
    .limit(1);
  return rows[0]?.finishedAt ?? null;
}
