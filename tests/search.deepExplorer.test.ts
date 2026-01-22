import { describe, it, expect } from "vitest";
import { DeepExplorer } from "../src/search/deepExplorer.js";

describe("DeepExplorer", () => {
  it("returns a progressed state when actions are available", async () => {
    const root = {
      hash: () => "root",
      terminal: () => false,
    };

    const propose = async (_s: any, _k: number) => [
      {
        label: "a1",
        apply: (_st: any) => ({
          hash: () => "root|a1",
          terminal: () => true,
        }),
      },
    ];

    const evaluate = async (_s: any) => 1;
    const rollout = async (s: any) => ({
      label: "r1",
      apply: (_st: any) => s,
    });

    const explorer = new DeepExplorer(propose, evaluate, rollout);
    const next = await explorer.search(root as any, 4, 2);

    expect(next.hash()).toBe("root|a1");
  });
});
