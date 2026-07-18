# ディレクトリ構成

単一の Next.js プロジェクト(モノリス)。Web・API・バッチロジックを同居させ、型とDBアクセスを共有する。

```
tech-news-digest/
├── PROJECT_BRIEF.md
├── docs/                          # 設計ドキュメント(本ディレクトリ)
│
├── .github/
│   └── workflows/
│       ├── batch.yml              # バッチのスケジュール実行(1日3回。CLAUDE_CODE_OAUTH_TOKEN 使用)
│       └── ci.yml                 # lint + typecheck + test
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx               # トップ: 今日の5本 + 最新記事一覧(ISR)
│   │   ├── about/
│   │   │   └── page.tsx           # About / 免責 / 出典方針 / 削除依頼窓口
│   │   └── api/
│   │       ├── v1/
│   │       │   ├── articles/route.ts      # GET 記事一覧
│   │       │   ├── picks/today/route.ts   # GET 今日の5本
│   │       │   ├── sources/route.ts       # GET メディア一覧
│   │       │   └── tags/route.ts          # GET タグ一覧
│   │       └── internal/
│   │           └── cron/run/route.ts      # POST バッチトリガー(オプション。既定のGitHub Actions構成では不要)
│   │
│   ├── components/                # UIコンポーネント
│   │   ├── ArticleCard.tsx        # 記事カード(一覧・picks共用)
│   │   ├── PickCard.tsx           # 今日の5本用カード(選定理由つき)
│   │   ├── PicksSection.tsx
│   │   ├── ArticleList.tsx        # 一覧+タグ絞り込み+「もっと見る」
│   │   ├── PostHogProvider.tsx    # アクセス解析(PostHog)の初期化
│   │   └── SiteHeader.tsx / SiteFooter.tsx
│   │
│   ├── db/                        # データアクセス層(Web/バッチ共用)
│   │   ├── client.ts              # Drizzle クライアント初期化
│   │   ├── schema.ts              # 全テーブル定義(docs/05 と対応)
│   │   └── queries/
│   │       ├── articles.ts        # 一覧取得・カーソルページネーション
│   │       ├── picks.ts           # 今日の5本・日別取得
│   │       └── sources.ts
│   │
│   ├── batch/                     # バッチパイプライン(docs/04 と対応)
│   │   ├── index.ts               # ジョブディスパッチャ(fetch/digest/curate)
│   │   ├── fetcher/
│   │   │   ├── fetch-feeds.ts     # フィード取得・重複排除・保存
│   │   │   └── extract-content.ts # 本文抽出(補助)
│   │   ├── digester/
│   │   │   ├── digest.ts          # pending記事のAI処理(約10記事/プロンプトのチャンク処理)
│   │   │   ├── prompt.ts          # プロンプト(固定部+可変部に分離。両モード共通)
│   │   │   └── schema.ts          # zod スキーマ(両モード共通の出力検証)
│   │   ├── curator/
│   │   │   ├── curate.ts          # 今日の5本選定
│   │   │   ├── prompt.ts
│   │   │   └── schema.ts          # zod スキーマ
│   │   └── shared/
│   │       ├── llm/               # AI実行アダプタ(docs/04 §8 と対応)
│   │       │   ├── client.ts      # LLMClient インターフェース + AI_PROVIDER による選択
│   │       │   ├── claude-code.ts # モードA: claude -p 子プロセス実行(既定)
│   │       │   └── anthropic-api.ts # モードB: @anthropic-ai/sdk(成長時)
│   │       └── run-logger.ts      # batch_runs への記録
│   │
│   └── lib/                       # 汎用ユーティリティ
│       ├── config.ts              # 環境変数の読み込み・検証
│       ├── datetime.ts            # JST変換・相対時刻表示
│       ├── api-helpers.ts         # APIレスポンス整形・エラー形式・カーソル
│       └── article-json.ts        # 記事のJSON表現(API/コンポーネントprops共用)
│
├── scripts/
│   ├── run-batch.ts               # CLI実行用エントリ(GitHub Actions / ローカル開発)
│   ├── seed.ts                    # sources / tags の初期データ投入
│   └── dev-db.ts                  # ローカル開発用PostgreSQL(embedded-postgres)の起動
│
├── drizzle/                       # マイグレーションSQL(drizzle-kit生成)
├── drizzle.config.ts
│
├── tests/
│   ├── batch/                     # fetcher重複排除・スキーマ検証などのユニットテスト
│   └── lib/
│
├── public/
├── .env.example                   # 必要な環境変数の一覧(docs/07 §4 と対応)
├── next.config.ts
├── biome.json                     # Lint/Format設定
├── vitest.config.ts
├── package.json
└── tsconfig.json
```

> 実装時の変更点: Tailwind CSS 4 を採用したため `tailwind.config.ts` は存在しない
> (v4はCSSファイル内で設定する方式)。`src/app/api/internal/cron/` は既定のGitHub Actions
> 構成では不要のため未実装(docs/06 §4 のとおりオプション扱い)。

## 設計上のポイント

1. **`src/batch/` はWebから独立** — Next.jsのビルドに引きずられず、`scripts/run-batch.ts` から単体実行できる。既定は GitHub Actions のスケジュール実行(`.github/workflows/batch.yml`)で、ローカルからも同じスクリプトを実行可能。
2. **AI関連の3点セット(処理・プロンプト・スキーマ)をジョブごとに同居** — digester/curator それぞれのプロンプト改善が独立して行える。プロンプトはコードとしてバージョン管理。zod スキーマは Claude Code / API 両モード共通の検証層。
3. **AI実行は `shared/llm/` のアダプタに集約** — digester/curator は `LLMClient` インターフェースのみに依存。`AI_PROVIDER` 環境変数で Claude Code(サブスク枠・既定)と Anthropic API(成長時)を切替([04 §8参照](./04_architecture.md#8-ai実行アダプタとapi移行パス))。
4. **`src/db/queries/` に読み書きを集約** — 画面・API・バッチが同じクエリ関数を使い、仕様の分裂を防ぐ。
5. **テストはバッチロジック優先** — UIよりもパイプライン(重複排除、ステータス遷移、スキーマ検証、カーソル計算)にテストを寄せる。AI出力そのものは実行時のスキーマ検証で担保。
6. **将来拡張の置き場所が明確** — タグ検索→ `app/tags/[slug]/page.tsx`、アーカイブ→ `app/archive/[date]/page.tsx`、週間まとめ→ `batch/weekly/` を追加するだけ。
