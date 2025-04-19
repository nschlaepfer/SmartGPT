// Example demonstrating the web_search tool
import * as dotenv from "dotenv";
import { web_search } from "../src/tools/index.js";

// Load environment variables
dotenv.config();

async function runWebSearchDemo() {
  console.log("=".repeat(50));
  console.log("SmartGPT Web Search Tool Demo");
  console.log("=".repeat(50));
  console.log();

  try {
    // First search example - current events
    console.log("Example 1: Searching for recent information");
    const currentEventsResults = await web_search({
      query: "latest AI developments 2025",
      numResults: 3,
    });

    console.log("\nResults:");
    currentEventsResults.results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.title}`);
      console.log(`   URL: ${result.link}`);
      console.log(`   Snippet: ${result.snippet}`);
    });
    console.log(
      `\nSearch completed in ${currentEventsResults.searchTime?.toFixed(
        2
      )} seconds`
    );

    console.log("\n" + "-".repeat(50) + "\n");

    // Second search example - technical information
    console.log("Example 2: Searching for technical information");
    const technicalResults = await web_search({
      query: "how to implement vector search in typescript",
      numResults: 3,
    });

    console.log("\nResults:");
    technicalResults.results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.title}`);
      console.log(`   URL: ${result.link}`);
      console.log(`   Snippet: ${result.snippet}`);
    });
    console.log(
      `\nSearch completed in ${technicalResults.searchTime?.toFixed(2)} seconds`
    );
  } catch (error) {
    console.error("Error running web search demo:", error);
  }
}

// Run the demo
runWebSearchDemo().catch(console.error);
