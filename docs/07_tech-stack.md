# 技術スタック選定

## 1. 選定サマリ

| レイヤ | 採用 | 主な理由 |
|---|---|---|
| 言語 | **TypeScript** | Web/バッチでコード共有。Anthropic公式SDKあり |
| Webフレームワーク | **Next.js (App Router)** | SSR/ISRでDB直読み+CDNキャッシュが簡単。Vercelと相性 |
| UI | **Tailwind CSS** | カード中心のシンプルUIを素早く構築 |
| DB | **PostgreSQL(Neon または Supabase)** | 無料枠あり。pgvector等の将来拡張。サーバーレスと相性良 |
| ORM | **Drizzle ORM** | 型安全・軽量・マイグレーション内蔵。サーバーレス向き |
| AI実行(既定) | **Claude Code ヘッドレスモード(`claude -p`)** | 契約中の Pro プラン枠で実行 = **AI追加費用 $0/月**。CI では `claude setup-token` の長期トークンで認証 |
| AI実行(成長時) | `@anthropic-ai/sdk`(Anthropic API) | アダプタ層で抽象化し、環境変数 `AI_PROVIDER` で切替([04 §8](./04_architecture.md#8-ai実行アダプタとapi移行パス)) |
| AIモデル | Claude Code モード: サブスク既定(Sonnet系)/ APIモード: 環境変数で指定 | MVPはモデル指定なし。API移行時に品質×コストで選定 |
| フィード取得 | `rss-parser`(RSS/Atom)+ 本文抽出に `@extractus/article-extractor` 等 | 実装時に評価して確定 |
| ホスティング | **Vercel(Hobby・無料)** | Next.js標準。※Hobbyは非商用利用が条件(現方針=非収益と整合) |
| バッチ実行 | **GitHub Actions スケジュール実行**(1日3回) | スクリプト直接実行。関数タイムアウトと無縁。無料枠2,000分/月で十分 |
| 監視 | GitHub Actionsログ + `batch_runs` テーブル | MVPは専用監視ツールなし |

## 2. 各選定の検討過程

### 2.1 言語: TypeScript(vs Python)

| | TypeScript | Python |
|---|---|---|
| Web実装 | ◎ Next.jsと一体 | △ 別途フロント言語が必要 |
| バッチ実装 | ○ 十分 | ◎ スクレイピング系ライブラリ豊富 |
| コード共有 | ◎ 型・スキーマ・DBアクセスをWeb/バッチで共有 | × 二言語管理 |
| Anthropic SDK | ◎ 公式 | ◎ 公式 |

**判断**: バッチの規模が小さく(フィード取得+API呼び出し)、Pythonの優位性が活きない。単一言語のメリットを取り TypeScript に統一。

### 2.2 Webフレームワーク: Next.js App Router

- トップ画面は「DBを読んでHTMLを返す」だけ → サーバーコンポーネント+ISRが最適
- API Routes で公開API・cronエンドポイントも同一プロジェクトに同居でき、MVPをモノリスに保てる
- 代替の Remix / Astro / SvelteKit でも成立するが、Vercelとの相性と情報量で Next.js を採用

### 2.3 DB: PostgreSQL(vs SQLite/Turso, vs MySQL)

| | PostgreSQL (Neon/Supabase) | SQLite (Turso/litefs) |
|---|---|---|
| サーバーレス対応 | ◎ HTTPドライバあり | ◎ |
| 将来拡張(pgvector, 全文検索) | ◎ | △ |
| 運用 | マネージド無料枠 | マネージド無料枠 |
| バッチとの同時接続 | ◎ | ○ |

**判断**: どちらでも成立するが、将来の関連記事機能(pgvector)と一般的な運用知見を優先して PostgreSQL。プロバイダは Neon(純DB・軽量)を第一候補、認証等を将来使うなら Supabase(今回は認証不要なので Neon 優位)。

### 2.4 ORM: Drizzle(vs Prisma)

- Drizzle: SQLに近く軽量、エッジ/サーバーレスでの実績、マイグレーションがSQLファイルで透明
- Prisma: 機能豊富だがランタイムが重め
- **判断**: 小規模・サーバーレス前提のため Drizzle。ただしチーム習熟度次第で Prisma でも支障なし(レビュー時に確認したい点)

### 2.5 AI実行方式: Claude Code ヘッドレス(既定)⇔ Anthropic API(成長時)

コスト最優先方針(個人開発・MVP・自分専用)により、**契約中の Claude Pro プランの枠で AI 処理を賄う**。呼び出しは `LLMClient` アダプタで抽象化し、環境変数 `AI_PROVIDER` で切替([04 §8](./04_architecture.md#8-ai実行アダプタとapi移行パス))。

| 項目 | モードA: Claude Code(既定・MVP) | モードB: Anthropic API(成長時) |
|---|---|---|
| 実行方法 | `claude -p "..." --output-format json` を子プロセス実行 | `@anthropic-ai/sdk` Messages API |
| 認証 | サブスクOAuth(ローカル)/ `CLAUDE_CODE_OAUTH_TOKEN`(CI) | `ANTHROPIC_API_KEY` |
| 費用 | **追加 $0/月**(Pro枠を消費) | 従量課金([04 §7.2](./04_architecture.md#7-コスト見積もり) 参照) |
| モデル | サブスク既定(Sonnet系)。指定しない | `DIGEST_MODEL` / `CURATE_MODEL` で指定 |
| 出力制御 | プロンプトでJSON指示 + **zod検証**+失敗時1回再試行 | Structured Outputs(zod検証は共通で維持) |
| API専用機能 | 使用不可(Batch API / prompt caching / effort 制御) | 使用可。移行時に有効化 |
| 制約 | Proレート枠(5時間+週次)を普段の利用と共有。個人利用の範囲で運用([09参照](./09_legal-operational-concerns.md)) | なし(通常のレート制限のみ) |

プロンプトと zod スキーマは両モード完全共通。モードAでも「固定システムプロンプト+可変部」の構造で実装し、移行時にそのままキャッシュ境界にする。

### 2.6 バッチ実行基盤: GitHub Actions(vs Vercel Cron, vs VPS)

| | GitHub Actions | Vercel Cron | VPS |
|---|---|---|---|
| 実行方式 | スクリプト直接実行(`npx tsx scripts/run-batch.ts`) | HTTP関数呼び出し | crontab |
| 実行時間制約 | ◎ 緩い(ジョブ6時間まで) | △ 関数タイムアウト。**Hobbyはcron頻度・精度に制限** | ◎ |
| Claude Code 実行 | ◎ CLIをインストールして実行可(`CLAUDE_CODE_OAUTH_TOKEN`) | × サーバーレス関数内でのCLI実行は不向き | ◎ |
| 運用コスト | ◎ 無料枠 2,000分/月(1日3回×数分で余裕) | ◎ 無料 | × 管理負担 |

**判断**: **GitHub Actions**。決め手は (1) Claude Code CLI を動かせること、(2) 実行時間制約がないこと、(3) Vercel Hobby の cron 制限。Webホスティング(Vercel)とバッチ(GitHub Actions)を分離するが、コードは同一リポジトリで共有。

補足: Vercel Hobby プランは非商用利用が条件。現方針(非収益・個人利用)と整合するが、**収益化時は Vercel Pro 化と API モード移行をセットで行う**。

## 3. 開発ツール

| 用途 | ツール |
|---|---|
| パッケージ管理 | pnpm |
| Lint/Format | Biome(または ESLint + Prettier) |
| テスト | Vitest(パイプラインのユニットテスト中心。AI出力はスキーマ検証テスト) |
| CI | GitHub Actions(lint + typecheck + test) |
| スキーマ管理 | drizzle-kit(マイグレーション) |

## 4. 環境変数一覧(想定)

| 変数 | 用途 | 備考 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL接続文字列 | |
| `AI_PROVIDER` | AI実行モード: `claude-code`(既定)/ `api` | |
| `CLAUDE_CODE_OAUTH_TOKEN` | CI(GitHub Actions)でのサブスク認証。`claude setup-token` で発行 | モードA・CI実行時のみ |
| `ANTHROPIC_API_KEY` | Claude API 認証 | モードB時のみ |
| `DIGEST_MODEL` / `CURATE_MODEL` | ジョブ別モデルID | モードB時のみ |
| `DIGEST_USE_BATCH_API` | Batch API 使用フラグ(50%オフ) | モードB時のみ |
| `CRON_SECRET` | 内部cronエンドポイント認証 | Vercel Cron 併用時のみ(既定構成では不要) |
