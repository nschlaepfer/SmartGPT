import { z } from "zod";
import {
  codexSdkInput,
  codexSdkOutput,
  claudeCodeSdkInput,
  claudeCodeSdkOutput,
} from "./config.js";
import * as dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

/**
 * Run a task using the OpenAI Codex SDK
 * Uses Codex auth (ChatGPT subscription or API key) from local Codex config
 */
export async function codex_sdk(
  params: z.infer<typeof codexSdkInput>
): Promise<z.infer<typeof codexSdkOutput>> {
  const { prompt, model, threadId } = params;

  try {
    let Codex: any;
    try {
      ({ Codex } = await import("@openai/codex-sdk"));
    } catch (err) {
      throw new Error(
        'Codex SDK not installed. Run "npm install @openai/codex-sdk" to use this tool.'
      );
    }

    const codex = model ? new Codex({ model }) : new Codex();

    let thread: any;
    if (threadId) {
      if (typeof codex.resumeThread !== "function") {
        throw new Error("Codex SDK does not support resumeThread().");
      }
      thread = await codex.resumeThread(threadId);
    } else {
      thread = await codex.startThread();
    }

    const result = await thread.run(prompt);

    let completion = "";
    if (typeof result === "string") {
      completion = result;
    } else if (result && typeof result.final === "string") {
      completion = result.final;
    } else if (result?.final && typeof result.final.text === "string") {
      completion = result.final.text;
    } else {
      completion = JSON.stringify(result);
    }

    const outputThreadId =
      (thread && (thread.id || thread.threadId)) ?? undefined;

    return outputThreadId
      ? { completion, threadId: outputThreadId }
      : { completion };
  } catch (error) {
    throw new Error(
      `Codex SDK error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Run a task using the Claude Code (Claude Agent) SDK
 * Uses Claude Code auth (subscription or API key) from local Claude config
 */
export async function claude_code_sdk(
  params: z.infer<typeof claudeCodeSdkInput>
): Promise<z.infer<typeof claudeCodeSdkOutput>> {
  const { prompt, model, maxTurns, systemPrompt, allowedTools, cwd } = params;

  try {
    let query: any;
    try {
      ({ query } = await import("@anthropic-ai/claude-agent-sdk"));
    } catch (err) {
      try {
        ({ query } = await import("@anthropic-ai/claude-code"));
      } catch (err2) {
        throw new Error(
          'Claude Code SDK not installed. Run "npm install @anthropic-ai/claude-agent-sdk" to use this tool.'
        );
      }
    }

    if (typeof query !== "function") {
      throw new Error("Claude Code SDK query function is not available.");
    }

    const options: Record<string, any> = {};
    if (model) options.model = model;
    if (maxTurns !== undefined) options.maxTurns = maxTurns;
    if (systemPrompt) options.systemPrompt = systemPrompt;
    if (allowedTools) options.allowedTools = allowedTools;
    if (cwd) options.cwd = cwd;

    const abortController = new AbortController();
    const queryArgs: Record<string, any> = { prompt, abortController };
    if (Object.keys(options).length > 0) {
      queryArgs.options = options;
    }

    let finalResult: any = undefined;
    for await (const message of query(queryArgs)) {
      if (message?.type === "result") {
        finalResult = message.result ?? message;
      }
    }

    if (finalResult === undefined) {
      finalResult = "";
    }

    let completion = "";
    if (typeof finalResult === "string") {
      completion = finalResult;
    } else if (finalResult?.text && typeof finalResult.text === "string") {
      completion = finalResult.text;
    } else {
      completion = JSON.stringify(finalResult);
    }

    return { completion };
  } catch (error) {
    throw new Error(
      `Claude Code SDK error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
