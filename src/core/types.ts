// Core type definitions for SmartGPT

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

export type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
};

export type SearchResult = {
  title: string;
  link: string;
  snippet: string;
};

export type ContentResult = {
  title: string;
  source: string;
  content: string;
} | null;

// State and action types for deep exploration
export interface State {
  hash(): string;
  terminal(): boolean;
}

export interface Action {
  label: string;
  apply(s: State): State;
}

// Deep exploration types
export type Propose = (s: State, k: number) => Promise<Action[]>;
export type Evaluate = (s: State) => Promise<number>;
export type Policy = (s: State) => Promise<Action>;

// SmartGPT options interface
export interface SmartOpts {
  agentProvider?: "codex" | "claude" | "auto";
  codex?: {
    model?: string;
  };
  claude?: {
    model?: string;
    maxTurns?: number;
    systemPrompt?: string;
    allowedTools?: string[];
    cwd?: string;
  };
  reasoningModel?: string;
  contextModel?: string;
  embedDim?: number;
  deep?: boolean;
  exploreBudget?: number;
  serperApiKey?: string;
  memvid?: {
    path: string;
    adapter?: string;
    kind?: string;
    createIfMissing?: boolean;
    mode?: "lex" | "sem" | "auto" | "clip";
  };
  neo4j?: {
    url?: string;
    username?: string;
    password?: string;
  };
  useNeo4j?: boolean;
}

// ThoughtChain result interface
export interface ThoughtChainResult {
  drafts: string[];
  critiques: string[];
  improved: string[];
  best: string;
}
