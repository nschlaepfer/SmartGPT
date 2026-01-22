import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.hoisted(() => vi.fn());
const useMock = vi.hoisted(() => vi.fn());
const existsSyncMock = vi.hoisted(() => vi.fn());

vi.mock(
  "@memvid/sdk",
  () => {
    createMock.mockImplementation(async () => ({
      find: vi.fn(async () => ({ hits: [] })),
    }));
    useMock.mockImplementation(async () => ({
      find: vi.fn(async () => ({ hits: [] })),
    }));
    return { create: createMock, use: useMock };
  },
  { virtual: true }
);

vi.mock("fs", () => ({ existsSync: existsSyncMock }));

import { MemvidMemory } from "../src/memory/memvid.js";

describe("MemvidMemory", () => {
  beforeEach(() => {
    createMock?.mockClear();
    useMock?.mockClear();
    existsSyncMock?.mockClear();
  });

  it("opens existing memvid file with adapter", async () => {
    existsSyncMock.mockReturnValue(true);
    await MemvidMemory.open({
      path: "/tmp/memory.mv2",
      adapter: "custom",
    });

    expect(useMock).toHaveBeenCalledWith("custom", "/tmp/memory.mv2");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates memvid file when missing and allowed", async () => {
    existsSyncMock.mockReturnValue(false);
    await MemvidMemory.open({
      path: "/tmp/memory.mv2",
      kind: "basic",
      createIfMissing: true,
    });

    expect(createMock).toHaveBeenCalledWith("/tmp/memory.mv2", "basic");
  });

  it("throws when memvid file missing and createIfMissing is false", async () => {
    existsSyncMock.mockReturnValue(false);

    await expect(
      MemvidMemory.open({
        path: "/tmp/memory.mv2",
        createIfMissing: false,
      })
    ).rejects.toThrow(/Memvid file not found/);
  });

  it("formats memvid hits", async () => {
    const findMock = vi.fn(async () => ({
      hits: [{ title: "Doc", snippet: "Snippet" }],
    }));
    const mem = new (MemvidMemory as any)({ find: findMock }, "auto");
    const results = await mem.find("query", 1, "auto");

    expect(results).toEqual(["TITLE: Doc\nSNIPPET: Snippet"]);
  });
});
