# API設計

## 1. 方針

- MVPのトップ画面は **Next.js サーバーコンポーネントがDBを直接読む**ため、画面表示にHTTP APIは必須ではない
- ただし以下の用途のために最小限の公開APIを定義する:
  1. クライアントサイドのページネーション(「もっと見る」)
  2. 将来機能(タグ検索・アーカイブ)への拡張余地
- 認証なし・読み取り専用・GETのみ。バッチトリガーだけ内部用エンドポイントとして分離

## 2. 共通仕様

- ベースパス: `/api/v1`
- レスポンス: JSON(UTF-8)。日時はISO 8601(UTC)で返し、表示側でJST変換
- キャッシュ: 公開APIはすべて `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`(CDNキャッシュ前提)
- エラー形式:

```json
{ "error": { "code": "not_found", "message": "..." } }
```

| HTTP | code | 用途 |
|---|---|---|
| 400 | bad_request | パラメータ不正 |
| 404 | not_found | リソースなし |
| 500 | internal | サーバエラー |

## 3. 公開エンドポイント

### 3.1 GET /api/v1/articles — 記事一覧

| クエリ | 型 | デフォルト | 説明 |
|---|---|---|---|
| cursor | string | なし | ページネーションカーソル(前回レスポンスの `next_cursor`) |
| limit | number | 20 (max 50) | 取得件数 |
| tag | string | なし | タグslugで絞り込み(将来機能。MVPでは実装のみ、UIなし) |
| source | string | なし | メディアslugで絞り込み(同上) |

- 対象: `status = 'processed'` の記事のみ(failed は原文タイトル表示方針だが、一覧APIでは `title_ja` が NULL の場合 `title_original` をフォールバック表示するのはクライアント責務とし、レスポンスには両方含める)
- 並び: `published_at DESC`。カーソルは `published_at + id` ベース(offsetは使わない)

レスポンス:

```json
{
  "articles": [
    {
      "id": 123,
      "source": { "slug": "techcrunch", "name": "TechCrunch" },
      "title_ja": "OpenAI、GPT-◯◯を発表 — 推論性能が大幅向上",
      "title_original": "OpenAI releases GPT-...",
      "summary_ja": "OpenAIは新モデル◯◯を発表した。...",
      "url": "https://techcrunch.com/...",
      "tags": ["LLM", "OpenAI"],
      "published_at": "2026-07-15T00:30:00Z"
    }
  ],
  "next_cursor": "eyJwIjoi...",
  "has_more": true
}
```

### 3.2 GET /api/v1/picks/today — 今日の5本

- 当日(JST)の `daily_picks` を rank 順に返す。当日分が未生成なら**直近の存在する日付**の分を返す(トップを空にしない)

```json
{
  "pick_date": "2026-07-15",
  "picks": [
    {
      "rank": 1,
      "reason": "エンジニアの開発フローに直接影響する大型アップデートのため",
      "article": { /* 3.1と同じ記事オブジェクト */ }
    }
  ]
}
```

### 3.3 GET /api/v1/picks/{date} — 日別アーカイブ(将来 / v1.1)

- `date` は `YYYY-MM-DD`。データがなければ 404。MVPではルーティングだけ予約し未実装でよい

### 3.4 GET /api/v1/sources — メディア一覧

```json
{ "sources": [ { "slug": "openai-blog", "name": "OpenAI", "site_url": "https://openai.com/blog", "category": "official" } ] }
```

### 3.5 GET /api/v1/tags — タグ一覧

```json
{ "tags": [ { "slug": "llm", "name": "LLM" } ] }
```

## 4. 内部エンドポイント(バッチトリガー)— オプション

**既定構成(GitHub Actions がスクリプトを直接実行)では不要**([07 §2.6参照](./07_tech-stack.md))。将来 Vercel Cron 等のHTTP呼び出し型に切り替える場合のみ、以下の仕様で実装する。

### POST /api/internal/cron/run

| 項目 | 内容 |
|---|---|
| 認証 | `Authorization: Bearer ${CRON_SECRET}` ヘッダ必須。不一致は401 |
| ボディ | `{ "jobs": ["fetch", "digest"] }` または `{ "jobs": ["fetch", "digest", "curate"] }` |
| 動作 | 指定ジョブを順次実行し、`batch_runs` に記録。結果サマリを返す |
| タイムアウト対策 | 実行時間が長い場合はジョブを記事チャンク単位に分割し複数回呼び出せる設計とする |

レスポンス:

```json
{
  "runs": [
    { "job": "fetch", "status": "success", "items_total": 12, "items_succeeded": 12 },
    { "job": "digest", "status": "partial", "items_total": 12, "items_succeeded": 11, "items_failed": 1 }
  ]
}
```

## 5. ページ(HTMLルート)

| パス | 内容 | レンダリング |
|---|---|---|
| `/` | トップ(今日の5本+最新記事一覧) | ISR(revalidate 300秒) |
| `/about` | サービス説明・免責・出典方針・削除依頼窓口 | 静的 |
| `/archive/[date]` | 日別アーカイブ(v1.1で実装) | — |
| `/tags/[slug]` | タグ別一覧(v1.1で実装) | — |
