# SmartGPT Source Code

This directory contains the modular implementation of SmartGPT.

## Directory Structure

* `core/` - Core functionality and types
  * `smartGPT.ts` - Main SmartGPT class
  * `types.ts` - Type definitions
  * `config.ts` - Configuration constants
  * `prompts.json` - Static prompts

* `models/` - LLM interaction
  * `llm.ts` - Language model interaction
  * `embedder.ts` - Text embedding functionality

* `memory/` - Memory management
  * `memory.ts` - Memory storage and retrieval

* `search/` - Search and retrieval
  * `retrievers.ts` - Neo4j and fallback retrieval systems
  * `deepExplorer.ts` - Monte Carlo Tree Search implementation

* `utils/` - Utilities
  * `fetchWithTimeout.ts` - Fetch utility with timeout

## Entry Point

The main entry point is `index.ts` which exports the SmartGPT class and other necessary components.

## Build

The TypeScript compiler outputs to the `dist/` directory at the root of the project.
