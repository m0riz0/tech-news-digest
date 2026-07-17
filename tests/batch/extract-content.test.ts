import { parseRobotsDisallows, stripHtml } from "@/batch/fetcher/extract-content";
import { describe, expect, it } from "vitest";

describe("parseRobotsDisallows", () => {
  it("User-agent: * の Disallow を抽出する", () => {
    const robots = `
User-agent: *
Disallow: /private/
Disallow: /admin/

User-agent: SomeBot
Disallow: /
`;
    expect(parseRobotsDisallows(robots)).toEqual(["/private/", "/admin/"]);
  });

  it("他Botのグループは無視する", () => {
    const robots = `
User-agent: BadBot
Disallow: /
`;
    expect(parseRobotsDisallows(robots)).toEqual([]);
  });

  it("空のDisallow(全許可)は無視する", () => {
    const robots = `
User-agent: *
Disallow:
`;
    expect(parseRobotsDisallows(robots)).toEqual([]);
  });

  it("コメントを除去する", () => {
    const robots = `
User-agent: * # all bots
Disallow: /secret/ # hidden
`;
    expect(parseRobotsDisallows(robots)).toEqual(["/secret/"]);
  });
});

describe("stripHtml", () => {
  it("タグを除去してテキストを返す", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("HTMLエンティティをデコードする", () => {
    expect(stripHtml("A &amp; B &lt;tag&gt; &quot;quoted&quot;")).toBe('A & B <tag> "quoted"');
  });

  it("連続する空白を1つにまとめる", () => {
    expect(stripHtml("<div>a</div>\n\n<div>b</div>")).toBe("a b");
  });
});
