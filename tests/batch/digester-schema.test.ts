import { digestOutputSchema, parseJsonOutput } from "@/batch/digester/schema";
import { describe, expect, it } from "vitest";

const validItem = {
  article_id: 1,
  title_ja: "OpenAI、新モデルを発表",
  summary_ja: "OpenAIが新モデルを発表した。推論性能が向上している。",
  tags: ["LLM", "OpenAI"],
  importance: 4,
  importance_reason: "主要ベンダーの新モデルリリースのため",
};

describe("digestOutputSchema", () => {
  it("正しい出力を受け入れる", () => {
    expect(digestOutputSchema.parse([validItem])).toHaveLength(1);
  });

  it("importance の範囲外(0, 6)を弾く", () => {
    expect(() => digestOutputSchema.parse([{ ...validItem, importance: 0 }])).toThrow();
    expect(() => digestOutputSchema.parse([{ ...validItem, importance: 6 }])).toThrow();
  });

  it("タグ6個以上を弾く", () => {
    const tags = ["a", "b", "c", "d", "e", "f"];
    expect(() => digestOutputSchema.parse([{ ...validItem, tags }])).toThrow();
  });

  it("空タイトルを弾く", () => {
    expect(() => digestOutputSchema.parse([{ ...validItem, title_ja: "" }])).toThrow();
  });

  it("必須フィールド欠落を弾く", () => {
    const { summary_ja: _omitted, ...rest } = validItem;
    expect(() => digestOutputSchema.parse([rest])).toThrow();
  });
});

describe("parseJsonOutput", () => {
  it("素のJSONをパースする", () => {
    expect(parseJsonOutput('[{"a": 1}]')).toEqual([{ a: 1 }]);
  });

  it("jsonコードフェンス付きの出力をパースする", () => {
    expect(parseJsonOutput('```json\n[{"a": 1}]\n```')).toEqual([{ a: 1 }]);
  });

  it("言語指定なしフェンスもパースする", () => {
    expect(parseJsonOutput('```\n{"picks": []}\n```')).toEqual({ picks: [] });
  });

  it("JSONでない出力は例外を投げる", () => {
    expect(() => parseJsonOutput("すみません、処理できませんでした")).toThrow();
  });
});
