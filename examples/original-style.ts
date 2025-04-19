/**
 * Example matching the original SmartGPT implementation
 * Uses the same models and approaches as the original smartgpt.ts
 */
import * as dotenv from "dotenv";
import { SmartGPT } from "../src/index.js";

// Load environment variables
dotenv.config();

// Flag to determine if we should test experimental features
const ENABLE_EXPERIMENTAL_FEATURES = true;

// Flag to enable/disable Gemini testing (disabled by default due to quota limits)
const ENABLE_GEMINI_TESTING = false;

// Create a main SmartGPT instance (without Neo4j)
const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || "",
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,

  // Use the exact same models from original smartgpt.ts
  contextModel: "gpt-4.1",
  reasoningModel: "o4-mini",

  // Neo4j config - Enable Neo4j connection if needed
  neo4j: {
    url: "bolt://localhost:7687",
    username: "neo4j",
    password: "password",
  },
  useNeo4j: false, // Default to false to avoid connection errors

  // Enable deep exploration
  deep: true,
  exploreBudget: 256,

  // Use Serper API for web search if available
  serperApiKey: process.env.SERPER_API_KEY,
});

// Create a Gemini instance for testing (if available)
let geminiGPT: SmartGPT | null = null;
try {
  if (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    ENABLE_EXPERIMENTAL_FEATURES &&
    ENABLE_GEMINI_TESTING
  ) {
    geminiGPT = new SmartGPT({
      apiKey: process.env.OPENAI_API_KEY || "", // Still needed as a fallback
      googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      contextModel: "gemini-2.5pro", // Using Gemini model for context
      reasoningModel: "gemini-2.5pro", // Also use Gemini for reasoning
      useNeo4j: false, // Disable Neo4j for Gemini tests
    });
    console.log("[DEBUG] Gemini model initialized successfully");
  } else {
    console.log(
      "[DEBUG] Skipping Gemini tests - API key not found, experimental features disabled, or Gemini testing disabled"
    );
  }
} catch (error: any) {
  console.error("[DEBUG] Failed to initialize Gemini model:", error.message);
  geminiGPT = null;
}

/**
 * Main example runner
 */
async function runExamples() {
  console.log("🧠 SmartGPT Examples - Original Style\n");

  // Example 1: Basic question answering with dual-model pipeline
  console.log("📝 Example 1: Basic Question Answering");
  try {
    const answer = await smartGPT.ask(
      "What is the macOS sandbox-exec utility and how does it help with security?"
    );
    console.log(`Answer: ${answer}\n`);
  } catch (error) {
    console.error("Error in Example 1:", error);
  }

  // Example 2: Try thought chain (multi-step reasoning)
  console.log("📝 Example 2: ThoughtChain");
  try {
    console.log("Running ThoughtChain for complex question...");
    const result = await smartGPT.thoughtChain(
      "Compare and contrast containerization technologies like Docker with macOS sandbox mechanisms.",
      2 // Number of drafts
    );

    console.log("ThoughtChain result:");
    console.log(`Best answer:\n${result.best}\n`);
  } catch (error) {
    console.error("Error in Example 2:", error);
  }

  // Example 3: Web search (if Serper API key is available)
  console.log("📝 Example 3: Web Search");
  try {
    const searchResults = await smartGPT.webSearch(
      "latest developments in macOS security features 2025"
    );
    console.log("Web search results:");
    searchResults.forEach((result, i) => {
      console.log(`\nResult ${i + 1}:`);
      console.log(result);
    });
  } catch (error) {
    console.error("Error in Example 3:", error);
  }

  // Example 4: Test with Gemini model if available
  if (geminiGPT) {
    console.log("\n📝 Example 4: Gemini Model Test");
    try {
      const geminiAnswer = await geminiGPT.ask(
        "What are the key differences between various sandboxing technologies?"
      );
      console.log(`Gemini Answer: ${geminiAnswer}\n`);
    } catch (error) {
      console.error("Error in Example 4:", error);
    }
  }
}

// Run all examples
runExamples().catch(console.error);
