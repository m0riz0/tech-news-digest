import { formatJstDateTime, formatRelative, toJstDateString } from "@/lib/datetime";
import { describe, expect, it } from "vitest";

describe("toJstDateString", () => {
  it("UTC日時をJST日付に変換する", () => {
    // UTC 2026-07-17 22:30 = JST 2026-07-18 07:30
    expect(toJstDateString(new Date("2026-07-17T22:30:00Z"))).toBe("2026-07-18");
  });

  it("JST日中はそのままの日付になる", () => {
    // UTC 2026-07-18 03:00 = JST 2026-07-18 12:00
    expect(toJstDateString(new Date("2026-07-18T03:00:00Z"))).toBe("2026-07-18");
  });

  it("JST深夜0時前後の境界を正しく扱う", () => {
    // UTC 2026-07-18 14:59 = JST 2026-07-18 23:59
    expect(toJstDateString(new Date("2026-07-18T14:59:00Z"))).toBe("2026-07-18");
    // UTC 2026-07-18 15:00 = JST 2026-07-19 00:00
    expect(toJstDateString(new Date("2026-07-18T15:00:00Z"))).toBe("2026-07-19");
  });
});

describe("formatJstDateTime", () => {
  it("M/D HH:mm 形式(JST)で表示する", () => {
    expect(formatJstDateTime(new Date("2026-07-17T22:30:00Z"))).toBe("7/18 07:30");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-07-18T12:00:00Z");

  it("1分未満は「たった今」", () => {
    expect(formatRelative(new Date("2026-07-18T11:59:30Z"), now)).toBe("たった今");
  });

  it("60分未満は分表示", () => {
    expect(formatRelative(new Date("2026-07-18T11:15:00Z"), now)).toBe("45分前");
  });

  it("24時間未満は時間表示", () => {
    expect(formatRelative(new Date("2026-07-18T02:00:00Z"), now)).toBe("10時間前");
  });

  it("24時間以上は日時表示にフォールバック", () => {
    expect(formatRelative(new Date("2026-07-16T02:00:00Z"), now)).toBe("7/16 11:00");
  });
});
