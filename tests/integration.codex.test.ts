import { describe, it, expect } from "vitest";
import { Codex } from "@openai/codex-sdk";

const LIVE = process.env.CODEX_LIVE_TEST === "1";
const suite = LIVE ? describe : describe.skip;

suite("Codex SDK (live)", () => {
  it(
    "runs a real Codex prompt using existing CLI login",
    async () => {
      const codex = new Codex();
      const thread = await codex.startThread();
      const result = await thread.run("Reply with exactly: OK");

      const text =
        typeof result === "string"
          ? result
          : (result as any)?.final?.text ??
            (result as any)?.final ??
            JSON.stringify(result);

      expect(text).toContain("OK");
    },
    120000
  );
});
