import { z } from "zod";

/**
 * 環境変数の読み込み・検証(docs/07 §4)。
 * Web(Next.js)とバッチの両方から参照するため、必須チェックは
 * 実際に使う箇所で行う(例: DATABASE_URL は DB クライアント初期化時)。
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AI_PROVIDER: z.enum(["claude-code", "api"]).default("claude-code"),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DIGEST_MODEL: z.string().default("claude-sonnet-5"),
  CURATE_MODEL: z.string().default("claude-sonnet-5"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export function requireDatabaseUrl(): string {
  const url = getEnv().DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}
