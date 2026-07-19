# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

TechBeacon — 海外IT・AIメディアのRSSを収集し、AIが日本語タイトル・要約・タグ・重要度を付与するニュースリーダー。本番: https://techbeacon.vercel.app (Vercel + Neon Postgres)。

ドキュメント・コード内コメント・コミットメッセージはすべて日本語。コミットは Conventional Commits 形式(例: `fix(digest): ...`)で日本語の説明を書く。設計判断の根拠は `docs/01`〜`10` にあり、コード内コメントが `docs/04 §3.3` のように参照している。実運用で判明した注意点は `docs/10_deployment-notes.md` に追記する運用。

## コマンド

Node 22(`.nvmrc`)+ pnpm。`nvm use` でNodeを切り替えてから作業する。

```sh
pnpm dev          # Next.js 開発サーバー
pnpm dev:db       # ローカルPostgres起動(embedded-postgres、127.0.0.1:54321、データは .dev/pgdata)
pnpm test         # Vitest 全テスト
pnpm vitest run tests/lib/datetime.test.ts   # 単一テスト
pnpm lint         # Biome チェック(pnpm lint:fix で自動修正)
pnpm typecheck    # tsc --noEmit
pnpm batch                       # バッチ実行: fetch → digest
pnpm batch fetch digest curate   # 今日の5本の選定まで
pnpm db:generate / db:migrate    # Drizzle マイグレーション生成 / 適用
pnpm seed         # 初期データ(メディア・タグマスタ)投入
```

## アーキテクチャ

**設計の核: リクエスト時にAIを呼ばない。** AI処理はすべて事前バッチ(GitHub Actions)で完了させ、Webは「DBを読むだけのサイト」。この分離が全体構造を決めている:

- `src/batch/` — バッチ層。`fetcher`(RSS/Atom収集)→ `digester`(翻訳・要約・タグ・重要度)→ `curator`(今日の5本選定)のパイプライン。エントリは `scripts/run-batch.ts` → `src/batch/index.ts`(ジョブディスパッチャ。失敗しても後続ジョブは実行し、全ジョブを `batch_runs` テーブルに記録)
- `src/app/` — Next.js 15 App Router。トップページはISR(`revalidate = 300`)でDB直読み。`src/app/api/v1/` に公開API(articles / picks / sources / tags)
- `src/db/` — Drizzle スキーマとクエリ。**Webとバッチで共用**
- `src/lib/` — 共通ユーティリティ。環境変数は `config.ts` の zod スキーマで検証(必須チェックは使用箇所で行う遅延方式)

### LLMアダプタ(src/batch/shared/llm/)

digester / curator は `LLMClient` インターフェースのみに依存。`AI_PROVIDER` 環境変数で切替:

- `claude-code`(既定): `claude -p --output-format json` を子プロセス実行。Proサブスク枠でAI費用$0。ローカルはOAuthログイン済み環境、CIは `CLAUDE_CODE_OAUTH_TOKEN` で認証
- `api`: Anthropic API 直叩き(`DIGEST_MODEL` / `CURATE_MODEL` でモデル指定)

### バッチの信頼性メカニズム

変更時に壊しやすいので把握しておくこと:

- **AI出力の構造化**: プロンプトでJSON出力を指示し、`digester/schema.ts` / `curator/schema.ts` の zod スキーマで検証。検証失敗チャンクは1回リトライ、欠落記事は該当分のみ失敗扱い
- **タグはDBマスタ(`tags`テーブル)からの選択のみ**。AIに新規タグを作らせない。タグ0件の記事は `skipped` ステータスで非表示
- **記事ステータス遷移**: `pending → processing → processed / skipped / failed`。30分以上 `processing` のままの記事は次回実行時に `pending` へ戻す
- **冪等性**: 記事は `guid` のUNIQUE制約で重複排除。約10記事を1プロンプトに集約・1バッチ上限100件(レート枠ガード)
- **障害分離**: フィード取得失敗は該当メディアのみスキップ。DB未接続でもWebページは空状態で表示(`page.tsx` のtry/catch)

### 法的配慮(docs/09)

要約は2〜4文で元記事の代替にしない。取得した本文(`articles.content_text`)はAI入力専用で**画面に表示しない**。

## 環境の注意点

- **`.env.local` が存在すると本番Neon DBに接続する**。Next.jsは `.env.local` を `.env` より優先するため、`vercel env pull` 実行後は `pnpm dev` が本番DBを向く。ローカルDBで作業する場合は `.env.local` をリネーム/削除すること
- **`batch.yml` のcronは `gh workflow disable` で停止中**(Proプラン枠節約)。ファイルを見るとスケジュールが有効に見えるが、実状態は `gh workflow list --all --repo m0riz0/tech-news-digest` で確認する
- **VercelのPreview環境も本番Neon DBを共有している**(読み取りのみなので現状実害なし)
- ビルドスクリプトを持つネイティブ依存を追加したら、`pnpm-workspace.yaml` の承認設定がCI(Linux)でも通るか確認する(過去に `@embedded-postgres/linux-x64` 未承認でCIが全件失敗した)

## コードスタイル

Biome(`biome.json`): ダブルクォート・セミコロンあり・インデント2スペース・行幅100。パスエイリアス `@/` → `src/`。
