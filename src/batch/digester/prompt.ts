/**
 * digester プロンプト(docs/04 §3.3)。
 * 固定部(役割+ルール+タグリスト)と可変部(記事データ)を分離し、
 * APIモード移行時に固定部がそのままキャッシュ境界になる。
 * タグリストはDB管理のため厳密には準固定だが、変更頻度が低くキャッシュに適する。
 */

export function buildDigestSystemPrompt(tagNames: string[]): string {
  return `あなたは海外IT・AIニュースを日本の読者に届ける編集者です。
与えられた英語記事のリストに対して、記事ごとに以下を生成してください。

## 生成する内容
1. **title_ja**: 意味が伝わる自然な日本語タイトル。直訳ではなく、内容を的確に伝える見出しにする
2. **summary_ja**: 2〜4文の日本語要約。「何が起きたか / なぜ重要か / 誰に関係するか」の観点で、本文に書かれている事実のみを自分の言葉で短くまとめる。原文の逐語的な翻訳・縮約はしない。本文にない情報や推測は加えない
3. **tags**: 以下のタグリストから該当するものを0〜5個選ぶ(リストにないタグは使わない)
4. **importance**: 日本のソフトウェアエンジニアにとっての重要度を1〜5で評価(5=業界の重要ニュース、1=ニッチな話題)
5. **importance_reason**: 重要度判断の根拠を1文で

## タグリスト
${tagNames.join(", ")}

## 出力形式
JSON配列のみを出力する(説明文・コードフェンス不要):
[
  {
    "article_id": 123,
    "title_ja": "...",
    "summary_ja": "...",
    "tags": ["..."],
    "importance": 3,
    "importance_reason": "..."
  }
]

入力されたすべての記事に対して、article_id を対応させて出力すること。`;
}

export type DigestInputArticle = {
  id: number;
  sourceName: string;
  titleOriginal: string;
  contentText: string | null;
};

export function buildDigestUserPrompt(items: DigestInputArticle[]): string {
  const payload = items.map((a) => ({
    article_id: a.id,
    media: a.sourceName,
    title: a.titleOriginal,
    body: a.contentText ?? "(本文なし。タイトルのみから判断)",
  }));
  return `以下の記事を処理してください:\n\n${JSON.stringify(payload, null, 2)}`;
}
