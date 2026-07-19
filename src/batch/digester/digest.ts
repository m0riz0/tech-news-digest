import { getDb } from "@/db/client";
import { listActiveTags } from "@/db/queries/sources";
import { articleTags, articles, sources } from "@/db/schema";
import { getEnv } from "@/lib/config";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { getLLMClient } from "../shared/llm/client";
import { buildDigestSystemPrompt, buildDigestUserPrompt } from "./prompt";
import { type DigestItem, digestOutputSchema, parseJsonOutput } from "./schema";

/** 約10記事を1プロンプトに集約(docs/04 §3.3。Proレート枠の節約) */
const CHUNK_SIZE = 10;
/** 1バッチの処理記事数上限(docs/09 §5 レート枠ガード) */
const MAX_ARTICLES_PER_BATCH = 100;
/** processing のままこの時間を超えたら pending に戻す(docs/05 §5) */
const STALE_PROCESSING_MINUTES = 30;
const MAX_TOKENS = 8_000;

export type DigestSummary = {
  itemsTotal: number;
  itemsSucceeded: number;
  itemsFailed: number;
  inputTokens: number;
  outputTokens: number;
  errors: string[];
};

/**
 * pending 記事をAI処理(翻訳+要約+タグ+重要度)して processed に更新する。
 * ステータス遷移: pending → processing → processed / failed(docs/05 §5)。
 */
export async function digestPendingArticles(): Promise<DigestSummary> {
  const db = getDb();
  const summary: DigestSummary = {
    itemsTotal: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    inputTokens: 0,
    outputTokens: 0,
    errors: [],
  };

  // プロセス異常終了対策: 古い processing を pending に戻す(docs/05 §5)。
  // processing開始時刻のカラムを持たないため fetched_at で近似している。
  // バッチはGitHub Actionsのconcurrency groupで直列実行される前提であり、
  // ローカル実行とCIが同時に走った場合のみ、取得から30分以上経過した処理中記事を
  // 二重処理する可能性がある(結果は冪等なので実害はAI呼び出しの重複のみ)
  await db
    .update(articles)
    .set({ status: "pending" })
    .where(
      and(
        eq(articles.status, "processing"),
        lt(
          articles.fetchedAt,
          sql`now() - interval '${sql.raw(String(STALE_PROCESSING_MINUTES))} minutes'`,
        ),
      ),
    );

  const activeTags = await listActiveTags();
  const tagIdByName = new Map(activeTags.map((t) => [t.name, t.id]));
  const systemPrompt = buildDigestSystemPrompt(activeTags.map((t) => t.name));
  const llm = getLLMClient();
  const model = getEnv().DIGEST_MODEL;

  while (summary.itemsTotal < MAX_ARTICLES_PER_BATCH) {
    const chunk = await claimPendingChunk(CHUNK_SIZE);
    if (chunk.length === 0) break;
    summary.itemsTotal += chunk.length;

    try {
      const userPrompt = buildDigestUserPrompt(chunk);
      let items = await callAndParseWithRetry(llm, systemPrompt, userPrompt, model, summary);

      // 欠落・不正があった記事のみ1回再試行(F-14)
      const returnedIds = new Set(items.map((i) => i.article_id));
      const missing = chunk.filter((a) => !returnedIds.has(a.id));
      if (missing.length > 0) {
        try {
          const retryItems = await callAndParse(
            llm,
            systemPrompt,
            buildDigestUserPrompt(missing),
            model,
            summary,
          );
          items = items.concat(retryItems);
        } catch (err) {
          summary.errors.push(`retry failed: ${errorMessage(err)}`);
        }
      }

      const itemById = new Map(items.map((i) => [i.article_id, i]));
      for (const article of chunk) {
        const item = itemById.get(article.id);
        if (item) {
          await applyDigest(article.id, item, tagIdByName);
          summary.itemsSucceeded += 1;
        } else {
          await markFailed([article.id]);
          summary.itemsFailed += 1;
        }
      }
    } catch (err) {
      // チャンク全体の失敗(レート制限等)。failed にして次回バッチで再挑戦可能にする
      summary.errors.push(errorMessage(err));
      await markFailed(chunk.map((a) => a.id));
      summary.itemsFailed += chunk.length;
      // レート制限の可能性が高いためバッチを打ち切る(docs/04 §5)
      break;
    }
  }

  return summary;
}

type ClaimedArticle = {
  id: number;
  sourceName: string;
  titleOriginal: string;
  contentText: string | null;
};

/**
 * pending 記事を processing に更新して取得する。
 * UPDATE ... WHERE status = 'pending' による排他制御で多重起動でも二重処理しない。
 */
async function claimPendingChunk(limit: number): Promise<ClaimedArticle[]> {
  const db = getDb();

  const claimed = await db.execute<{ id: number }>(sql`
    UPDATE articles SET status = 'processing'
    WHERE id IN (
      SELECT id FROM articles
      WHERE status = 'pending'
      ORDER BY published_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `);
  const ids = claimed.map((r) => r.id);
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: articles.id,
      sourceName: sources.name,
      titleOriginal: articles.titleOriginal,
      contentText: articles.contentText,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(inArray(articles.id, ids))
    .orderBy(asc(articles.publishedAt));
  return rows;
}

async function callAndParse(
  llm: ReturnType<typeof getLLMClient>,
  system: string,
  prompt: string,
  model: string,
  summary: DigestSummary,
): Promise<DigestItem[]> {
  const res = await llm.complete({ system, prompt, maxTokens: MAX_TOKENS, model });
  summary.inputTokens += res.inputTokens ?? 0;
  summary.outputTokens += res.outputTokens ?? 0;
  return digestOutputSchema.parse(parseJsonOutput(res.text));
}

/**
 * チャンク全体を処理し、JSONパース/スキーマ検証に失敗したら1回だけ再試行する。
 * LLMは文字列内のダブルクオート・改行の未エスケープなどで単発の構文崩れを起こしやすく、
 * 同じ入力でも再生成すればほぼ妥当なJSONになるため、全滅させる前に1回リトライする。
 */
async function callAndParseWithRetry(
  llm: ReturnType<typeof getLLMClient>,
  system: string,
  prompt: string,
  model: string,
  summary: DigestSummary,
): Promise<DigestItem[]> {
  try {
    return await callAndParse(llm, system, prompt, model, summary);
  } catch (err) {
    summary.errors.push(`parse failed, retrying chunk: ${errorMessage(err)}`);
    return await callAndParse(llm, system, prompt, model, summary);
  }
}

async function applyDigest(
  articleId: number,
  item: DigestItem,
  tagIdByName: Map<string, number>,
): Promise<void> {
  const db = getDb();

  // 未知タグはマスタ外のため無視する(タグの無限増殖防止。docs/04 §3.3)
  const tagIds = item.tags
    .map((name) => tagIdByName.get(name))
    .filter((id): id is number => id !== undefined);

  // タグが1つも付かない記事はIT・AIニュースと無関係とみなし、skipped で非表示にする。
  // 行を残すことで guid の重複排除が効き、フィード掲載中の再取得・再処理を防ぐ(docs/05 §5)
  await db
    .update(articles)
    .set({
      titleJa: item.title_ja,
      summaryJa: item.summary_ja,
      importance: item.importance,
      importanceReason: item.importance_reason,
      status: tagIds.length > 0 ? "processed" : "skipped",
      processedAt: new Date(),
    })
    .where(eq(articles.id, articleId));

  if (tagIds.length > 0) {
    await db
      .insert(articleTags)
      .values(tagIds.map((tagId) => ({ articleId, tagId })))
      .onConflictDoNothing();
  }
}

async function markFailed(articleIds: number[]): Promise<void> {
  if (articleIds.length === 0) return;
  const db = getDb();
  await db.update(articles).set({ status: "failed" }).where(inArray(articles.id, articleIds));
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
