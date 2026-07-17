CREATE TABLE "article_tags" (
	"article_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"guid" text NOT NULL,
	"url" text NOT NULL,
	"title_original" text NOT NULL,
	"title_ja" text,
	"summary_ja" text,
	"content_text" text,
	"importance" smallint,
	"importance_reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_guid_unique" UNIQUE("guid")
);
--> statement-breakpoint
CREATE TABLE "batch_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"items_total" integer,
	"items_succeeded" integer,
	"items_failed" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "daily_picks" (
	"id" serial PRIMARY KEY NOT NULL,
	"pick_date" date NOT NULL,
	"article_id" integer NOT NULL,
	"rank" smallint NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fetch_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"new_articles" integer,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"feed_url" text NOT NULL,
	"site_url" text NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_picks" ADD CONSTRAINT "daily_picks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetch_logs" ADD CONSTRAINT "fetch_logs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_tags_tag_idx" ON "article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "articles_pending_idx" ON "articles" USING btree ("status") WHERE "articles"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "articles_source_published_idx" ON "articles" USING btree ("source_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "daily_picks_date_rank_idx" ON "daily_picks" USING btree ("pick_date","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_picks_date_article_idx" ON "daily_picks" USING btree ("pick_date","article_id");--> statement-breakpoint
CREATE INDEX "daily_picks_date_idx" ON "daily_picks" USING btree ("pick_date" DESC NULLS LAST);