import { z } from "zod";

import { ChatMsg } from "../core/types.js";

export type AgentProvider = "codex" | "claude" | "auto";

export interface CodexAgentOptions {
  model?: string;
}

export type ClaudeSystemPrompt =
  | string
  | { type: "preset"; preset: "claude_code"; append?: string };

export interface ClaudeAgentOptions {
  model?: string;
  maxTurns?: number;
  systemPrompt?: ClaudeSystemPrompt;
  allowedTools?: string[];
  cwd?: string;
}

const SCHEMA_INSTRUCTION =
  "Return ONLY valid JSON that conforms to the requested schema.";

export interface RawCallOptions {
  model?: string;
  messages: ChatMsg[];
  func?: any[];
  schema?: z.ZodType<any>;
  temperature?: number;
  maxTokens?: number;
  provider?: AgentProvider;
  codex?: CodexAgentOptions;
  claude?: ClaudeAgentOptions;
}

function buildPrompt(messages: ChatMsg[], schema?: z.ZodType<any>) {
  const parts = messages.map((m) => {
    const role = m.role.toUpperCase();
    return `${role}:\n${m.content}`;
  });

  if (schema) {
    parts.push(`SYSTEM:\n${SCHEMA_INSTRUCTION}`);
  }

  return parts.join("\n\n");
}

function extractSystem(messages: ChatMsg[]) {
  return messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
}

function extractUserPrompt(messages: ChatMsg[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
    .join("\n\n");
}

function resolveProvider(
  model: string | undefined,
  provider?: AgentProvider
): AgentProvider {
  if (provider && provider !== "auto") return provider;
  const envProvider =
    process.env.SMARTGPT_PROVIDER?.toLowerCase() as AgentProvider | undefined;
  if (envProvider && envProvider !== "auto") return envProvider;
  return model?.toLowerCase().includes("claude") ? "claude" : "codex";
}

function appendSchemaInstruction(
  basePrompt: string,
  schema?: z.ZodType<any>
) {
  if (!schema) return basePrompt;
  if (!basePrompt) return SCHEMA_INSTRUCTION;
  return `${basePrompt}\n\n${SCHEMA_INSTRUCTION}`;
}

function appendSchemaToSystemPrompt(
  systemPrompt: ClaudeSystemPrompt | undefined,
  schema?: z.ZodType<any>
): ClaudeSystemPrompt | undefined {
  if (!schema) return systemPrompt;
  if (!systemPrompt) return SCHEMA_INSTRUCTION;
  if (typeof systemPrompt === "string") {
    return appendSchemaInstruction(systemPrompt, schema);
  }
  if (systemPrompt.type === "preset") {
    const append = appendSchemaInstruction(systemPrompt.append ?? "", schema);
    return { ...systemPrompt, append };
  }
  return systemPrompt;
}

async function runCodex(prompt: string, model?: string): Promise<string> {
  let Codex: any;
  try {
    ({ Codex } = await import("@openai/codex-sdk"));
  } catch (error) {
    throw new Error(
      'Codex SDK not installed. Run "npm install @openai/codex-sdk" to use Codex.'
    );
  }

  const codex = model ? new Codex({ model }) : new Codex();
  const thread = await codex.startThread();
  const result = await thread.run(prompt);

  if (typeof result === "string") return result;
  if (result?.final?.text && typeof result.final.text === "string") {
    return result.final.text;
  }
  if (result?.final && typeof result.final === "string") return result.final;
  return JSON.stringify(result);
}

async function runClaude(
  prompt: string,
  options: ClaudeAgentOptions
): Promise<string> {
  let query: any;
  try {
    ({ query } = await import("@anthropic-ai/claude-agent-sdk"));
  } catch (error) {
    try {
      ({ query } = await import("@anthropic-ai/claude-code"));
    } catch (inner) {
      throw new Error(
        'Claude Code SDK not installed. Run "npm install @anthropic-ai/claude-agent-sdk" to use Claude.'
      );
    }
  }

  if (typeof query !== "function") {
    throw new Error("Claude Code SDK query function is not available.");
  }

  const abortController = new AbortController();
  const queryArgs: Record<string, any> = {
    prompt,
    abortController,
  };

  const agentOptions: Record<string, any> = {};
  if (options.model) agentOptions.model = options.model;
  if (options.maxTurns !== undefined) agentOptions.maxTurns = options.maxTurns;
  if (options.systemPrompt) agentOptions.systemPrompt = options.systemPrompt;
  if (options.allowedTools) agentOptions.allowedTools = options.allowedTools;
  if (options.cwd) agentOptions.cwd = options.cwd;
  if (Object.keys(agentOptions).length > 0) {
    queryArgs.options = agentOptions;
  }

  let finalResult: any = undefined;
  for await (const message of query(queryArgs)) {
    if (message?.type === "result") {
      finalResult = message.result ?? message;
    }
  }

  if (typeof finalResult === "string") return finalResult;
  if (finalResult?.text && typeof finalResult.text === "string") {
    return finalResult.text;
  }
  return JSON.stringify(finalResult ?? "");
}

export const rawCall = async (
  options: RawCallOptions
): Promise<string | any> => {
  try {
    const { model, messages, schema, func } = options;

    if (func && func.length > 0) {
      throw new Error("Tool/function calling is not supported with Codex/Claude.");
    }

    const provider = resolveProvider(model, options.provider);
    const prompt = buildPrompt(messages, schema);

    let content = "";
    if (provider === "claude") {
      const systemPrompt = extractSystem(messages);
      const userPrompt = extractUserPrompt(messages);
      const resolvedSystemPrompt = appendSchemaToSystemPrompt(
        options.claude?.systemPrompt ?? systemPrompt,
        schema
      );
      content = await runClaude(userPrompt, {
        model: options.claude?.model ?? model,
        systemPrompt: resolvedSystemPrompt,
        maxTurns: options.claude?.maxTurns ?? 1,
        allowedTools: options.claude?.allowedTools,
        cwd: options.claude?.cwd,
      });
    } else {
      content = await runCodex(prompt, options.codex?.model ?? model);
    }

    return schema ? schema.parse(JSON.parse(content)) : content;
  } catch (e) {
    console.error("Error in rawCall:", e);
    throw e;
  }
};

export const callStructured = async <T>(
  model: string | undefined,
  prompt: string,
  schema: z.ZodType<T>,
  options?: {
    temperature?: number;
    provider?: AgentProvider;
    codex?: CodexAgentOptions;
    claude?: ClaudeAgentOptions;
  }
): Promise<T> => {
  const result = await rawCall({
    model,
    messages: [{ role: "user", content: prompt }],
    schema,
    temperature: options?.temperature,
    provider: options?.provider,
    codex: options?.codex,
    claude: options?.claude,
  });
  return result as T;
};
