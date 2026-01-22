import { describe, it, expect, vi } from "vitest";

const memvidFindMock = vi.hoisted(() => vi.fn(async () => ["memvid-hit"]));

vi.mock("../src/models/embedder.js", () => ({
  Embedder: class {
    constructor(_model?: string) {}
    async dim() {
      return 1;
    }
    async embed(_text: string) {
      return new Float32Array([0]);
    }
  },
}));

vi.mock("../src/memory/memory.js", () => ({
  MemoryStore: class {
    constructor(_dim: number) {}
  },
}));

vi.mock("../src/memory/memvid.js", () => {
  class MemvidMemory {
    static open = vi.fn(async () => new MemvidMemory());
    find = memvidFindMock;
  }
  return { MemvidMemory };
});

import { SmartGPT } from "../src/core/smartGPT.js";

describe("SmartGPT", () => {
  it("uses Memvid retriever when configured", async () => {
    const smart = new SmartGPT({
      memvid: { path: "/tmp/memory.mv2", mode: "auto" },
    });

    await (smart as any).initializeAsync();
    const results = await smart.search("hello", 2);

    expect(results).toEqual(["memvid-hit"]);
    expect(memvidFindMock).toHaveBeenCalledWith("hello", 2, "auto");
  });
});
