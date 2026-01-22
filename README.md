# SmartGPT

SmartGPT is a TypeScript framework for building AI agents using a dual model pipeline. It can run as a library or as a REST server and integrates directly with the Cursor IDE.

## Features
- Dual reasoning and context models
- ThoughtChain multi-step reasoning
- Web search with content extraction
- Neo4j or in-memory memory store
- Optional Memvid (.mv2) memory backend
- Tool system with shell and file access
- Codex SDK + Claude Code/Agent SDK for all model calls

## Installation
```bash
npm install
```

## Usage
### Library
```typescript
import { SmartGPT } from './src/index.js';
const smart = new SmartGPT({
  agentProvider: "codex", // or "claude"
  deep: true,
});
const answer = await smart.ask('What is quantum computing?');
```

### REST server
```bash
npm run server
```
The server exposes endpoints like `/api/ask` and `/mcp/invoke` on port 4141.

### Memvid memory backend
Install the SDK:
```bash
npm install @memvid/sdk
```

Configure SmartGPT to use a Memvid .mv2 file for retrieval:
```typescript
import { SmartGPT } from './src/index.js';

const smart = new SmartGPT({
  agentProvider: "codex",
  memvid: {
    path: "./memory.mv2",
    adapter: "basic",
    mode: "auto",
    createIfMissing: true,
  },
});
```

If the file already exists, SmartGPT opens it via the Memvid adapter. If not, it creates it when `createIfMissing` is true.

### SDK tools (Codex + Claude Code)
SmartGPT MCP exposes two additional agent tools:
- `codex_sdk` for the OpenAI Codex SDK
- `claude_code_sdk` for the Claude Code (Claude Agent) SDK

Install the SDKs:
```bash
npm install @openai/codex-sdk @anthropic-ai/claude-agent-sdk
```

Authentication:
- Codex: sign in with your ChatGPT subscription or an OpenAI API key (Codex CLI/IDE login).
- Claude Code: sign in with a Claude subscription or use an Anthropic Console API key.

Model selection:
- Codex models are configured via Codex (or pass `model` to the `codex_sdk` tool). If you omit `reasoningModel`/`contextModel`, SmartGPT lets the Codex SDK choose its default.
- Claude Code supports model aliases and full model names. You can set the model via `/model`, `claude --model`, `ANTHROPIC_MODEL`, or your settings file. If you omit `reasoningModel`/`contextModel`, SmartGPT lets the Claude SDK choose its default.

Note: The Claude Code SDK was renamed to the Claude Agent SDK. This repo uses the new package name but still supports the old one if you have it installed.

### Cursor IDE
Start SmartGPT in stdio mode and configure Cursor to call it:
```bash
npx tsx smartgpt_mcp_server.ts --stdio
```

See `examples/` for additional demonstrations and `src/README.md` for an overview of the source layout.
