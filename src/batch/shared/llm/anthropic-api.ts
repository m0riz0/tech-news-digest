import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/config";
import type { LLMClient, LLMRequest, LLMResponse } from "./client";

/**
 * モードB(成長時): Anthropic API(docs/04 §8)。
 * システムプロンプト(固定部)に prompt caching を適用し、可変部は
 * user メッセージに置く(docs/04 §3.6)。
 * モデルは DIGEST_MODEL / CURATE_MODEL 環境変数で指定。
 */
export class AnthropicApiClient implements LLMClient {
  private client: Anthropic;

  constructor() {
    const apiKey = getEnv().ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=api");
    }
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: req.model ?? getEnv().DIGEST_MODEL,
      max_tokens: req.maxTokens,
      system: [
        {
          type: "text",
          text: req.system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: req.prompt }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("Anthropic API refused the request");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("Anthropic API response was truncated (max_tokens)");
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
