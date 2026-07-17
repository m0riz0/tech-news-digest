import { decodeCursor, encodeCursor } from "@/lib/api-helpers";
import { describe, expect, it } from "vitest";

describe("cursor encode/decode", () => {
  it("ラウンドトリップできる", () => {
    const publishedAt = new Date("2026-07-18T03:00:00.000Z");
    const cursor = encodeCursor(publishedAt, 123);
    const decoded = decodeCursor(cursor);
    expect(decoded).not.toBeNull();
    expect(decoded?.publishedAt.toISOString()).toBe(publishedAt.toISOString());
    expect(decoded?.id).toBe(123);
  });

  it("不正なbase64はnullを返す", () => {
    expect(decodeCursor("not-a-cursor!!!")).toBeNull();
  });

  it("形の違うJSONはnullを返す", () => {
    const bogus = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(decodeCursor(bogus)).toBeNull();
  });

  it("不正な日付はnullを返す", () => {
    const bogus = Buffer.from(JSON.stringify({ p: "not-a-date", i: 1 })).toString("base64url");
    expect(decodeCursor(bogus)).toBeNull();
  });
});
