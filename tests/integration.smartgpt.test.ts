import { describe, it, expect, vi } from "vitest";

// Avoid native hnswlib dependency during live tests.
vi.mock("../src/memory/memory.js", () => ({
  MemoryStore: class {
    constructor(_dim: number) {}
  },
}));

import { SmartGPT } from "../src/core/smartGPT.js";

const LIVE = process.env.SMARTGPT_LIVE_TEST === "1";
const suite = LIVE ? describe : describe.skip;
const provider =
  (process.env.SMARTGPT_PROVIDER as "codex" | "claude" | "auto") ?? "codex";

suite("SmartGPT (live)", () => {
  it(
    "answers a prompt using real models",
    async () => {
      if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
        return;
      }

      const smart = new SmartGPT({
        agentProvider: provider,
        reasoningModel:
          provider === "claude" ? "claude-3.5-sonnet" : "gpt-5-mini-codex",
        contextModel:
          provider === "claude" ? "claude-3.5-sonnet" : "gpt-5-codex",
      });

      const answer = await smart.ask("Reply with exactly: OK");
      const text = String(answer).trim();

      if (text.startsWith("{")) {
        try {
          const parsed = JSON.parse(text);
          const finalResponse =
            typeof parsed?.finalResponse === "string"
              ? parsed.finalResponse
              : "";
          expect(finalResponse.length).toBeGreaterThan(0);
          return;
        } catch {
          // Fall through to generic checks
        }
      }

      expect(text.length).toBeGreaterThan(0);
    },
    120000
  );

  it(
    "runs a live web search when SERPER_API_KEY is set",
    async () => {
      const serper = process.env.SERPER_API_KEY;
      if (!serper) {
        return;
      }

      if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
        return;
      }

      const smart = new SmartGPT({
        agentProvider: provider,
        serperApiKey: serper,
      });

      const results = await smart.webSearch("OpenAI");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    },
    120000
  );
});
