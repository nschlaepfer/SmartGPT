[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/nschlaepfer-smartgpt-badge.png)](https://mseep.ai/app/nschlaepfer-smartgpt)

# SmartGPT

A TypeScript library for building advanced AI applications with multiple LLM providers, featuring a dual-model pipeline that combines fast reasoning and deep context processing. SmartGPT can be used as a library or as a complete REST API server through its MCP (Model Context Protocol) interface.

## Key Features

* **Dual-Model AI Pipeline**: Combines fast reasoning and deep context models for optimal results
* **REST API Server**: Full system control through comprehensive HTTP endpoints (MCP Server)
* **Cursor Integration**: Direct integration with Cursor IDE through MCP stdio mode
* **Multi-Provider Support**: OpenAI, Google AI, Anthropic, and Groq models
* **Advanced Reasoning**: ThoughtChain for multi-step reasoning with self-critique
* **Tool Integration**: Secure shell execution, file parsing, and web search tools
* **Knowledge Management**: Memory store with Neo4j or fallback retrieval

## How It Works

SmartGPT uses a sophisticated dual-model pipeline architecture that leverages the strengths of different language models:

1. **Dual-Model Processing**:
   * Uses a fast reasoning model (like o4-mini) for initial draft generation
   * Uses a powerful context model (like gpt-4.1 with 1M token window) for refinement and exploration
   * All public APIs automatically call BOTH models sequentially unless overridden

2. **Memory and Context**:
   * Embeds and stores previous interactions in a vector database
   * Supports Neo4j knowledge graph for advanced retrieval
   * Falls back to in-memory store when Neo4j is unavailable

3. **Advanced Reasoning**:
   * ThoughtChain implements a multi-step reasoning process to produce higher-quality answers
   * Monte Carlo Tree Search (MCTS) enables exploration of complex solution spaces

4. **Real-time Integration**:
   * Web search capability accesses real-time information via Serper API
   * HTML content extraction to distill useful information from search results

5. **Modular Architecture**:
   * Organized into specialized components for better maintainability
   * Flexible provider system supporting both OpenAI and Google AI models

## Usage Options

SmartGPT can be used in three main ways:

### 1. As a TypeScript Library

Import and use SmartGPT in your Node.js applications:

```typescript
import { SmartGPT } from './smartGPT.js';

const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || '',
  // Optional config
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  model: "gpt-4.1",
  deep: true,
  serperApiKey: process.env.SERPER_API_KEY, // For web search
});

// Basic question answering
const answer = await smartGPT.ask('What is quantum computing?');
```

### 2. As a REST API Server (MCP HTTP Mode)

Run SmartGPT as a standalone server exposing all functionality through REST API endpoints:

```bash
# Start the MCP server in HTTP mode
npm run server
# or
npx tsx smartgpt_mcp_server_stdio.ts
```

This starts a server on port 4141 with comprehensive endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | System information and documentation |
| `/api/readme` | GET | Full README documentation (formats: json, html, markdown) |
| `/api/system` | GET | Detailed system status and configuration |
| `/mcp/manifest` | GET | List all available tools and their parameters |
| `/mcp/invoke` | POST | Execute a specific tool with provided input |
| `/api/ask` | POST | Use dual-model pipeline for questions |
| `/api/thoughtchain` | POST | Multi-step reasoning with refinement |
| `/api/websearch` | POST | Search the web for real-time information |

### 3. As a Cursor IDE Extension (MCP STDIO Mode)

Run SmartGPT as an MCP server in stdio mode for direct integration with the Cursor IDE:

```bash
# Start the MCP server in stdio mode
npx tsx smartgpt_mcp_server_stdio.ts --stdio
```

Or configure it in your Cursor MCP settings in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "smartgpt": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "<path_to_script>/smartgpt_mcp_server_stdio.ts",
        "--stdio"
      ],
      "description": "SmartGPT dual-model AI pipeline with comprehensive toolchain",
      "disabled": false,
      "category": "ai-reasoning",
      "autoApprove": ["ask", "thoughtchain", "websearch"],
      "startup": "auto"
    }
  }
}
```

This allows you to use SmartGPT's powerful tools directly within Cursor, including:

* The dual-model `ask` tool for enhanced reasoning
* The `thoughtchain` tool for complex multi-step reasoning
* The `websearch` tool for real-time internet information
* All other utility tools for shell commands, file parsing, etc.

## Detailed Features

* Support for OpenAI and Google AI models
* Memory store for context retention
* Neo4j-based knowledge retrieval (Hippo-style)
* Monte Carlo Tree Search for deep exploration
* Structured output with Zod schemas
* ThoughtChain - multi-step reasoning pipeline for improved answers
* Real-time web search integration with Serper API
* Modular architecture for better maintainability
* Secure macOS sandboxed shell execution (with automatic fallback to regular execution)
* Multi-provider AI model tools (OpenAI, Anthropic, Google Gemini, Groq)
* File parsing tools for CSV, JSON, Markdown, and PDF files
* MCP Server for exposing tools via REST API

## Requirements

* Node.js 18+
* OpenAI API key
* (Optional) Google AI API key
* (Optional) Neo4j database for knowledge retrieval
* (Optional) Serper API key for real web search functionality

## Installation

```bash
npm install
```

## Dependencies

The project depends on several packages:

```bash
npm install node-fetch hnswlib-node better-sqlite3 uuid zod @ai-sdk/openai @ai-sdk/google neo4j-driver
```

Additional dependencies for the new toolchain:

```bash
npm install @anthropic-ai/sdk @google/generative-ai groq-sdk pdf-parse express debug
```

## Configuration

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your-openai-api-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key (optional)
SERPER_API_KEY=your-serper-api-key (optional, for web search)
ANTHROPIC_API_KEY=your-anthropic-api-key (optional)
GROQ_API_KEY=your-groq-api-key (optional)
```

## Architecture

SmartGPT has been refactored into a modular architecture:

* `types.ts` - Core type definitions
* `providers.ts` - Provider utilities for OpenAI and Google
* `llm.ts` - Language model interaction
* `embedder.ts` - Text embedding functionality
* `memory.ts` - Memory storage and retrieval
* `retrievers.ts` - Neo4j and fallback retrieval systems
* `deepExplorer.ts` - Monte Carlo Tree Search implementation
* `prompts.json` - Static prompts for various functions
* `smartGPT.ts` - Main class that integrates all components
* `smartgpt_mcp_server.ts` - REST API server exposing all functionality

## Library Usage Examples

### ThoughtChain

The ThoughtChain feature implements a chain-of-thought reasoning pattern:

1. **Drafter**: Generates multiple candidate answers
2. **Researcher**: Critiques each draft for logic holes & missing citations
3. **Resolver**: Produces improved answers based on critiques
4. **Judge**: Selects the best improved answer

This approach helps produce more accurate and well-reasoned responses, especially for complex topics.

```typescript
const result = await smartGPT.thoughtChain(
  "Explain HippoRAG in plain English",
  3  // number of drafts
);
console.log(result.best);
```

### Web Search

The built-in web search functionality uses the Serper API to perform real-time internet searches:

```typescript
// Example of web search
const searchResult = await smartGPT.webSearch('What are the latest developments in large language models?');
```

If a Serper API key is not provided, the system will fall back to simulated search results.

### Secure Shell Execution

The toolchain includes a macOS shell command execution tool with a sandbox fallback mechanism:

```typescript
import { macos_shell } from './smartGPT.js';

// Execute a command (will try sandbox first, then fallback to regular execution)
const result = await macos_shell({ command: 'ls -la' });
console.log(`Exit code: ${result.exitCode}`);
console.log(`Output: ${result.stdout}`);
```

The sandbox attempts to use Apple's Seatbelt technology to:

* Deny all operations by default
* Import BSD system profile for basic functionality
* Allow writes only to working directory and temporary folders
* Block all network access

If sandbox execution fails (due to macOS permissions), it automatically falls back to regular command execution with a warning message.

**Note:** To use the full sandbox functionality on modern macOS versions, you would need to create a properly signed helper app with appropriate entitlements. The current implementation provides a security warning when it falls back to unsandboxed execution.

### Multi-Provider AI Integration

The toolchain supports multiple AI providers:

```typescript
import {
  openai_completion,
  anthropic_completion,
  google_gemini,
  groq_completion
} from './smartGPT.js';

// OpenAI
const openaiResult = await openai_completion({
  prompt: "What is the capital of France?",
  model: "gpt-4.1" // optional, defaults to "gpt-4.1"
});

// Anthropic Claude
const claudeResult = await anthropic_completion({
  prompt: "Explain quantum computing",
  model: "claude-3-7-sonnet-latest" //
});

// Google Gemini
const geminiResult = await google_gemini({
  prompt: "Write a poem about AI",
  model: "gemini-2.5-pro" // optional, defaults to "gemini-2.5pro"
});

// Groq (Llama 4, etc)
const groqResult = await groq_completion({
  prompt: "Summarize the history of AI",
  model: "llama-3.3-70b-versatile" // optional, defaults to
});
```

### File Parsing Tools

Parse and extract content from various file formats:

```typescript
import {
  read_csv,
  read_json,
  read_markdown,
  read_pdf
} from './smartGPT.js';

// Read a CSV file as structured data
const csvData = await read_csv({ filePath: 'data.csv' });

// Parse a JSON file
const jsonData = await read_json({ filePath: 'config.json' });

// Read a Markdown file
const markdownContent = await read_markdown({ filePath: 'README.md' });

// Extract text from a PDF
const pdfText = await read_pdf({ filePath: 'document.pdf' });
```

## MCP Server (REST API and Cursor Integration)

The SmartGPT MCP server exposes all functionality through two modes of operation:

### HTTP Mode

The HTTP mode provides a REST API, making it ideal for:

* Building web applications with AI capabilities
* Creating chat interfaces backed by powerful reasoning
* Integrating with other programming languages through HTTP
* Centralized AI service for multiple client applications

#### Starting the HTTP Server

```bash
npm run server
# or
npx tsx smartgpt_mcp_server_stdio.ts
```

This starts an Express server on port 4141 that provides comprehensive endpoints:

```
🧠 SmartGPT MCP running at http://localhost:4141
Available endpoints:
  GET  /                  - System information and documentation
  GET  /api/readme        - Full README documentation (formats: json, html, markdown)
  GET  /api/system        - Detailed system status and configuration
  GET  /mcp/manifest      - List all available tools
  GET  /sse               - Server-Sent Events endpoint for Cursor MCP integration
  POST /mcp/invoke        - Execute a specific tool
  POST /api/ask           - Use dual-model pipeline for questions
  POST /api/thoughtchain  - Multi-step reasoning with refinement
  POST /api/websearch     - Search the web for real-time information
```

#### API Usage Examples

**Get system information:**

```bash
curl http://localhost:4141/api/system
```

**Get README documentation (in HTML format):**

```bash
curl http://localhost:4141/api/readme?format=html > documentation.html
```

**List all available tools:**

```bash
curl http://localhost:4141/mcp/manifest
```

**Ask a question using the dual-model pipeline:**

```bash
curl -X POST http://localhost:4141/api/ask \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the significance of quantum computing for cryptography?"}'
```

**Use ThoughtChain for complex reasoning:**

```bash
curl -X POST http://localhost:4141/api/thoughtchain \
  -H "Content-Type: application/json" \
  -d '{"query":"Explain how large language models might impact education", "drafts": 3}'
```

**Search the web for real-time information:**

```bash
curl -X POST http://localhost:4141/api/websearch \
  -H "Content-Type: application/json" \
  -d '{"query":"latest developments in quantum computing 2025"}'
```

**Call OpenAI directly:**

```bash
curl -X POST http://localhost:4141/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool":"openai_completion","input":{"prompt":"Explain LLM tokenization in simple terms"}}'
```

**Execute a shell command:**

```bash
curl -X POST http://localhost:4141/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool":"macos_shell","input":{"command":"ls -la"}}'
```

**Read a markdown file:**

```bash
curl -X POST http://localhost:4141/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool":"read_markdown","input":{"filePath":"README.md"}}'
```

### STDIO Mode (Cursor Integration)

The STDIO mode enables direct integration with the Cursor IDE, allowing you to:

* Use SmartGPT's powerful dual-model pipeline directly within your code editor
* Access the ThoughtChain reasoning capabilities during development
* Perform web searches without leaving your IDE
* Execute any of the SmartGPT tools with proper context awareness

#### Starting the STDIO Server

To run the server in STDIO mode manually:

```bash
npx tsx smartgpt_mcp_server_stdio.ts --stdio
```

For integration with Cursor, configure the MCP in your `~/.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "smartgpt": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "<path_to_script>/smartgpt_mcp_server_stdio.ts",
        "--stdio"
      ],
      "description": "SmartGPT dual-model AI pipeline with comprehensive toolchain",
      "disabled": false,
      "category": "ai-reasoning",
      "autoApprove": ["ask", "thoughtchain", "websearch"],
      "startup": "auto"
    }
  }
}
```

This configuration:

* Sets up SmartGPT as an available MCP server in Cursor
* Auto-approves certain tools for streamlined workflow
* Automatically starts the server when Cursor launches (with `startup: "auto"`)

Once configured, you can access SmartGPT's tools through Cursor's MCP interface or directly through the Claude assistant, which will have access to all registered tools.

## Examples

The project includes several examples showing how to use SmartGPT:

### Toolchain Example

See `examples/toolchain.ts` for a complete example showing how to:

* Execute shell commands (with sandbox fallback)
* Read and parse files
* Call different AI models
* Combine tools in a dual-model thought chain

```bash
npm run toolchain
```

### Original-style Example

See `examples/original-style.ts` for an example closer to the original SmartGPT implementation:

```bash
npm run original
```

## Running Examples

The project includes several npm scripts to run different examples:

```bash
# Run the basic example
npm run start

# Run the toolchain example
npm run toolchain

# Run the original-style example
npm run original

# Check if environment variables are properly loaded
npm run check-env

# Test the macOS shell command execution
npm run test-shell

# Start the MCP server in HTTP mode
npm run server

# Start the MCP server in development mode with debug output
npm run server:dev

# Start the MCP server on a custom port
npm run server:port # Uses port 8080

# Start the MCP server in stdio mode (for Cursor integration)
npx tsx smartgpt_mcp_server_stdio.ts --stdio
```
