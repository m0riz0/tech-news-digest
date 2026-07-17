import { getEnv } from "@/lib/config";
import { AnthropicApiClient } from "./anthropic-api";
import { ClaudeCodeClient } from "./claude-code";

/**
 * AI実行アダプタの共通インターフェース(docs/04 §8)。
 * digester / curator はこのインターフェースのみに依存し、
 * AI_PROVIDER 環境変数で Claude Code(既定)/ Anthropic API を切り替える。
 */
export type LLMRequest = {
  /** 固定部(役割定義+出力ルール)。APIモード移行時のキャッシュ境界になる */
  system: string;
  /** 可変部(記事データ等) */
  prompt: string;
  maxTokens: number;
  /** ジョブ別モデル指定(APIモード時のみ使用) */
  model?: string;
};

export type LLMResponse = {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export interface LLMClient {
  complete(req: LLMRequest): Promise<LLMResponse>;
}

let cached: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!cached) {
    cached = getEnv().AI_PROVIDER === "api" ? new AnthropicApiClient() : new ClaudeCodeClient();
  }
  return cached;
}
