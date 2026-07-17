import { curateDailyPicks } from "./curator/curate";
import { digestPendingArticles } from "./digester/digest";
import { fetchFeeds } from "./fetcher/fetch-feeds";
import { finishRun, startRun } from "./shared/run-logger";

export const JOB_NAMES = ["fetch", "digest", "curate"] as const;
export type JobName = (typeof JOB_NAMES)[number];

/**
 * ジョブディスパッチャ(docs/04 §3.1)。
 * 各ジョブを batch_runs に記録しつつ順次実行する。
 * どこかのジョブが失敗しても後続ジョブは実行する(パイプラインの独立性)。
 */
export async function runJobs(jobs: JobName[]): Promise<boolean> {
  let allOk = true;
  for (const job of jobs) {
    const ok = await runJob(job);
    allOk = allOk && ok;
  }
  return allOk;
}

async function runJob(job: JobName): Promise<boolean> {
  console.log(`[batch] ${job}: start`);
  const runId = await startRun(job);
  try {
    switch (job) {
      case "fetch": {
        const s = await fetchFeeds();
        const status =
          s.sourcesFailed === 0
            ? "success"
            : s.sourcesFailed < s.sourcesTotal
              ? "partial"
              : "failed";
        await finishRun(runId, {
          status,
          itemsTotal: s.sourcesTotal,
          itemsSucceeded: s.sourcesTotal - s.sourcesFailed,
          itemsFailed: s.sourcesFailed,
          detail: { newArticles: s.newArticles, errors: s.errors },
        });
        console.log(
          `[batch] fetch: ${status} (new=${s.newArticles}, failedSources=${s.sourcesFailed})`,
        );
        return status !== "failed";
      }
      case "digest": {
        const s = await digestPendingArticles();
        const status =
          s.itemsFailed === 0 ? "success" : s.itemsSucceeded > 0 ? "partial" : "failed";
        await finishRun(runId, {
          status: s.itemsTotal === 0 ? "success" : status,
          itemsTotal: s.itemsTotal,
          itemsSucceeded: s.itemsSucceeded,
          itemsFailed: s.itemsFailed,
          inputTokens: s.inputTokens,
          outputTokens: s.outputTokens,
          detail: { errors: s.errors },
        });
        console.log(
          `[batch] digest: ${status} (ok=${s.itemsSucceeded}/${s.itemsTotal}, tokens=${s.inputTokens}/${s.outputTokens})`,
        );
        return s.itemsTotal === 0 || s.itemsSucceeded > 0;
      }
      case "curate": {
        const s = await curateDailyPicks();
        await finishRun(runId, {
          status: "success",
          itemsTotal: s.itemsTotal,
          itemsSucceeded: s.itemsSucceeded,
          itemsFailed: 0,
          inputTokens: s.inputTokens,
          outputTokens: s.outputTokens,
          detail: { pickDate: s.pickDate, skipped: s.skipped },
        });
        console.log(
          `[batch] curate: success (picks=${s.itemsSucceeded}, date=${s.pickDate}${s.skipped ? `, skipped: ${s.skipped}` : ""})`,
        );
        return true;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(runId, { status: "failed", detail: { error: message } }).catch(() => {});
    console.error(`[batch] ${job}: failed - ${message}`);
    return false;
  }
}
