import { MemvidMemory, MemvidMode } from "../memory/memvid.js";
import type { Retriever } from "./retrievers.js";

export class MemvidRetriever implements Retriever {
  constructor(
    private memvid: MemvidMemory,
    private mode?: MemvidMode
  ) {}

  async retrieve(query: string, k = 5): Promise<string[]> {
    return this.memvid.find(query, k, this.mode);
  }
}
