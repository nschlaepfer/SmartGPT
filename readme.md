# SmartGPT

A TypeScript library for building advanced AI applications with multiple LLM providers, featuring a dual-model pipeline that combines fast reasoning and deep context processing.

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

## Features

* Support for OpenAI and Google AI models
* Memory store for context retention
* Neo4j-based knowledge retrieval (Hippo-style)
* Monte Carlo Tree Search for deep exploration
* Structured output with Zod schemas
* ThoughtChain - multi-step reasoning pipeline for improved answers
* Real-time web search integration with Serper API
* Modular architecture for better maintainability

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

## Configuration

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key (optional)
SERPER_API_KEY=your-serper-api-key (optional, for web search)
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

## Usage

See `example.ts` for basic usage:

```typescript
import { SmartGPT } from './smartGPT.js';

const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || '',
  // Optional config
  googleApiKey: process.env.GOOGLE_API_KEY,
  model: "gpt-4.1",
  deep: true,
  serperApiKey: process.env.SERPER_API_KEY, // For web search
});

async function main() {
  // Basic query
  const answer = await smartGPT.ask('What is the capital of France?');
  console.log('Answer:', answer);

  // Using web search
  const searchResult = await smartGPT.webSearch('What are the latest developments in large language models?');
  console.log('Web Search Result:', searchResult);

  // Using ThoughtChain for complex queries
  const result = await smartGPT.thoughtChain(
    "Explain HippoRAG in plain English",
    3  // number of drafts
  );
  console.log(result.best);
}

main();
```

### ThoughtChain

The ThoughtChain feature implements a chain-of-thought reasoning pattern:

1. **Drafter**: Generates multiple candidate answers
2. **Researcher**: Critiques each draft for logic holes & missing citations
3. **Resolver**: Produces improved answers based on critiques
4. **Judge**: Selects the best improved answer

This approach helps produce more accurate and well-reasoned responses, especially for complex topics.

### Web Search

The built-in web search functionality uses the Serper API to perform real-time internet searches:

```typescript
// Example of web search
const searchResult = await smartGPT.webSearch('What are the latest developments in large language models?');
```

If a Serper API key is not provided, the system will fall back to simulated search results.

## Running Examples

```bash
npm run start
```

Or run a specific example:

```bash
npx tsx example.ts
```

## Building

```bash
npm run build
```

This will generate compiled JavaScript files in the `dist` directory.

## External Services

This project integrates with the following external services:

1. **OpenAI API** (required) - For language model capabilities
2. **Google AI API** (optional) - For alternative language models
3. **Neo4j database** (optional) - For knowledge retrieval
4. **Serper API** (optional) - For real-time web search

### Neo4j Setup Instructions

* Install Neo4j from https://neo4j.com/download/
* Create a database with username "neo4j" and password "password" (or configure your own in the code)
* Create a fulltext index named "chunkIndex" on your content nodes
* Import your documents into the database as nodes with a "content" property

### Serper API Setup

* Register for a Serper API key at https://serper.dev
* Add the key to your `.env` file as `SERPER_API_KEY`
* Configure timeout and result limits in your code as needed
