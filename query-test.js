#!/usr/bin/env node
// CLI tool to test SmartGPT API with proper debugging
import * as dotenv from "dotenv";
import { SmartGPT } from "./src/core/smartGPT.js";

// Load environment variables
dotenv.config();

// Set debug mode for full error stack traces
Error.stackTraceLimit = Infinity;

// Parse command line arguments
const args = process.argv.slice(2);
const isProMode = args.includes("--pro");
const depth = isProMode ? 3 : 0;
const query = args.filter((arg) => !arg.startsWith("--")).join(" ");

if (!query) {
  console.error("Error: No query provided");
  console.log('Usage: npx tsx query-test.js [--pro] "your query here"');
  process.exit(1);
}

async function runQuery() {
  try {
    console.log(`Running ${isProMode ? "PRO" : "standard"} query: "${query}"`);

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Error: OPENAI_API_KEY is not set");
      process.exit(1);
    }

    // Initialize SmartGPT with verbose logging
    console.log("Initializing SmartGPT...");
    const smartgpt = new SmartGPT({
      apiKey,
      reasoningModel: isProMode ? "gpt-4" : "o4-mini",
      contextModel: "gpt-4",
      deep: isProMode,
      serperApiKey: process.env.SERPER_API_KEY || undefined,
    });

    console.log(
      "SmartGPT initialized, waiting to ensure component initialization..."
    );
    // Wait for any async initialization
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Run query based on mode
    let result;
    if (isProMode) {
      console.log(`Running thought chain with depth ${depth}...`);
      result = await smartgpt.thoughtChain(query, depth);

      // Format pro result
      console.log("\n--- RESULT ---");
      console.log("ANSWER:", result.best || "No answer generated");
      if (result.drafts && result.drafts.length > 0) {
        console.log("\nREASONING:");
        console.log(result.drafts.join("\n---\n"));
      }
    } else {
      console.log("Running standard query...");
      result = await smartgpt.ask(query);

      // Format standard result
      console.log("\n--- RESULT ---");
      console.log(result);
    }

    console.log("\nQuery completed successfully");
  } catch (error) {
    console.error("Error running query:", error);
    // Print full error details including stack trace
    if (error.stack) {
      console.error("\nError stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the query
runQuery();
