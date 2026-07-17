import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** メディア(docs/05 §2.1) */
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  feedUrl: text("feed_url").notNull(),
  siteUrl: text("site_url").notNull(),
  category: text("category", { enum: ["official", "media"] }),
  isActive: boolean("is_active").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ARTICLE_STATUSES = ["pending", "processing", "processed", "failed"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/** 記事(docs/05 §2.2) */
export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    guid: text("guid").notNull().unique(),
    url: text("url").notNull(),
    titleOriginal: text("title_original").notNull(),
    titleJa: text("title_ja"),
    summaryJa: text("summary_ja"),
    // AI入力用の本文テキスト。画面には表示しない(docs/09 §1.1)
    contentText: text("content_text"),
    importance: smallint("importance"),
    importanceReason: text("importance_reason"),
    status: text("status", { enum: ARTICLE_STATUSES }).notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // digester の対象抽出用の部分インデックス(docs/05 §3)
    index("articles_pending_idx").on(t.status).where(sql`${t.status} = 'pending'`),
    index("articles_published_at_idx").on(t.publishedAt.desc()),
    index("articles_source_published_idx").on(t.sourceId, t.publishedAt.desc()),
  ],
);

/** タグマスタ(docs/05 §2.3)。AIはこのマスタからの選択のみ */
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

/** 記事-タグ中間(docs/05 §2.4) */
export const articleTags = pgTable(
  "article_tags",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] }), index("article_tags_tag_idx").on(t.tagId)],
);

/** 今日の5本(docs/05 §2.5) */
export const dailyPicks = pgTable(
  "daily_picks",
  {
    id: serial("id").primaryKey(),
    pickDate: date("pick_date").notNull(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id),
    rank: smallint("rank").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_picks_date_rank_idx").on(t.pickDate, t.rank),
    uniqueIndex("daily_picks_date_article_idx").on(t.pickDate, t.articleId),
    index("daily_picks_date_idx").on(t.pickDate.desc()),
  ],
);

/** バッチ実行ログ / コスト記録(docs/05 §2.6) */
export const batchRuns = pgTable("batch_runs", {
  id: serial("id").primaryKey(),
  job: text("job", { enum: ["fetch", "digest", "curate"] }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status", { enum: ["running", "success", "partial", "failed"] }).notNull(),
  itemsTotal: integer("items_total"),
  itemsSucceeded: integer("items_succeeded"),
  itemsFailed: integer("items_failed"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  detail: jsonb("detail"),
});

/** フィード取得ログ(docs/05 §2.7) */
export const fetchLogs = pgTable("fetch_logs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => sources.id),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  newArticles: integer("new_articles"),
  errorMessage: text("error_message"),
});

export type Source = typeof sources.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type DailyPick = typeof dailyPicks.$inferSelect;
