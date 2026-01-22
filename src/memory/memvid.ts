import { existsSync } from "fs";

export type MemvidMode = "lex" | "sem" | "auto" | "clip";

export interface MemvidOptions {
  path: string;
  adapter?: string;
  kind?: string;
  createIfMissing?: boolean;
  mode?: MemvidMode;
}

type MemvidHit = {
  title?: string;
  snippet?: string;
  text?: string;
  content?: string;
  metadata?: { title?: string };
};

function formatHit(hit: MemvidHit | string): string {
  if (typeof hit === "string") return hit;
  const title = hit.title ?? hit.metadata?.title;
  const snippet = hit.snippet ?? hit.text ?? hit.content;
  if (title && snippet) return `TITLE: ${title}\nSNIPPET: ${snippet}`;
  if (snippet) return snippet;
  return JSON.stringify(hit);
}

export class MemvidMemory {
  private constructor(private mem: any, private defaultMode?: MemvidMode) {}

  static async open(options: MemvidOptions): Promise<MemvidMemory> {
    let sdk: any = null;
    try {
      sdk = await import("@memvid/sdk");
    } catch (error) {
      throw new Error(
        'Memvid SDK not installed. Run "npm install @memvid/sdk" to use Memvid memory.'
      );
    }

    const { create, use } = sdk;
    const adapter = options.adapter ?? options.kind ?? "basic";
    const kind = options.kind ?? "basic";
    const exists = existsSync(options.path);

    if (exists) {
      const mem = await use(adapter, options.path);
      return new MemvidMemory(mem, options.mode);
    }

    if (options.createIfMissing === false) {
      throw new Error(`Memvid file not found: ${options.path}`);
    }

    const mem = await create(options.path, kind);
    return new MemvidMemory(mem, options.mode);
  }

  async find(query: string, k = 5, mode?: MemvidMode): Promise<string[]> {
    const results = await this.mem.find(query, {
      k,
      mode: mode ?? this.defaultMode,
    });

    const hits = Array.isArray(results?.hits) ? results.hits : results;
    if (!Array.isArray(hits)) return [];

    return hits.map((hit: MemvidHit | string) => formatHit(hit));
  }

  async seal(): Promise<void> {
    if (typeof this.mem?.seal === "function") {
      await this.mem.seal();
    }
  }
}
