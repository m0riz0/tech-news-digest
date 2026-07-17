import type { NextRequest } from "next/server";
import { listArticles } from "@/db/queries/articles";
import { toArticleJson } from "@/lib/article-json";
import { decodeCursor, encodeCursor, jsonError, jsonOk } from "@/lib/api-helpers";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** GET /api/v1/articles — 記事一覧(docs/06 §3.1) */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  let limit = DEFAULT_LIMIT;
  const rawLimit = params.get("limit");
  if (rawLimit !== null) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return jsonError("bad_request", `limit must be an integer between 1 and ${MAX_LIMIT}`);
    }
  }

  let cursor: { publishedAt: Date; id: number } | undefined;
  const rawCursor = params.get("cursor");
  if (rawCursor !== null) {
    const decoded = decodeCursor(rawCursor);
    if (!decoded) {
      return jsonError("bad_request", "invalid cursor");
    }
    cursor = decoded;
  }

  try {
    const result = await listArticles({
      limit,
      cursor,
      tagSlug: params.get("tag") ?? undefined,
      sourceSlug: params.get("source") ?? undefined,
    });

    const last = result.articles.at(-1);
    return jsonOk({
      articles: result.articles.map(toArticleJson),
      next_cursor: result.hasMore && last ? encodeCursor(last.publishedAt, last.id) : null,
      has_more: result.hasMore,
    });
  } catch (err) {
    console.error("GET /api/v1/articles failed:", err);
    return jsonError("internal", "internal server error");
  }
}
