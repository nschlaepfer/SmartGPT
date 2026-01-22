import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let fetchMock: any;
vi.mock("node-fetch", () => {
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      organic: [
        {
          title: "Result 1",
          link: "https://example.com/1",
          snippet: "Snippet 1",
          source: "example.com",
        },
      ],
    }),
  }));
  return { default: fetchMock };
});

async function importWebSearch() {
  return await import("../src/tools/web_search.js");
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("web_search", () => {
  it("returns formatted search results", async () => {
    process.env.SERPER_API_KEY = "test-serper";
    const { web_search } = await importWebSearch();
    const result = await web_search({ query: "hello", numResults: 1 });

    expect(result.results).toEqual([
      {
        title: "Result 1",
        link: "https://example.com/1",
        snippet: "Snippet 1",
        source: "example.com",
      },
    ]);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws when SERPER_API_KEY is missing", async () => {
    delete process.env.SERPER_API_KEY;
    const { web_search } = await importWebSearch();
    await expect(web_search({ query: "hello" })).rejects.toThrow(
      /SERPER_API_KEY/
    );
  });
});
