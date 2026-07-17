import { z } from "zod";

/**
 * digester のAI出力スキーマ(docs/04 §3.3)。
 * Claude Code / Anthropic API 両モード共通の検証層(F-14)。
 */
export const digestItemSchema = z.object({
  article_id: z.number().int(),
  title_ja: z.string().min(1).max(200),
  summary_ja: z.string().min(1).max(1000),
  tags: z.array(z.string()).max(5),
  importance: z.number().int().min(1).max(5),
  importance_reason: z.string().min(1).max(500),
});

export const digestOutputSchema = z.array(digestItemSchema);

export type DigestItem = z.infer<typeof digestItemSchema>;

/**
 * LLM出力テキストからJSONを取り出してパースする。
 * markdownコードフェンスで囲まれるケースを許容する。
 */
export function parseJsonOutput(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(body);
}
