// ============================================================================
// 2025 @nschlaepfer
// (one‑file bundle)
// ---------------------------------------------------------------------------
// External deps (add to package.json):
//   ai, @ai-sdk/openai, @ai-sdk/google, openai, langgraph, neo4j-driver,
//   hnswlib-node, better-sqlite3, zod, uuid, tsx
// ---------------------------------------------------------------------------
// v0.6 (18 Apr 2025)  → **Dual‑model pipeline: o4‑mini ⇢ gpt‑4.1**
//   • o4‑mini → reasoning / fast drafting
//   • gpt‑4.1 (1 M‑token window) → refinement / long‑context work
//   • All public APIs now call BOTH models sequentially unless you override.
//   • Constructor accepts reasoningModel/contextModel overrides.

import { streamText, generateText } from "ai";
import { openai as vercelOpenAI } from "@ai-sdk/openai";
import { google as vercelGoogle } from "@ai-sdk/google";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { z, ZodType } from "zod";
import { HierarchicalNSW } from "hnswlib-node";
import Database from "better-sqlite3";
import neo4j, { Driver } from "neo4j-driver";

/* ---------------------------------------------------------------------- */
/* Provider helpers                                                        */
/* ---------------------------------------------------------------------- */

type ProviderKey = "openai" | "google";
const PROVIDERS = { openai: vercelOpenAI, google: vercelGoogle } as const;
const inferProvider = (m: string): ProviderKey =>
  m.startsWith("gemini") ? "google" : "openai";
const providerFor = (m: string) =>
  inferProvider(m) === "google"
    ? PROVIDERS.google(m, { useSearchGrounding: true })
    : PROVIDERS.openai(m);

/* ---------------------------------------------------------------------- */
/* LLM helpers (dual‑model)                                                */
/* ---------------------------------------------------------------------- */

interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}
const openaiClient = new OpenAI();

async function rawCall(opts: {
  model: string;
  messages: ChatMsg[];
  func?: OpenAI.ChatCompletionCreateParams.Function[];
  schema?: ZodType<any>;
}) {
  if (inferProvider(opts.model) === "openai") {
    // Remove temperature for models that don't support it (like o4-mini)
    const temperature = opts.model.includes("o4-mini") ? undefined : 0.2;

    const resp = await openaiClient.chat.completions.create({
      model: opts.model,
      messages: opts.messages,
      tools: opts.func
        ? opts.func.map((fn) => ({
            type: "function" as const,
            function: fn,
          }))
        : undefined,
      response_format: opts.schema ? { type: "json_object" } : undefined,
      temperature: temperature,
    });
    const content = resp.choices[0].message.content ?? "";
    return opts.schema ? opts.schema.parse(JSON.parse(content)) : content;
  }
  const { text } = await generateText({
    model: providerFor(opts.model),
    messages: opts.messages,
  });
  return text;
}

async function callStructured<T>(
  model: string,
  prompt: string,
  schema: ZodType<T>
) {
  return rawCall({
    model,
    messages: [{ role: "user", content: prompt }],
    schema,
  }) as Promise<T>;
}

/* ---------------------------------------------------------------------- */
/* Embedding + Memory                                                     */
/* ---------------------------------------------------------------------- */

class Embedder {
  private cache = new Map<string, Float32Array>();
  constructor(private model = "text-embedding-3-small") {}
  async embed(text: string) {
    if (this.cache.has(text)) return this.cache.get(text)!;
    const {
      data: [vec],
    } = await openaiClient.embeddings.create({
      model: this.model,
      input: text,
    });
    const arr = new Float32Array(vec.embedding);
    this.cache.set(text, arr);
    return arr;
  }
  async dim() {
    return (await this.embed("probe")).length;
  }
}

const DECAY = 0.7;
class MemoryStore {
  private index: HierarchicalNSW;
  private db: Database.Database;
  private dim: number;
  constructor(dim: number, dbPath = "memory.sqlite") {
    this.dim = dim;
    this.index = new HierarchicalNSW("cosine", dim);
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

/* ---------------------------------------------------------------------- */
/* Retrievers (Neo4j + fallback)                                           */
/* ---------------------------------------------------------------------- */

interface Retriever {
  retrieve(q: string, k?: number): Promise<string[]>;
}

class HippoRetriever implements Retriever {
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

class FallbackRetriever implements Retriever {
  constructor(
    private mem: MemoryStore,
    private embed: (t: string) => Promise<Float32Array>
  ) {}
  async retrieve(q: string, k = 5) {
    return this.mem.search(q, k, this.embed);
  }
}

/* ---------------------------------------------------------------------- */
/* Monte Carlo Tree Search                                                */
/* ---------------------------------------------------------------------- */

interface State {
  hash(): string;
  terminal(): boolean;
}
interface Action {
  label: string;
  apply(s: State): State;
}

type Propose = (s: State, k: number) => Promise<Action[]>;
type Evaluate = (s: State) => Promise<number>;
type Policy = (s: State) => Promise<Action>;

class DeepExplorer {
  private Nsa = new Map<string, number>();
  private Wsa = new Map<string, number>();
  private Ns = new Map<string, number>();
  private key = (s: string, a: string) => `${s}::${a}`;
  private ucb = (s: string, a: string, c = 1.414) => {
    const nSA = this.Nsa.get(this.key(s, a)) ?? 0.1;
    const wSA = this.Wsa.get(this.key(s, a)) ?? 0;
    const nS = this.Ns.get(s) ?? 1;
    return wSA / nSA + c * Math.sqrt(Math.log(nS) / nSA);
  };
  constructor(
    private propose: Propose,
    private evaluate: Evaluate,
    private rollout: Policy
  ) {}

  private back(path: { s: State; a?: Action }[], r: number) {
    for (const { s, a } of path) {
      this.Ns.set(s.hash(), (this.Ns.get(s.hash()) ?? 0) + 1);
      if (a) {
        const k = this.key(s.hash(), a.label);
        this.Nsa.set(k, (this.Nsa.get(k) ?? 0) + 1);
        this.Wsa.set(k, (this.Wsa.get(k) ?? 0) + r);
      }
    }
  }

  private async iter(root: State, maxDepth: number) {
    const path: { s: State; a?: Action }[] = [];
    let s = root;
    for (let d = 0; d < maxDepth; ++d) {
      if (s.terminal()) break;
      const acts = await this.propose(s, 16);
      let a = acts.find((x) => !this.Nsa.has(this.key(s.hash(), x.label)));
      if (!a)
        a = acts.sort(
          (x, y) => this.ucb(s.hash(), y.label) - this.ucb(s.hash(), x.label)
        )[0];
      path.push({ s, a });
      s = a.apply(s);
      if (!this.Ns.has(s.hash())) {
        const r = await this.evaluate(s);
        this.back(path, r);
        return;
      }
    }
    let sr = s,
      depth = path.length;
    while (!sr.terminal() && depth++ < maxDepth)
      sr = (await this.rollout(sr)).apply(sr);
    this.back(path, await this.evaluate(sr));
  }

  async search(root: State, budget = 256, maxDepth = 8) {
    for (let i = 0; i < budget; ++i) await this.iter(root, maxDepth);
    const acts = await this.propose(root, 32);
    const best = acts.sort(
      (a, b) =>
        (this.Nsa.get(this.key(root.hash(), b.label)) ?? 0) -
        (this.Nsa.get(this.key(root.hash(), a.label)) ?? 0)
    )[0];
    return best ? best.apply(root) : root;
  }
}

/* ---------------------------------------------------------------------- */
/* Optional custom function example                                       */
/* ---------------------------------------------------------------------- */

const CalcSchema = z.object({ expression: z.string() });
const calcFn: OpenAI.ChatCompletionCreateParams.Function = {
  name: "calculator",
  description: "Evaluate a math expression and return the numeric result.",
  parameters: {
    type: "object",
    properties: { expression: { type: "string" } },
    required: ["expression"],
  },
};

/* ---------------------------------------------------------------------- */
/* SmartGPT (dual‑model pipeline)                                          */
/* ---------------------------------------------------------------------- */

interface SmartOpts {
  apiKey: string;
  googleApiKey?: string;
  reasoningModel?: string; // default o4-mini
  contextModel?: string; // default gpt-4.1
  embedModel?: string;
  deep?: boolean;
  exploreBudget?: number;
  neo4j?: {
    url?: string;
    username?: string;
    password?: string;
  };
  useNeo4j?: boolean;
}

export class SmartGPT {
  private embedder: Embedder;
  private memory!: MemoryStore;
  private retriever!: Retriever;
  private neo4jAvailable = false;
  private readonly reasoningModel: string;
  private readonly contextModel: string;
  private deepx: DeepExplorer | null = null;

  constructor(private opts: SmartOpts) {
    if (!opts.apiKey) throw new Error("OPENAI_API_KEY required");
    process.env.OPENAI_API_KEY = opts.apiKey;
    if (opts.googleApiKey) process.env.GOOGLE_API_KEY = opts.googleApiKey;

    // Models setup
    this.reasoningModel = opts.reasoningModel ?? "o4-mini";
    this.contextModel = opts.contextModel ?? "gpt-4.1";

    // Initialize embedder first
    this.embedder = new Embedder(opts.embedModel);

    // Initialize memory and retriever asynchronously
    this.initializeAsync();

    // Deep exploration setup (if enabled)
    if (opts.deep) {
      const propose: Propose = async (s, k) => {
        const arr = await callStructured(
          this.reasoningModel,
          `List ${k} next actions as JSON array for state: ${s.hash()}`,
          z.array(z.string())
        );
        return arr.map((lbl) => ({
          label: lbl,
          apply: (st: State) =>
            ({
              ...st,
              hash: () => st.hash() + "|" + lbl,
              terminal: st.terminal,
            } as State),
        }));
      };

      const evaluate: Evaluate = async (s) =>
        parseFloat(
          (await rawCall({
            model: this.reasoningModel,
            messages: [
              { role: "user", content: `Rate 0-1 for state: ${s.hash()}` },
            ],
          })) as string
        );

      const rollout: Policy = async (s) => {
        const acts = await propose(s, 8);
        return acts[Math.floor(Math.random() * acts.length)];
      };

      this.deepx = new DeepExplorer(propose, evaluate, rollout);
    }
  }

  // Separate async initialization to avoid constructor issues
  private async initializeAsync() {
    try {
      const dim = await this.embedder.dim();
      this.memory = new MemoryStore(dim);

      // Setup retriever once memory is initialized
      if (this.opts.useNeo4j !== false && this.opts.neo4j) {
        try {
          const neo4jUrl = this.opts.neo4j.url || "bolt://localhost:7687";
          const neo4jUser = this.opts.neo4j.username || "neo4j";
          const neo4jPass = this.opts.neo4j.password || "password";

          // Create Neo4j driver with explicit encryption settings
          const driver = neo4j.driver(
            neo4jUrl,
            neo4j.auth.basic(neo4jUser, neo4jPass),
            {
              encrypted: false, // Try with explicit 'false' instead of 'ENCRYPTION_OFF'
              trust: "TRUST_ALL_CERTIFICATES",
            }
          );

          // Test connection before proceeding
          await driver.verifyConnectivity();

          this.retriever = new HippoRetriever(driver);
          this.neo4jAvailable = true;
          console.log("[SmartGPT] Neo4j retriever initialized successfully");
        } catch (error) {
          console.warn("[SmartGPT] Failed to initialize Neo4j:", error);
          this.retriever = new FallbackRetriever(this.memory, (t) =>
            this.embedder.embed(t)
          );
          this.neo4jAvailable = false;
        }
      } else {
        // Use fallback if Neo4j is not requested
        this.retriever = new FallbackRetriever(this.memory, (t) =>
          this.embedder.embed(t)
        );
        console.log(
          "[SmartGPT] Using fallback retriever (Neo4j not configured)"
        );
      }
    } catch (error) {
      console.error("[SmartGPT] Error during async initialization:", error);
      // Create default fallback if initialization fails
      this.memory = new MemoryStore(1536); // Default dimension
      this.retriever = new FallbackRetriever(
        this.memory,
        async () => new Float32Array(1536) // Empty embeddings as fallback
      );
    }
  }

  /* ---------------- Dual‑step helper ---------------- */
  private async thinkAndRefine(qSystem: string | null, userMsg: string) {
    // 1️⃣ Draft with reasoningModel (fast reasoning, e.g. o4‑mini)
    const messages: ChatMsg[] = [];
    if (qSystem) {
      messages.push({ role: "system", content: qSystem });
    }
    messages.push({ role: "user", content: userMsg });

    const draft = await rawCall({
      model: this.reasoningModel,
      messages: messages,
    });

    // 2️⃣ Refine / extend with contextModel (e.g. gpt‑4.1 with million‑token window)
    return rawCall({
      model: this.contextModel,
      messages: [
        {
          role: "system",
          content:
            "Refine and expand the answer below using additional context if provided.",
        },
        { role: "user", content: draft as string },
      ],
    });
  }

  /* ---------------- Public API ---------------- */
  async ask(question: string) {
    return this.thinkAndRefine(null, question);
  }

  async search(query: string, k = 5) {
    // Wait for memory to be fully initialized if needed
    if (!this.retriever) {
      console.log("[SmartGPT] Waiting for retriever initialization...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!this.retriever) {
        return [
          `No retriever available for query: "${query}". Please try again in a moment.`,
        ];
      }
    }

    try {
      return await this.retriever.retrieve(query, k);
    } catch (error) {
      console.error(
        "[SmartGPT] Error in retriever, falling back to memory:",
        error
      );
      // If Neo4j retriever fails, create a temporary fallback retriever
      const fallback = new FallbackRetriever(this.memory, (t) =>
        this.embedder.embed(t)
      );
      return fallback.retrieve(query, k);
    }
  }

  async webSearch(query: string, k = 5): Promise<string[]> {
    try {
      // Use the reasoningModel to perform a web search simulation
      // This approach handles the request as a prompt, asking the model to act as if it had searched the web
      const currentDate = new Date().toISOString().split("T")[0];
      const searchResponse = await rawCall({
        model: this.contextModel,
        messages: [
          {
            role: "system",
            content: `You are a web search assistant that simulates search results for the query.
               Today's date is ${currentDate}.
               Return ${k} relevant, informative snippets about the topic as if they were from recent web pages.
               Format each result as: "TITLE: [title]\nSOURCE: [source]\nSNIPPET: [brief factual content]"
               Use different sources and provide recent information.`,
          },
          {
            role: "user",
            content: `Web search: ${query}`,
          },
        ],
      });

      // Split the content into search result snippets
      const content = searchResponse as string;
      if (content) {
        const snippets = content
          .split(/(?=TITLE:)/)
          .filter((s) => s.trim().length > 0);
        return snippets.slice(0, k);
      }

      return [`No search results found for: ${query}`];
    } catch (error) {
      console.error("[SmartGPT] Error in web search:", error);
      return [`Error performing web search: ${(error as Error).message}`];
    }
  }

  async explore(state: State) {
    if (!this.deepx) throw new Error("Deep exploration not enabled");
    return this.deepx.search(state, this.opts.exploreBudget ?? 256);
  }

  async ctx(query: string, k = 8): Promise<string> {
    try {
      const docs = await this.search(query, k);
      return docs.join("\n\n");
    } catch (error) {
      console.error("Error retrieving context:", error);
      return ""; // Empty context when retrieval fails
    }
  }

  async thoughtChain(
    query: string,
    kDrafts = 3, // number of initial answers
    ctxWindow = 8 // memories/docs retrieved
  ): Promise<{
    drafts: string[];
    critiques: string[];
    improved: string[];
    best: string;
  }> {
    // Get context (will be empty if Neo4j is not available)
    const context = (await this.ctx(query, ctxWindow)).trim();
    const sys = context ? `You have the following context:\n\n${context}` : "";

    // Use dual-model pipeline for thoughtChain
    const drafts: string[] = [];
    const critiques: string[] = [];
    const improved: string[] = [];

    // Step 1: Generate drafts using reasoningModel
    for (let i = 0; i < kDrafts; i++) {
      const messages: ChatMsg[] = [];
      if (sys) {
        messages.push({ role: "system", content: sys });
      }
      messages.push({ role: "user", content: query });

      drafts.push(
        (await rawCall({
          model: this.reasoningModel,
          messages: messages,
        })) as string
      );
    }

    // Step 2: Critique using reasoningModel
    for (const draft of drafts) {
      critiques.push(
        (await rawCall({
          model: this.reasoningModel,
          messages: [
            {
              role: "system",
              content:
                "Critique the answer. List flaws, faulty logic, or missing citations in bullet points.",
            },
            { role: "user", content: draft },
          ],
        })) as string
      );
    }

    // Step 3: Improve using contextModel (more powerful)
    for (let i = 0; i < drafts.length; i++) {
      improved.push(
        (await rawCall({
          model: this.contextModel,
          messages: [
            {
              role: "system",
              content:
                "Improve the answer according to the critique. Return the full improved answer with inline citations.",
            },
            {
              role: "user",
              content: `Answer:\n${drafts[i]}\n\nCritique:\n${critiques[i]}`,
            },
          ],
        })) as string
      );
    }

    // Step 4: Pick best answer using reasoningModel
    const panel = improved
      .map((txt, idx) => `Answer ${idx + 1}:\n${txt}`)
      .join("\n\n");

    const bestIdx =
      parseInt(
        (
          (await rawCall({
            model: this.reasoningModel,
            messages: [
              {
                role: "system",
                content:
                  "Select the BEST answer (quality, accuracy, citations). Reply with the answer number only.",
              },
              { role: "user", content: panel },
            ],
          })) as string
        ).match(/\d+/)?.[0] || "1",
        10
      ) - 1;

    return { drafts, critiques, improved, best: improved[bestIdx] };
  }

  isNeo4jAvailable(): boolean {
    return this.neo4jAvailable;
  }
}
