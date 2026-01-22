import "dotenv/config";
import { SmartGPT } from "./src/index.js";
import { writeFileSync } from "fs";

// Flag to determine if we should test experimental features
const ENABLE_EXPERIMENTAL_FEATURES = true;

// Create a main SmartGPT instance (without Neo4j)
const smartGPT = new SmartGPT({
  agentProvider: "codex",
  // Optional: override models for Codex or Claude Code (SDK defaults are used if omitted)
  // reasoningModel: "gpt-5-mini-codex",
  // contextModel: "gpt-5-codex",

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
  console.log(`[DEBUG] Codex login expected (via CLI or API key).`);
  console.log(
    `[DEBUG] Experimental features enabled: ${ENABLE_EXPERIMENTAL_FEATURES}`
  );
  console.log(`[DEBUG] Neo4j available: ${smartGPT.isNeo4jAvailable()}`);

  try {
    // =========== Testing with Codex (default) ==========
    console.log("\n===== TESTING WITH DEFAULT MODEL (Codex) =====");

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

    // =========== Testing Web Search Functionality ==========
    if (ENABLE_EXPERIMENTAL_FEATURES) {
      console.log("\n===== TESTING ENHANCED WEB SEARCH FUNCTIONALITY =====");

      // Test web search functionality
      console.log("\nEnhanced Web Search Test:");
      try {
        const webSearchResult = await measureExecution(
          "Enhanced web search test",
          async () => {
            // Use the enhanced webSearch method with a current topic
            return await smartGPT.webSearch(
              "latest developments in large language models",
              3
            );
          }
        );

        console.log("Enhanced Web Search Results:");
        if (Array.isArray(webSearchResult) && webSearchResult.length > 0) {
          webSearchResult.forEach((result, i) => {
            console.log(`\n[Result ${i + 1}]:`);
            // Print first 500 chars of each result to avoid console spam
            console.log(
              result.length > 500 ? result.substring(0, 500) + "..." : result
            );
            console.log(`\n[Full content length: ${result.length} characters]`);
          });

          // Save results to a file for inspection
          writeFileSync(
            "web_search_results.txt",
            webSearchResult.join("\n\n" + "-".repeat(80) + "\n\n")
          );
          console.log(
            "\n✅ Full results saved to web_search_results.txt for detailed review"
          );
        } else {
          console.log("No web search results found");
        }
      } catch (error: any) {
        console.error(
          "[DEBUG] Enhanced web search test failed:",
          error.message
        );
      }
      console.log("\n----------------------------\n");
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

    // Add a short delay to allow any pending operations to complete
    console.log("\n[DEBUG] Tests complete! Exiting...");
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

main().catch((error) => {
  console.error("Unhandled error in main:", error);
  process.exit(1);
});
