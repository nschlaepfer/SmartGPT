import "dotenv/config";
import { SmartGPT } from "./smartgpt";

// Flag to determine if we should test experimental features
const ENABLE_EXPERIMENTAL_FEATURES = true;

// Flag to enable/disable Gemini testing (disabled by default due to quota limits)
const ENABLE_GEMINI_TESTING = false;

// Create a main SmartGPT instance (without Neo4j)
const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || "",
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  // Optional: use a specific model (defaults to gpt-4.1 for context and o4-mini for reasoning)
  // contextModel: "gpt-4.1",
  // reasoningModel: "o4-mini",

  // Neo4j config - Enable Neo4j connection
  neo4j: {
    url: "bolt://localhost:7687",
    username: "neo4j",
    password: "password",
  },
  useNeo4j: true, // Enable Neo4j connection

  // Enable deep exploration if needed
  // deep: true,
  // exploreBudget: 512,
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
      contextModel: "gemini-2.5-pro", // Specify Gemini model for context handling
      reasoningModel: "gemini-2.5-pro", // Also use Gemini for reasoning
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

// Helper function to measure execution time and log details
async function measureExecution(name: string, fn: () => Promise<any>) {
  console.log(`\n[DEBUG] Starting ${name}`);
  const startTime = performance.now();

  try {
    const result = await fn();
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;

    console.log(`[DEBUG] Execution time: ${executionTime.toFixed(2)} seconds`);
    console.log(`[DEBUG] Response size: ${result?.length || "N/A"} characters`);

    return result;
  } catch (error: any) {
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;

    console.error(`[DEBUG] Error after ${executionTime.toFixed(2)} seconds:`);
    console.error(`[DEBUG] Error name: ${error.name}`);
    console.error(`[DEBUG] Error message: ${error.message}`);
    if (error.stack)
      console.error(`[DEBUG] Stack trace: ${error.stack.split("\n")[0]}`);

    throw error;
  }
}

async function main() {
  console.log("SmartGPT Test - With Debug Statistics");
  console.log("=====================================");
  const startMemory = process.memoryUsage().heapUsed;
  console.log(`[DEBUG] Node version: ${process.version}`);
  console.log(`[DEBUG] Test start time: ${new Date().toISOString()}`);
  console.log(
    `[DEBUG] Memory usage at start: ${(startMemory / 1024 / 1024).toFixed(
      2
    )} MB`
  );
  console.log(
    `[DEBUG] OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}`
  );
  console.log(
    `[DEBUG] Google API Key present: ${!!process.env
      .GOOGLE_GENERATIVE_AI_API_KEY}`
  );
  console.log(
    `[DEBUG] Experimental features enabled: ${ENABLE_EXPERIMENTAL_FEATURES}`
  );
  console.log(`[DEBUG] Neo4j available: ${smartGPT.isNeo4jAvailable()}`);

  try {
    // =========== Testing with OpenAI (default) ==========
    console.log("\n===== TESTING WITH DEFAULT MODEL (OpenAI) =====");

    // Basic question
    console.log("\nBasic ask example 1:");
    const answer1 = await measureExecution("Basic question", async () => {
      return await smartGPT.ask("What is the capital of France?");
    });
    console.log("Answer:", answer1);
    console.log("\n----------------------------\n");

    // Test with a more complex question
    console.log("Basic ask example 2:");
    const answer2 = await measureExecution("Complex explanation", async () => {
      return await smartGPT.ask(
        "Explain how LSTM neural networks work in simple terms."
      );
    });
    console.log("Answer:", answer2);
    console.log("\n----------------------------\n");

    // Test with a creative question
    console.log("Basic ask example 3:");
    const answer3 = await measureExecution("Creative content", async () => {
      return await smartGPT.ask(
        "Write a short poem about artificial intelligence."
      );
    });
    console.log("Answer:", answer3);
    console.log("\n----------------------------\n");

    // Test with a debugging question
    console.log("Basic ask example 4 (with debug focus):");
    const answer4 = await measureExecution("Debugging question", async () => {
      return await smartGPT.ask(
        "What are the most common issues when implementing LLM systems?"
      );
    });
    console.log("Answer:", answer4);
    console.log("\n----------------------------\n");

    // =========== Testing with Gemini model (if available) ==========
    if (geminiGPT !== null) {
      console.log("\n===== TESTING WITH GEMINI MODEL =====");

      // Basic question with Gemini
      console.log("\nGemini Model Test:");
      try {
        const geminiAnswer = await measureExecution(
          "Gemini model basic question",
          async () => {
            return await geminiGPT!.ask("What is the capital of France?");
          }
        );
        console.log("Gemini Answer:", geminiAnswer);
      } catch (error: any) {
        console.error("[DEBUG] Gemini test failed:", error.message);
        if (error.message.includes("quota") || error.message.includes("429")) {
          console.log(
            "[DEBUG] API quota exceeded. You may need to upgrade your Google API plan or wait until quota resets."
          );
        }
      }
      console.log("\n----------------------------\n");
    }

    // =========== Testing Search Functionality (with fallback) ==========
    if (ENABLE_EXPERIMENTAL_FEATURES) {
      console.log("\n===== TESTING SEARCH FUNCTIONALITY =====");

      // Test search functionality (will use fallback if Neo4j not available)
      console.log("\nSearch Test:");
      try {
        const searchAnswer = await measureExecution("Search test", async () => {
          // The search method will use the fallback if Neo4j isn't available
          const results = await smartGPT.search("artificial intelligence", 3);
          return results;
        });

        console.log("Search Results:");
        if (Array.isArray(searchAnswer) && searchAnswer.length > 0) {
          searchAnswer.forEach((result, i) => {
            console.log(`\n[Result ${i + 1}]:`);
            console.log(result);
          });
        } else {
          console.log("No results found");
        }
      } catch (error: any) {
        console.error("[DEBUG] Search test failed:", error.message);
      }
      console.log("\n----------------------------\n");
    }

    // =========== Testing Web Search Functionality ==========
    if (ENABLE_EXPERIMENTAL_FEATURES) {
      console.log("\n===== TESTING WEB SEARCH FUNCTIONALITY =====");

      // Test web search functionality
      console.log("\nWeb Search Test:");
      try {
        const webSearchResult = await measureExecution(
          "Web search test",
          async () => {
            // Use the new webSearch method
            return await smartGPT.webSearch(
              "latest developments in artificial intelligence",
              3
            );
          }
        );

        console.log("Web Search Results:");
        if (Array.isArray(webSearchResult) && webSearchResult.length > 0) {
          webSearchResult.forEach((result, i) => {
            console.log(`\n[Result ${i + 1}]:`);
            console.log(result);
          });
        } else {
          console.log("No web search results found");
        }
      } catch (error: any) {
        console.error("[DEBUG] Web search test failed:", error.message);
      }
      console.log("\n----------------------------\n");
    }

    // =========== Testing the ThoughtChain Feature (with fallback) ==========
    console.log("\n===== TESTING THOUGHTCHAIN (WITH FALLBACK) =====");

    try {
      console.log(
        "Running thoughtChain with query: 'Explain HippoRAG in plain English'"
      );

      const thoughtChainResult = await measureExecution(
        "ThoughtChain execution",
        async () => {
          return await smartGPT.thoughtChain(
            "Explain HippoRAG in plain English",
            3
          );
        }
      );

      console.log("\nThoughtChain - Best answer:");
      console.log(thoughtChainResult.best);

      // Check Neo4j availability using the proper method
      if (smartGPT.isNeo4jAvailable()) {
        console.log(
          "\n[DEBUG] Full ThoughtChain results available (Neo4j connected)"
        );
        console.log(
          `[DEBUG] Number of drafts: ${thoughtChainResult.drafts.length}`
        );
      } else {
        console.log(
          "\n[DEBUG] Simplified ThoughtChain results (Neo4j fallback mode)"
        );
      }
    } catch (error: any) {
      console.error("[DEBUG] ThoughtChain test failed:", error.message);
    }
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    const endMemory = process.memoryUsage().heapUsed;
    console.log("\n[DEBUG] Test Summary");
    console.log(`[DEBUG] Test end time: ${new Date().toISOString()}`);
    console.log(
      `[DEBUG] Memory usage at end: ${(endMemory / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `[DEBUG] Memory delta: ${(
        (endMemory - startMemory) /
        1024 /
        1024
      ).toFixed(2)} MB`
    );
  }
}

main();
