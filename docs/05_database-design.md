# DB設計

RDBMS: **PostgreSQL**(選定理由は [07](./07_tech-stack.md))。ORM経由(Drizzle)でスキーマ管理・マイグレーションを行う。

## 1. ER図

```
┌─────────┐ 1    * ┌──────────────┐ *    * ┌──────┐
│ sources │────────│   articles   │────────│ tags │
└─────────┘        └──────┬───────┘ (article_tags)
                          │ 1
                          │ *
                   ┌──────┴───────┐
                   │ daily_picks  │
                   └──────────────┘

┌────────────┐          ┌────────────┐
│ batch_runs │          │ fetch_logs │   (運用ログ系・FKなしの独立テーブル)
└────────────┘          └────────────┘
```

## 2. テーブル定義

### 2.1 sources(メディア)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | serial | PK | |
| slug | text | UNIQUE, NOT NULL | 識別子(例: `openai-blog`) |
| name | text | NOT NULL | 表示名(例: `OpenAI`) |
| feed_url | text | NOT NULL | RSS/AtomフィードURL |
| site_url | text | NOT NULL | メディアのトップURL |
| category | text | | `official`(企業公式) / `media`(商業メディア) |
| is_active | boolean | NOT NULL, default true | 収集対象フラグ(無効化はレコード削除ではなくこれで) |
| last_fetched_at | timestamptz | | 最終取得日時 |
| created_at | timestamptz | NOT NULL, default now() | |

### 2.2 articles(記事)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | serial | PK | |
| source_id | integer | FK → sources.id, NOT NULL | |
| guid | text | UNIQUE, NOT NULL | フィードのGUID(なければURL)。重複排除キー |
| url | text | NOT NULL | 元記事URL |
| title_original | text | NOT NULL | 原文タイトル |
| title_ja | text | | AI生成の日本語タイトル(未処理/失敗時 NULL) |
| summary_ja | text | | AI生成の日本語要約 |
| content_text | text | | AI入力用の本文テキスト(上限あり)。**画面には表示しない** |
| importance | smallint | | AIによる重要度 1〜5(curator の一次絞り込み用) |
| importance_reason | text | | 重要度判断の根拠 |
| status | text | NOT NULL, default 'pending' | `pending` / `processing` / `processed` / `failed` |
| published_at | timestamptz | NOT NULL | 記事公開日時 |
| fetched_at | timestamptz | NOT NULL, default now() | 収集日時 |
| processed_at | timestamptz | | AI処理完了日時 |
| created_at | timestamptz | NOT NULL, default now() | |

補足:

- `content_text` は法的リスク低減のため**表示に使わない内部データ**。保持期間を限定し、処理完了後に NULL クリアする運用も選択肢(09参照)。
- 将来の関連記事機能用に `embedding vector(n)` 列(pgvector)を後付け予定。MVPでは作らない。

### 2.3 tags(タグマスタ)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | serial | PK | |
| slug | text | UNIQUE, NOT NULL | 例: `llm` |
| name | text | NOT NULL | 表示名(例: `LLM`) |
| is_active | boolean | NOT NULL, default true | プロンプトに含めるか |

初期データ(BRIEF例より): LLM / AI Agent / OpenAI / Anthropic / Google / Meta / Python / AWS / Security / Frontend / Backend / DevTools / Research / Business など 15〜20 個。**タグはAIが自由生成せず、このマスタからの選択のみ**(enum制約)。

### 2.4 article_tags(記事-タグ中間)

| カラム | 型 | 制約 |
|---|---|---|
| article_id | integer | FK → articles.id, ON DELETE CASCADE |
| tag_id | integer | FK → tags.id |
| | | PK (article_id, tag_id) |

### 2.5 daily_picks(今日の5本)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | serial | PK | |
| pick_date | date | NOT NULL | 選定日(JST基準) |
| article_id | integer | FK → articles.id, NOT NULL | |
| rank | smallint | NOT NULL | 1〜5(表示順。優劣ではなく「紙面の並び」) |
| reason | text | NOT NULL | 選定理由(読者向け1文) |
| created_at | timestamptz | NOT NULL, default now() | |

制約: `UNIQUE (pick_date, rank)`, `UNIQUE (pick_date, article_id)`
日次で蓄積されるため、将来の「日別アーカイブ」はこのテーブルの読み出しだけで実現できる。

### 2.6 batch_runs(バッチ実行ログ / コスト記録)

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | serial | PK | |
| job | text | NOT NULL | `fetch` / `digest` / `curate` |
| started_at | timestamptz | NOT NULL | |
| finished_at | timestamptz | | |
| status | text | NOT NULL | `running` / `success` / `partial` / `failed` |
| items_total | integer | | 対象件数 |
| items_succeeded | integer | | 成功件数 |
| items_failed | integer | | 失敗件数 |
| input_tokens | integer | | Claude API 入力トークン合計(キャッシュ含む内訳はdetailへ) |
| output_tokens | integer | | 出力トークン合計 |
| detail | jsonb | | エラー内訳・キャッシュヒット数など自由記述 |

コスト仮説(H4)の検証に必須。ダッシュボードは作らず、SQLで集計できれば十分。

### 2.7 fetch_logs(フィード取得ログ)※Should

| カラム | 型 | 説明 |
|---|---|---|
| id | serial | PK |
| source_id | integer | FK → sources.id |
| fetched_at | timestamptz | |
| status | text | `success` / `error` |
| new_articles | integer | 新規記事数 |
| error_message | text | |

連続失敗メディアの検知用。MVPでは `batch_runs.detail` への記録で代替してもよい。

## 3. インデックス

| テーブル | インデックス | 用途 |
|---|---|---|
| articles | UNIQUE (guid) | 重複排除(挿入時) |
| articles | (status) WHERE status = 'pending' | digester の対象抽出(部分インデックス) |
| articles | (published_at DESC) | 最新記事一覧 |
| articles | (source_id, published_at DESC) | 将来のメディア別一覧 |
| daily_picks | (pick_date DESC) | 今日の5本・アーカイブ |
| article_tags | (tag_id) | 将来のタグ検索 |

## 4. データ量見積もり

- 50記事/日 × 365日 ≒ 18,000記事/年。`content_text`(~8KB)込みでも 150MB/年 程度
- 無料〜最小プランのマネージドPostgreSQLで数年運用可能。`content_text` のクリア運用でさらに縮小可

## 5. ステータス遷移(articles.status)

```
pending ──(digester が取得)──▶ processing ──(成功)──▶ processed
                                   │
                                   └──(2回再試行後も失敗)──▶ failed
failed ──(手動または次回バッチで再挑戦可)──▶ processing
```

- `processing` への更新は `UPDATE ... WHERE status = 'pending' RETURNING` で排他制御し、バッチ多重起動でも二重処理を防ぐ
- `processing` のまま一定時間(例: 30分)経過したレコードは次回バッチで `pending` に戻す(プロセス異常終了対策)
