# SmartGPT

A TypeScript library for building advanced AI applications with multiple LLM providers.

## Features

* Support for OpenAI and Google AI models
* Memory store for context retention
* Neo4j-based knowledge retrieval (Hippo-style)
* Monte Carlo Tree Search for deep exploration
* Structured output with Zod schemas
* ThoughtChain - multi-step reasoning pipeline for improved answers

## Requirements

* Node.js 18+
* OpenAI API key
* (Optional) Google AI API key
* (Optional) Neo4j database for knowledge retrieval

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key (optional)
```

## Usage

See `example.ts` for basic usage:

```typescript
import { SmartGPT } from './smartgpt';

const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || '',
  // Optional config
  googleApiKey: process.env.GOOGLE_API_KEY,
  model: "gpt-4.1",
  deep: true,
});

async function main() {
  // Basic query
  const answer = await smartGPT.ask('What is the capital of France?');
  console.log('Answer:', answer);

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

## Note

This project requires external services:

1. OpenAI API account
2. (Optional) Google AI API access
3. (Optional) Neo4j database instance for knowledge retrieval

Neo4j setup instructions:

* Install Neo4j (https://neo4j.com/download/)
* Create a database with username "neo4j" and password "password"
* Create a fulltext index named "chunkIndex" on your content nodes
