import { describe, it, expect } from "vitest";

import { Embedder } from "../src/models/embedder.js";

describe("Embedder", () => {
  it("caches embeddings for repeated inputs", async () => {
    const embedder = new Embedder("test-embed");
    const first = await embedder.embed("hello");
    const second = await embedder.embed("hello");

    expect(first).toBeInstanceOf(Float32Array);
    expect(second).toBe(first);
  });

  it("returns dimension via probe", async () => {
    const embedder = new Embedder(128);
    const dim = await embedder.dim();
    expect(dim).toBe(128);
  });
});
