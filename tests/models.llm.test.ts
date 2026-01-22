import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

const codexRunMock = vi.hoisted(() => vi.fn(async () => ({ final: "codex-ok" })));
const codexStartMock = vi.hoisted(() =>
  vi.fn(async () => ({ run: codexRunMock }))
);

vi.mock(
  "@openai/codex-sdk",
  () => {
    class Codex {
      startThread = codexStartMock;
    }
    return { Codex };
  },
  { virtual: true }
);

const claudeQueryMock = vi.hoisted(
  () =>
    async function* query() {
      yield { type: "result", result: { text: "claude-ok" } };
    }
);

vi.mock(
  "@anthropic-ai/claude-agent-sdk",
  () => ({ query: claudeQueryMock }),
  { virtual: true }
);

import { rawCall } from "../src/models/llm.js";

describe("rawCall", () => {
  it("uses Codex by default and parses schema JSON", async () => {
    codexRunMock.mockResolvedValueOnce({ final: '{"ok":"yes"}' });
    const schema = z.object({ ok: z.string() });

    const result = await rawCall({
      model: "gpt-4.1",
      messages: [{ role: "user", content: "hi" }],
      schema,
    });

    expect(result).toEqual({ ok: "yes" });
    expect(codexStartMock).toHaveBeenCalled();
  });

  it("uses Claude when model indicates claude", async () => {
    const result = await rawCall({
      model: "claude-3.5-sonnet",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(result).toBe("claude-ok");
  });
});
