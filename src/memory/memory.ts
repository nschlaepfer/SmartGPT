import hnswlib from "hnswlib-node";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const DECAY = 0.7;

export class MemoryStore {
  private index: InstanceType<typeof hnswlib.HierarchicalNSW>;
  private db: Database.Database;
  private dim: number;
  constructor(dim: number, dbPath = "memory.sqlite") {
    this.dim = dim;
    this.index = new hnswlib.HierarchicalNSW("cosine", dim);
    this.index.initIndex(16_384, 16, 200, 100);
    this.db = new Database(dbPath);
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY, vec BLOB, content TEXT, created INT, accessed INT)`
    );
  }
  private score(r: { created: number; accessed: number }) {
    return DECAY * r.accessed + (1 - DECAY) * r.created;
  }
  async add(t: string, embed: (x: string) => Promise<Float32Array>) {
    const vec = await embed(t);
    if (vec.length !== this.dim) throw new Error("dim mismatch");
    this.index.addPoint(Array.from(vec), this.index.getCurrentCount());
    const now = Date.now();
    this.db
      .prepare(`INSERT INTO memories VALUES (?,?,?,?,?)`)
      .run(uuidv4(), Buffer.from(vec.buffer), t, now, now);
  }
  async search(
    q: string,
    k: number,
    embed: (x: string) => Promise<Float32Array>
  ) {
    const qv = await embed(q);
    const { neighbors } = this.index.searchKnn(
      Array.from(qv),
      Math.min(k * 4, 256)
    );
    if (!neighbors.length) return [];
    const rows = this.db
      .prepare(
        `SELECT content, created, accessed FROM memories WHERE rowid IN (${neighbors
          .map(() => "?")
          .join(",")})`
      )
      .all(...neighbors);
    return rows
      .map((r: any) => ({ c: r.content, s: this.score(r) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map((r) => r.c);
  }
}
