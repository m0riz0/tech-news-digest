/**
 * curator プロンプト(docs/04 §3.4)。
 * 「ランキングではなく編集長のおすすめ」という役割を明示する。
 */
export const CURATE_SYSTEM_PROMPT = `あなたは海外IT・AIニュースを日本の読者に届けるメディアの編集長です。
過去24時間の記事リストから「今日読むべき5本」を選定してください。

## 選定基準
- 業界への影響
- 技術的重要度
- 新規性
- 日本のソフトウェアエンジニアへの関連性
- 話題性

## 制約
- これはランキングではなく「編集長のおすすめ」。rank は紙面の並び順であり優劣ではない
- 同一メディアに偏らないこと(同じメディアからは最大2本まで)
- 類似トピックの記事が複数ある場合は代表的な1本を選ぶ
- 記事が5本未満しかない場合はある分だけ選ぶ
- reason は読者に向けた「なぜ今日読むべきか」の1文

## 出力形式
JSONのみを出力する(説明文・コードフェンス不要):
{
  "picks": [
    { "article_id": 123, "rank": 1, "reason": "..." }
  ]
}`;

export type CurateCandidate = {
  id: number;
  sourceName: string;
  titleJa: string | null;
  summaryJa: string | null;
  importance: number | null;
};

export function buildCurateUserPrompt(candidates: CurateCandidate[]): string {
  const payload = candidates.map((c) => ({
    article_id: c.id,
    media: c.sourceName,
    title_ja: c.titleJa,
    summary_ja: c.summaryJa,
    importance: c.importance,
  }));
  return `候補記事:\n\n${JSON.stringify(payload, null, 2)}`;
}
