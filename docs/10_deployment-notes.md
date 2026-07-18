# デプロイ・運用メモ

2026-07-18 に実施した初回デプロイ(Vercel + Neon + PostHog)で判明した運用上の注意点。
docs/01〜09 は実装前の設計ドキュメントのため、実環境を構築して初めて分かった内容をここに記録する。

## 1. 本番環境の構成

| 項目 | 内容 |
|---|---|
| Web | Vercel(Hobby)。https://techbeacon.vercel.app |
| DB | Neon Postgres(Vercel Marketplace連携で自動プロビジョニング。`DATABASE_URL` 等はVercel側で自動注入) |
| アクセス解析 | Vercel Analytics(`@vercel/analytics`)+ PostHog(Vercel Marketplace連携) |
| Git連携 | GitHub `m0riz0/tech-news-digest` の `main` ブランチ → push で自動デプロイ(Preview含む) |
| バッチ | GitHub Actions `.github/workflows/batch.yml`。**現在 `gh workflow disable` で手動停止中**(§3参照) |

## 2. Preview環境も本番Neon DBを共有している

Neon連携時、`DATABASE_URL` が Production / Preview / Development の全環境に同じ値で登録される。
そのため、機能ブランチをpushして作られるPreviewデプロイも本番と同じDBを参照する
(`vercel env ls` で確認可能)。

現状は書き込みバッチ(fetch/digest/curate)がPreviewから動くことはなく、Next.jsのISRビルド時に
発生するのも読み取りのみのクエリなので実害はない。ただし「PRを作ってPreviewで動作確認する」
運用を始める場合は、Neonのブランチ機能(本番DBのコピーを作って分離)を検討すること。

## 3. batch.yml のスケジュール実行は無効化されている(コード上は見えない)

`.github/workflows/batch.yml` のファイル自体は1日3回のcronスケジュールが書かれたままだが、
Claude Pro プラン枠の消費を避けるため、GitHub Actionsのワークフロー自体を無効化している
(ファイルは編集していない)。

```sh
gh workflow disable Batch --repo m0riz0/tech-news-digest   # 現在の状態
gh workflow enable  Batch --repo m0riz0/tech-news-digest   # 再開
gh workflow list --all --repo m0riz0/tech-news-digest      # 状態確認
```

**ファイル(`batch.yml`)を見ただけではスケジュールが有効に見えるので注意。** 実際に動いているか
確認する際は必ず `gh workflow list --all` で `active` / `disabled_manually` を見ること。

## 4. アクセス解析の環境変数はProductionのみに設定

`NEXT_PUBLIC_POSTHOG_HOST` / `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` は Production 環境にのみ設定されている
(Preview/Developmentには無い)。Previewデプロイの閲覧がアクセス解析のノイズにならないようにする
意図であり、対応不要。

## 5. カスタムドメイン未設定

現状 `techbeacon.vercel.app`(Vercelの既定ドメイン)のまま運用している。
独自ドメインを使う場合は Vercel の Project → Settings → Domains から追加する。急ぎでなければ対応不要。

## 6. 要フォロー

- [x] PostHog の Billing limit($0)設定 — 確認・対応済み(2026-07-18)
- [x] Vercel Analytics のダッシュボード有効化(Enable) — 確認・対応済み(2026-07-18)

## 7. GitHub Actions の CI が pnpm のビルドスクリプト承認漏れで壊れていた(2026-07-18 修正済み)

`embedded-postgres` 導入時、macOS上で `pnpm approve-builds` を実行して
`pnpm-workspace.yaml` に `@embedded-postgres/darwin-arm64` のみを承認する設定がコミットされた。
CI(`ubuntu-latest`)では別パッケージ `@embedded-postgres/linux-x64` が解決されるが、
これが未承認(未決定)のため、非対話環境の `pnpm install` が承認待ち状態で失敗し続けていた
(`embedded-postgres` 追加コミットから直近の修正コミットまで、CIは全件失敗していた)。

Vercel側のビルドは独自にpnpm installを行うため影響を受けず、デプロイ自体は問題なく成功し続けていた
ことも発覚が遅れた一因。CIの失敗はVercelのデプロイ成否とは独立して必ず確認すること。

対応: `pnpm-workspace.yaml` の `allowBuilds` に `"@embedded-postgres/linux-x64": false` を追加
(CIでは実バイナリを使わないためビルドスクリプト自体をスキップ)。

**教訓**: 新しいネイティブ依存(ビルドスクリプトを持つパッケージ)を追加したら、
`pnpm-workspace.yaml` の承認設定がCI実行環境(Linux)でも通るか、CIのActionsタブで必ず確認する。
