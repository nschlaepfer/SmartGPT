import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let codexRunMock: any;
let codexStartThreadMock: any;
let codexResumeThreadMock: any;
let claudeQueryArgs: any;

vi.mock("@openai/codex-sdk", () => {
  codexRunMock = vi.fn(async () => ({ final: "codex-ok" }));
  codexStartThreadMock = vi.fn(async () => ({
    run: codexRunMock,
    id: "thread-new",
  }));
  codexResumeThreadMock = vi.fn(async (threadId: string) => ({
    run: codexRunMock,
    id: threadId,
  }));

  class Codex {
    constructor(_opts?: any) {}
    startThread = codexStartThreadMock;
    resumeThread = codexResumeThreadMock;
  }

  return { Codex };
});

vi.mock(
  "@anthropic-ai/claude-agent-sdk",
  () => {
    async function* query(args: any) {
      claudeQueryArgs = args;
      yield { type: "result", result: { text: "claude-code-ok" } };
    }

    return { query };
  },
  { virtual: true }
);

async function importModels() {
  return await import("../src/tools/models.js");
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("tools/models", () => {
  it("codex_sdk returns completion and thread id", async () => {
    const { codex_sdk } = await importModels();
    const result = await codex_sdk({ prompt: "hi" });

    expect(result.completion).toBe("codex-ok");
    expect(result.threadId).toBe("thread-new");
    expect(codexStartThreadMock).toHaveBeenCalled();
  });

  it("codex_sdk can resume a thread", async () => {
    const { codex_sdk } = await importModels();
    const result = await codex_sdk({ prompt: "hi", threadId: "thread-123" });

    expect(result.completion).toBe("codex-ok");
    expect(result.threadId).toBe("thread-123");
    expect(codexResumeThreadMock).toHaveBeenCalledWith("thread-123");
  });

  it("claude_code_sdk returns completion", async () => {
    const { claude_code_sdk } = await importModels();
    const result = await claude_code_sdk({
      prompt: "hi",
      model: "claude-sonnet",
      maxTurns: 2,
    });

    expect(result.completion).toBe("claude-code-ok");
    expect(claudeQueryArgs).toMatchObject({
      prompt: "hi",
      options: expect.objectContaining({
        model: "claude-sonnet",
        maxTurns: 2,
      }),
    });
  });
});
