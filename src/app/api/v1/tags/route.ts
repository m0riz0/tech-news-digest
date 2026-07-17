import { listActiveTags } from "@/db/queries/sources";
import { jsonError, jsonOk } from "@/lib/api-helpers";

/** GET /api/v1/tags — タグ一覧(docs/06 §3.5) */
export async function GET() {
  try {
    const rows = await listActiveTags();
    return jsonOk({
      tags: rows.map((t) => ({ slug: t.slug, name: t.name })),
    });
  } catch (err) {
    console.error("GET /api/v1/tags failed:", err);
    return jsonError("internal", "internal server error");
  }
}
