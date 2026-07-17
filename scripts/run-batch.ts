try {
  process.loadEnvFile();
} catch {
  // .env が無い環境(CI)では環境変数をそのまま使う
}

import { JOB_NAMES, type JobName, runJobs } from "@/batch/index";

/**
 * CLI実行用エントリ(GitHub Actions / ローカル開発)。
 *
 * 使い方:
 *   pnpm batch                  # fetch → digest(1日3回の通常実行)
 *   pnpm batch fetch digest curate  # 朝の回(今日の5本も選定)
 */
async function main() {
  const args = process.argv.slice(2);
  const jobs: JobName[] =
    args.length > 0
      ? args.map((a) => {
          if (!(JOB_NAMES as readonly string[]).includes(a)) {
            throw new Error(`unknown job: ${a} (valid: ${JOB_NAMES.join(", ")})`);
          }
          return a as JobName;
        })
      : ["fetch", "digest"];

  const ok = await runJobs(jobs);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
