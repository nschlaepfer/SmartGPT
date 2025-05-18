# SmartGPT

SmartGPT is a TypeScript framework for building AI agents using a dual model pipeline. It can run as a library or as a REST server and integrates directly with the Cursor IDE.

## Features
- Dual reasoning and context models
- ThoughtChain multi-step reasoning
- Web search with content extraction
- Neo4j or in-memory memory store
- Tool system with shell and file access

## Installation
```bash
npm install
```

## Usage
### Library
```typescript
import { SmartGPT } from './src/index.js';
const smart = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY!,
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  deep: true,
});
const answer = await smart.ask('What is quantum computing?');
```

### REST server
```bash
npm run server
```
The server exposes endpoints like `/api/ask` and `/mcp/invoke` on port 4141.

### Cursor IDE
Start SmartGPT in stdio mode and configure Cursor to call it:
```bash
npx tsx smartgpt_mcp_server.ts --stdio
```

See `examples/` for additional demonstrations and `src/README.md` for an overview of the source layout.
