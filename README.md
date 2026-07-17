# tech-news-digest

海外のIT・AIメディアを横断し、AIが「編集者」として日本語タイトル・要約・重要度を整理するニュースリーダー。

設計ドキュメントは [`docs/`](./docs/00_README.md)、プロジェクトの思想は [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) を参照。

## 構成

- **Web**: Next.js (App Router) + Tailwind CSS。トップ画面は ISR で「今日の5本」+ 最新記事一覧を表示
- **DB**: PostgreSQL (Neon想定) + Drizzle ORM
- **バッチ**: GitHub Actions で1日3回実行(`fetch` → `digest`、朝の回のみ `curate`)
- **AI実行**: Claude Code ヘッドレスモード(Pro サブスク枠・追加費用$0)。`AI_PROVIDER=api` で Anthropic API に切替可能

## セットアップ

```sh
# Node 22 / pnpm
nvm use
corepack enable pnpm  # または npm i -g pnpm

pnpm install

# 環境変数
cp .env.example .env  # DATABASE_URL を設定

# DBマイグレーション + 初期データ(メディア・タグ)投入
pnpm db:migrate
pnpm seed
```

## 開発

```sh
pnpm dev          # Next.js 開発サーバー
pnpm test         # ユニットテスト (Vitest)
pnpm lint         # Biome
pnpm typecheck    # tsc --noEmit
```

## バッチの手動実行

```sh
pnpm batch                      # fetch → digest
pnpm batch fetch digest curate  # 今日の5本の選定まで実行
```

ローカルでは Claude Code のOAuthログイン済み環境で `claude -p` が実行される。
CI(GitHub Actions)では以下の Secrets が必要:

| Secret | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL接続文字列 |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude setup-token` で発行するサブスク認証トークン |

## ディレクトリ

```
src/app/        # Next.js ページ + APIルート
src/components/ # UIコンポーネント
src/db/         # Drizzle スキーマ・クエリ(Web/バッチ共用)
src/batch/      # fetcher / digester / curator / LLMアダプタ
scripts/        # run-batch.ts / seed.ts
drizzle/        # マイグレーションSQL
tests/          # Vitest ユニットテスト
```
