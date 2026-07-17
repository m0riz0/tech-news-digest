import { curateOutputSchema } from "@/batch/curator/schema";
import { describe, expect, it } from "vitest";

describe("curateOutputSchema", () => {
  it("正しい出力を受け入れる", () => {
    const output = {
      picks: [
        { article_id: 1, rank: 1, reason: "業界への影響が大きいため" },
        { article_id: 2, rank: 2, reason: "エンジニアの開発フローに直結するため" },
      ],
    };
    expect(curateOutputSchema.parse(output).picks).toHaveLength(2);
  });

  it("6本以上を弾く", () => {
    const picks = Array.from({ length: 6 }, (_, i) => ({
      article_id: i + 1,
      rank: i + 1,
      reason: "reason",
    }));
    expect(() => curateOutputSchema.parse({ picks })).toThrow();
  });

  it("rank の範囲外を弾く", () => {
    expect(() =>
      curateOutputSchema.parse({ picks: [{ article_id: 1, rank: 6, reason: "r" }] }),
    ).toThrow();
  });

  it("picks 欠落を弾く", () => {
    expect(() => curateOutputSchema.parse({})).toThrow();
  });
});
