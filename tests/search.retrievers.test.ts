import { describe, it, expect, vi } from "vitest";
import { FallbackRetriever, HippoRetriever } from "../src/search/retrievers.js";

describe("Retrievers", () => {
  it("FallbackRetriever delegates to memory search", async () => {
    const searchMock = vi.fn(async () => ["doc1", "doc2"]);
    const mem = { search: searchMock };
    const embed = vi.fn(async () => new Float32Array([0]));

    const retriever = new FallbackRetriever(mem as any, embed);
    const results = await retriever.retrieve("query", 2);

    expect(results).toEqual(["doc1", "doc2"]);
    expect(searchMock).toHaveBeenCalledWith("query", 2, embed);
  });

  it("HippoRetriever returns document content from Neo4j results", async () => {
    const driver = {
      session: () => ({
        run: async () => ({
          records: [{ get: () => "content-1" }, { get: () => "content-2" }],
        }),
        close: async () => {},
      }),
    };

    const retriever = new HippoRetriever(driver as any);
    const results = await retriever.retrieve("query", 2);

    expect(results).toEqual(["content-1", "content-2"]);
  });
});
