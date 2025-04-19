// Configuration values for SmartGPT

export const DEFAULT_MODELS = {
  reasoning: "o4-mini",
  context: "gpt-4.1",
  embedding: "text-embedding-3-small",
};

export const NEO4J_DEFAULTS = {
  url: "bolt://localhost:7687",
  username: "neo4j",
  password: "password",
};

export const MEMORY_DEFAULTS = {
  dbPath: "memory.sqlite",
  decay: 0.7,
  dim: 1536,
};

export const WEB_SEARCH_DEFAULTS = {
  timeout: 10000,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
};
