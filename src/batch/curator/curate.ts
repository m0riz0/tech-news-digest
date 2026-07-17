import { listCurationCandidates, replacePicks } from "@/db/queries/picks";
import { getEnv } from "@/lib/config";
import { toJstDateString } from "@/lib/datetime";
import { parseJsonOutput } from "../digester/schema";
import { getLLMClient } from "../shared/llm/client";
import { CURATE_SYSTEM_PROMPT, buildCurateUserPrompt } from "./prompt";
import { curateOutputSchema } from "./schema";

/** 候補は importance 上位で事前絞り込み(docs/04 §3.4) */
const MAX_CANDIDATES = 50;
const MAX_TOKENS = 2_000;

export type CurateSummary = {
  itemsTotal: number;
  itemsSucceeded: number;
  itemsFailed: number;
  inputTokens: number;
  outputTokens: number;
  pickDate: string;
  skipped?: string;
};

/**
 * 過去24時間の processed 記事から「今日の5本」を1プロンプトで選定する(F-13)。
 * 失敗時は daily_picks を更新しない → トップは前日分を表示し続ける(docs/04 §5)。
 */
export async function curateDailyPicks(): Promise<CurateSummary> {
  const pickDate = toJstDateString();
  const summary: CurateSummary = {
    itemsTotal: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    inputTokens: 0,
    outputTokens: 0,
    pickDate,
  };

  const candidates = await listCurationCandidates(MAX_CANDIDATES);
  summary.itemsTotal = candidates.length;
  if (candidates.length === 0) {
    summary.skipped = "no processed articles in the last 24 hours";
    return summary;
  }

  const llm = getLLMClient();
  const res = await llm.complete({
    system: CURATE_SYSTEM_PROMPT,
    prompt: buildCurateUserPrompt(candidates),
    maxTokens: MAX_TOKENS,
    model: getEnv().CURATE_MODEL,
  });
  summary.inputTokens = res.inputTokens ?? 0;
  summary.outputTokens = res.outputTokens ?? 0;

  const output = curateOutputSchema.parse(parseJsonOutput(res.text));

  // 候補外のIDや重複rank/記事を弾く(zod検証の後段チェック)
  const candidateIds = new Set(candidates.map((c) => c.id));
  const seenIds = new Set<number>();
  const seenRanks = new Set<number>();
  const picks = output.picks.filter((p) => {
    if (!candidateIds.has(p.article_id)) return false;
    if (seenIds.has(p.article_id) || seenRanks.has(p.rank)) return false;
    seenIds.add(p.article_id);
    seenRanks.add(p.rank);
    return true;
  });

  if (picks.length === 0) {
    throw new Error("curator returned no valid picks");
  }

  await replacePicks(
    pickDate,
    picks.map((p) => ({ articleId: p.article_id, rank: p.rank, reason: p.reason })),
  );
  summary.itemsSucceeded = picks.length;
  return summary;
}
