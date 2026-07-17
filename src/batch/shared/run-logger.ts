import { getDb } from "@/db/client";
import { batchRuns } from "@/db/schema";
import { eq } from "drizzle-orm";

type Job = "fetch" | "digest" | "curate";

export type RunResult = {
  status: "success" | "partial" | "failed";
  itemsTotal?: number;
  itemsSucceeded?: number;
  itemsFailed?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  detail?: unknown;
};

/** batch_runs への実行記録(docs/05 §2.6)。コスト仮説H4の検証に使う */
export async function startRun(job: Job): Promise<number> {
  const db = getDb();
  const [row] = await db
    .insert(batchRuns)
    .values({ job, startedAt: new Date(), status: "running" })
    .returning({ id: batchRuns.id });
  return row.id;
}

export async function finishRun(runId: number, result: RunResult): Promise<void> {
  const db = getDb();
  await db
    .update(batchRuns)
    .set({
      finishedAt: new Date(),
      status: result.status,
      itemsTotal: result.itemsTotal,
      itemsSucceeded: result.itemsSucceeded,
      itemsFailed: result.itemsFailed,
      inputTokens: result.inputTokens ?? undefined,
      outputTokens: result.outputTokens ?? undefined,
      detail: result.detail,
    })
    .where(eq(batchRuns.id, runId));
}
