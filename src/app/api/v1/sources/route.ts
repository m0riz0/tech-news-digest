import { listActiveSources } from "@/db/queries/sources";
import { jsonError, jsonOk } from "@/lib/api-helpers";

/** GET /api/v1/sources — メディア一覧(docs/06 §3.4) */
export async function GET() {
  try {
    const rows = await listActiveSources();
    return jsonOk({
      sources: rows.map((s) => ({
        slug: s.slug,
        name: s.name,
        site_url: s.siteUrl,
        category: s.category,
      })),
    });
  } catch (err) {
    console.error("GET /api/v1/sources failed:", err);
    return jsonError("internal", "internal server error");
  }
}
