import { spawn } from "node:child_process";
import type { LLMClient, LLMRequest, LLMResponse } from "./client";

const TIMEOUT_MS = 10 * 60 * 1000;

/**
 * モードA(既定): Claude Code ヘッドレスモード(docs/04 §8)。
 * `claude -p --output-format json` を子プロセス実行し、Pro サブスク枠で
 * AI処理を行う(AI追加費用 $0)。
 * 認証: ローカルはOAuthログイン済み環境 / CI は CLAUDE_CODE_OAUTH_TOKEN。
 */
export class ClaudeCodeClient implements LLMClient {
  async complete(req: LLMRequest): Promise<LLMResponse> {
    const args = [
      "-p",
      "--output-format",
      "json",
      "--append-system-prompt",
      req.system,
      "--max-turns",
      "1",
    ];

    const stdout = await runClaudeCli(args, req.prompt);
    const envelope = JSON.parse(stdout) as {
      type?: string;
      subtype?: string;
      is_error?: boolean;
      result?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    if (envelope.is_error || typeof envelope.result !== "string") {
      throw new Error(`claude -p returned error envelope: ${stdout.slice(0, 500)}`);
    }

    return {
      text: envelope.result,
      inputTokens: envelope.usage?.input_tokens ?? null,
      outputTokens: envelope.usage?.output_tokens ?? null,
    };
  }
}

function runClaudeCli(args: string[], stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => reject(new Error(`failed to spawn claude CLI: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`claude CLI exited with code ${code}: ${stderr.slice(0, 500)}`));
      }
    });

    child.stdin.write(stdin);
    child.stdin.end();
  });
}
