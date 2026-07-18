# Tech News Digest

[![CI](https://github.com/m0riz0/tech-news-digest/actions/workflows/ci.yml/badge.svg)](https://github.com/m0riz0/tech-news-digest/actions/workflows/ci.yml)

海外のIT・AIメディアを横断収集し、AIが「編集者」として日本語タイトル・要約・重要度を整理するニュースリーダー。
英語記事を読む負担を減らし、毎日数分で海外の重要ニュースをキャッチアップできることを目指しています。

**🌐 Live Demo: https://technews-digest.vercel.app**

- 🔥 **今日読むべき5本** — AIが毎朝、選定理由つきでおすすめ記事を提示(ランキングではなく「編集長のおすすめ」)
- 📰 全記事に **自然な日本語タイトル + 2〜4文の要約 + タグ**
- 🔗 **元記事への送客が前提** — 全文翻訳はせず、深掘りは一次情報へ

> 要件定義 → 競合分析 → アーキテクチャ設計 → 法的検討 → 実装 → デプロイまでを個人で一貫して行ったプロジェクトです。
> 設計プロセス全体は [`docs/`](./docs/00_README.md)(設計ドキュメント10本)を参照してください。

## アーキテクチャ

```mermaid
flowchart LR
    subgraph Batch["バッチ層(GitHub Actions・1日3回)"]
        F[fetcher<br>RSS/Atom収集] --> DG[digester<br>翻訳・要約・タグ付け]
        DG --> C[curator<br>今日の5本を選定]
    end
    subgraph AI["LLMClient アダプタ"]
        A1["Claude Code ヘッドレス<br>(既定・追加費用 $0)"]
        A2["Anthropic API<br>(成長時・環境変数で切替)"]
    end
    DG -.-> AI
    C -.-> AI
    Batch --> DB[(PostgreSQL<br>Neon)]
    DB --> Web["Next.js(Vercel)<br>ISR + 公開API"]
    Web --> U[ユーザー]
```

**設計の核: リクエスト時にAIを呼ばない。** すべてのAI処理は事前バッチで完了させ、Webは「DBを読むだけのサイト」にする。表示は速く、AI利用量は記事数にのみ比例します。

## 設計上のポイント

| テーマ | 内容 | 詳細 |
|---|---|---|
| **AI実行コストゼロ** | AI処理を Claude Code ヘッドレスモード(Proサブスク枠)で実行し追加費用$0。`LLMClient`アダプタで抽象化し、環境変数1つで Anthropic API へ移行可能 | [docs/04 §8](./docs/04_architecture.md) |
| **レート枠ガード** | 約10記事を1プロンプトに集約(1日約7プロンプト)。1バッチ上限100件・メディアあたり取得上限・初回取得は直近3日分のみ | [docs/09 §5](./docs/09_legal-operational-concerns.md) |
| **冪等性・排他制御** | GUIDのUNIQUE制約による重複排除、`FOR UPDATE SKIP LOCKED` による多重起動対策、`pending → processing → processed/failed` のステータス遷移 | [docs/05 §5](./docs/05_database-design.md) |
| **AI出力の構造化** | プロンプトでJSON出力を指示し **zodでスキーマ検証**。検証失敗・欠落記事は該当分のみ再試行。タグはDBマスタからの選択のみ(無限増殖防止) | [docs/04 §3.3](./docs/04_architecture.md) |
| **法的配慮** | 要約は2〜4文で元記事の代替としない・取得本文は内部利用のみで非表示・robots.txt尊重・出典/免責/削除窓口の明示 | [docs/09](./docs/09_legal-operational-concerns.md) |
| **障害分離** | フィード取得失敗は該当メディアのみスキップ。curator失敗時は前日分を表示継続。DB未接続でもページは空状態で表示 | [docs/04 §5](./docs/04_architecture.md) |

## 技術スタック

| レイヤ | 技術 | 選定理由(詳細: [docs/07](./docs/07_tech-stack.md)) |
|---|---|---|
| 言語 | TypeScript | Web/バッチで型・スキーマ・DBアクセスを共有 |
| Web | Next.js 15 (App Router) + Tailwind CSS 4 | サーバーコンポーネント + ISR でDB直読み |
| DB | PostgreSQL (Neon) + Drizzle ORM | 無料枠・pgvector等の将来拡張・軽量ORM |
| AI実行 | Claude Code ヘッドレス / Anthropic API | アダプタでモード切替(上記) |
| バッチ基盤 | GitHub Actions | CLI実行可・実行時間制約が緩い・無料枠 |
| ホスティング | Vercel (Hobby) | Next.js標準。push で自動デプロイ |
| 解析 | Vercel Analytics + PostHog | 無料枠内で併用 |
| 開発 | pnpm / Biome / Vitest | — |

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

### ローカルDB(Neonを使わない場合)

システムにPostgreSQLをインストールせず、node_modules内のバイナリで起動できる:

```sh
pnpm dev:db   # 127.0.0.1:54321 で起動(データは .dev/pgdata に永続化)
```

`.env` に以下を設定:

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54321/tech_news_digest
```

> ⚠️ **`.env.local` が存在すると本番DBに接続してしまう**: Next.js は `.env.local` を `.env` より優先して読み込む。
> `vercel env pull` を一度でも実行すると本番(Neon)の接続情報を含む `.env.local` が作られるため、
> それ以降 `pnpm dev` を実行すると意図せず本番DBに接続する。ローカルDBで作業したい場合は
> `.env.local` を一時的にリネームするか削除すること。詳細は [`docs/10_deployment-notes.md`](./docs/10_deployment-notes.md)。

## 開発

```sh
pnpm dev          # Next.js 開発サーバー
pnpm test         # ユニットテスト (Vitest)
pnpm lint         # Biome
pnpm typecheck    # tsc --noEmit
```

## バッチの実行

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

> **注**: スケジュール実行(1日3回)は現在 `gh workflow disable` で停止中(Proプラン枠の節約のため)。
> 再開方法・運用上の注意点は [`docs/10_deployment-notes.md`](./docs/10_deployment-notes.md) を参照。

## ディレクトリ

```
src/app/        # Next.js ページ + APIルート
src/components/ # UIコンポーネント
src/db/         # Drizzle スキーマ・クエリ(Web/バッチ共用)
src/batch/      # fetcher / digester / curator / LLMアダプタ
scripts/        # run-batch.ts / seed.ts / dev-db.ts
drizzle/        # マイグレーションSQL
tests/          # Vitest ユニットテスト
docs/           # 設計ドキュメント(要件定義〜運用メモ)
```

## License

[MIT](./LICENSE)
