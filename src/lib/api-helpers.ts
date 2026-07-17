import { NextResponse } from "next/server";

/** 公開APIの共通キャッシュヘッダ(docs/06 §2) */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export function jsonOk(body: unknown): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

type ErrorCode = "bad_request" | "not_found" | "internal";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  internal: 500,
};

export function jsonError(code: ErrorCode, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] });
}

/** カーソルページネーション用: published_at + id を base64url にエンコード */
export function encodeCursor(publishedAt: Date, id: number): string {
  return Buffer.from(JSON.stringify({ p: publishedAt.toISOString(), i: id })).toString("base64url");
}

export function decodeCursor(cursor: string): { publishedAt: Date; id: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed.p !== "string" || typeof parsed.i !== "number") return null;
    const publishedAt = new Date(parsed.p);
    if (Number.isNaN(publishedAt.getTime())) return null;
    return { publishedAt, id: parsed.i };
  } catch {
    return null;
  }
}
