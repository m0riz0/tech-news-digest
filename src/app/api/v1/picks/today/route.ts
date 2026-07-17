import { getLatestPicks } from "@/db/queries/picks";
import { toArticleJson } from "@/lib/article-json";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { toJstDateString } from "@/lib/datetime";

/**
 * GET /api/v1/picks/today — 今日の5本(docs/06 §3.2)。
 * 当日分が未生成なら直近の存在する日付の分を返す。
 */
export async function GET() {
  try {
    const result = await getLatestPicks(toJstDateString());
    if (!result) {
      return jsonError("not_found", "no picks available yet");
    }
    return jsonOk({
      pick_date: result.pickDate,
      picks: result.picks.map((p) => ({
        rank: p.rank,
        reason: p.reason,
        article: toArticleJson(p.article),
      })),
    });
  } catch (err) {
    console.error("GET /api/v1/picks/today failed:", err);
    return jsonError("internal", "internal server error");
  }
}
