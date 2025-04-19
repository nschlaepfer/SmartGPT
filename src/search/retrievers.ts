import neo4j, { Driver } from "neo4j-driver";
import { MemoryStore } from "../memory/memory.js";

export interface Retriever {
  retrieve(q: string, k?: number): Promise<string[]>;
}

export class HippoRetriever implements Retriever {
  constructor(private driver: Driver) {}
  async retrieve(q: string, k = 5) {
    const ses = this.driver.session();
    const res = await ses.run(
      `MATCH (node:Document)
       WHERE node.content CONTAINS $q OR node.title CONTAINS $q
       RETURN node.content AS c LIMIT $k`,
      { q, k: neo4j.int(k) }
    );
    await ses.close();
    return res.records.map((r) => r.get("c"));
  }
}

export class FallbackRetriever implements Retriever {
  constructor(
    private mem: MemoryStore,
    private embed: (t: string) => Promise<Float32Array>
  ) {}
  async retrieve(q: string, k = 5) {
    return this.mem.search(q, k, this.embed);
  }
}
