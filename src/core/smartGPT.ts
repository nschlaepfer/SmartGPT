// SmartGPT - Main class that integrates all components
import { ChatMsg, SmartOpts, State } from "./types.js";
import { Embedder } from "../models/embedder.js";
import { MemoryStore } from "../memory/memory.js";
import { MemvidMemory } from "../memory/memvid.js";
import {
  Retriever,
  HippoRetriever,
  FallbackRetriever,
} from "../search/retrievers.js";
import { MemvidRetriever } from "../search/memvidRetriever.js";
import { DeepExplorer } from "../search/deepExplorer.js";
import { rawCall, callStructured } from "../models/llm.js";
import neo4j, { Driver } from "neo4j-driver";
import { z } from "zod";

// Dynamically import node-fetch when needed
type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
};

type SearchResult = {
  title: string;
  link: string;
  snippet: string;
};

type ContentResult = {
  title: string;
  source: string;
  content: string;
} | null;

export class SmartGPT {
  private embedder: Embedder;
  private memory!: MemoryStore;
  private retriever!: Retriever;
  private neo4jAvailable = false;
  private readonly reasoningModel: string | undefined;
  private readonly contextModel: string | undefined;
  private deepx: DeepExplorer | null = null;
  private memvid: MemvidMemory | null = null;
  private readonly agentProvider: SmartOpts["agentProvider"];
  private readonly codexOptions: SmartOpts["codex"];
  private readonly claudeOptions: SmartOpts["claude"];

  constructor(private opts: SmartOpts) {
    if (opts.serperApiKey) process.env.SERPER_API_KEY = opts.serperApiKey;

    // Models setup
    this.agentProvider = opts.agentProvider ?? "codex";
    const providerDefaultModel =
      this.agentProvider === "claude"
        ? opts.claude?.model
        : this.agentProvider === "codex"
          ? opts.codex?.model
          : opts.codex?.model ?? opts.claude?.model;
    this.reasoningModel = opts.reasoningModel ?? providerDefaultModel;
    this.contextModel = opts.contextModel ?? providerDefaultModel;
    this.codexOptions = opts.codex;
    this.claudeOptions = opts.claude;

    // Initialize embedder first
    this.embedder = new Embedder(opts.embedDim ?? 384);

    // Initialize memory and retriever asynchronously
    this.initializeAsync();

    // Deep exploration setup (if enabled)
    if (opts.deep) {
      const propose = async (s: State, k: number) => {
        const arr = await callStructured(
          this.reasoningModel,
          `List ${k} next actions as JSON array for state: ${s.hash()}`,
          z.array(z.string()),
          {
            provider: this.agentProvider,
            codex: this.codexOptions,
            claude: this.claudeOptions,
          }
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

      const evaluate = async (s: State) =>
        parseFloat(
          (await rawCall({
            model: this.reasoningModel,
            messages: [
              { role: "user", content: `Rate 0-1 for state: ${s.hash()}` },
            ],
            provider: this.agentProvider,
            codex: this.codexOptions,
            claude: this.claudeOptions,
          })) as string
        );

      const rollout = async (s: State) => {
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

      let retrieverReady = false;

      if (this.opts.memvid) {
        try {
          this.memvid = await MemvidMemory.open(this.opts.memvid);
          this.retriever = new MemvidRetriever(
            this.memvid,
            this.opts.memvid.mode
          );
          console.log("[SmartGPT] Memvid retriever initialized successfully");
          retrieverReady = true;
        } catch (error) {
          console.warn("[SmartGPT] Failed to initialize Memvid:", error);
        }
      }

      // Setup retriever once memory is initialized
      if (!retrieverReady && this.opts.useNeo4j !== false && this.opts.neo4j) {
        try {
          const neo4jUrl = this.opts.neo4j.url || "bolt://localhost:7687";
          const neo4jUser = this.opts.neo4j.username || "neo4j";
          const neo4jPass = this.opts.neo4j.password || "password";

          // Create Neo4j driver with explicit encryption settings
          const driver = neo4j.driver(
            neo4jUrl,
            neo4j.auth.basic(neo4jUser, neo4jPass),
            {
              encrypted: false,
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
      } else if (!retrieverReady) {
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
      provider: this.agentProvider,
      codex: this.codexOptions,
      claude: this.claudeOptions,
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
      provider: this.agentProvider,
      codex: this.codexOptions,
      claude: this.claudeOptions,
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
      // Dynamically import node-fetch
      const { default: fetch } = await import("node-fetch");

      // Step 1: Fetch real search results from Serper API
      const serperApiKey = process.env.SERPER_API_KEY;
      if (!serperApiKey) {
        console.warn(
          "[SmartGPT] Serper API key not found, using fallback method"
        );
        return this.simulateWebSearch(query, k);
      }

      console.log(`[SmartGPT] Performing web search for: "${query}"`);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const searchResponse = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: query,
            num: Math.min(k * 2, 10), // Request more results than needed
          }),
          signal: controller.signal,
        });

        // Clear timeout
        clearTimeout(timeoutId);

        if (!searchResponse.ok) {
          throw new Error(
            `Serper API responded with status: ${searchResponse.status}`
          );
        }

        const searchData = (await searchResponse.json()) as {
          organic?: SearchResult[];
        };

        // Step 2: Extract and format search results
        const organicResults = searchData.organic || [];
        if (!organicResults.length) {
          return [`No search results found for: ${query}`];
        }

        // Format initial results
        const formattedResults = organicResults
          .slice(0, k)
          .map((result: SearchResult) => {
            return `TITLE: ${result.title}\nSOURCE: ${result.link}\nSNIPPET: ${result.snippet}`;
          });

        // Step 3: Fetch content from top results
        const contentResults = await Promise.all(
          organicResults
            .slice(0, 3)
            .map(async (result: SearchResult): Promise<ContentResult> => {
              try {
                // Create AbortController for timeout
                const pageController = new AbortController();
                const pageTimeoutId = setTimeout(
                  () => pageController.abort(),
                  5000
                );

                // Fetch page content
                const response = await fetch(result.link, {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
                  },
                  signal: pageController.signal,
                });

                // Clear timeout
                clearTimeout(pageTimeoutId);

                if (!response.ok) {
                  return null;
                }

                const html = await response.text();

                // Extract main content using GPT-4.1
                const content = await rawCall({
                  model: this.contextModel,
                  messages: [
                    {
                      role: "system",
                      content: `Extract and summarize the main content from this HTML. Focus on the main article/content,
                              ignoring navigation, footers, ads, etc. If the content is relevant to "${query}",
                              provide a detailed summary of the key information. Return the content in plain text format.`,
                    },
                    {
                      role: "user",
                      content: html.slice(0, 100000), // Limit initial HTML
                    },
                  ],
                  provider: this.agentProvider,
                  codex: this.codexOptions,
                  claude: this.claudeOptions,
                });

                return {
                  title: result.title,
                  source: result.link,
                  content: content as string,
                };
              } catch (error) {
                console.warn(
                  `[SmartGPT] Error fetching content from ${result.link}:`,
                  error
                );
                return null;
              }
            })
        );

        // Step 4: Combine search results with extracted content
        const enhancedResults = contentResults
          .filter(
            (
              result
            ): result is ContentResult & {
              title: string;
              source: string;
              content: string;
            } => result !== null
          )
          .map((result) => {
            return `TITLE: ${result.title}\nSOURCE: ${result.source}\nCONTENT:\n${result.content}`;
          });

        // Step 5: Return enhanced or formatted results
        return enhancedResults.length > 0 ? enhancedResults : formattedResults;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("[SmartGPT] Error in web search:", error);
      // Fallback to simulated search
      console.log("[SmartGPT] Falling back to simulated search due to error");
      return this.simulateWebSearch(query, k);
    }
  }

  // Keep the simulation method as a fallback
  private async simulateWebSearch(query: string, k = 5): Promise<string[]> {
    try {
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
        provider: this.agentProvider,
        codex: this.codexOptions,
        claude: this.claudeOptions,
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
      console.error("[SmartGPT] Error in simulated web search:", error);
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
          provider: this.agentProvider,
          codex: this.codexOptions,
          claude: this.claudeOptions,
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
          provider: this.agentProvider,
          codex: this.codexOptions,
          claude: this.claudeOptions,
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
          provider: this.agentProvider,
          codex: this.codexOptions,
          claude: this.claudeOptions,
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
            provider: this.agentProvider,
            codex: this.codexOptions,
            claude: this.claudeOptions,
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
