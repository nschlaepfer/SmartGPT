// Simple test script to directly test SmartGPT API
import * as dotenv from "dotenv";
import { SmartGPT } from "./src/core/smartGPT.js";
import { MemoryStore } from "./src/memory/memory.js";

// Load environment variables
dotenv.config();

async function testMemoryStore() {
  console.log("Testing MemoryStore directly...");
  try {
    // Test a simple memory store with default settings
    const memoryStore = new MemoryStore(1536);
    console.log("MemoryStore initialized successfully");

    // Create a simple embedding function
    const mockEmbed = async (text) => {
      // Create a simple mock embedding
      return new Float32Array(new Array(1536).fill(0.1));
    };

    // Add a test entry
    await memoryStore.add("test memory entry", mockEmbed);
    console.log("Added test entry to memory store");

    // Search for the entry
    const results = await memoryStore.search("test memory", 1, mockEmbed);
    console.log("Search results:", results);

    console.log("MemoryStore test completed successfully");
  } catch (error) {
    console.error("Error in MemoryStore test:", error);
  }
}

async function testSmartGPT() {
  console.log("Testing SmartGPT...");
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Error: OPENAI_API_KEY is not set in environment");
      return;
    }

    console.log("Initializing SmartGPT...");
    const smartgpt = new SmartGPT({
      apiKey,
      reasoningModel: "o4-mini",
      contextModel: "gpt-4.1",
    });

    console.log("SmartGPT initialized successfully");

    // Test search functionality
    try {
      console.log("Testing search...");
      const searchResults = await smartgpt.search("test query", 1);
      console.log("Search results:", searchResults);
    } catch (searchError) {
      console.error("Search error:", searchError);
    }

    console.log("SmartGPT test completed");
  } catch (error) {
    console.error("Error in SmartGPT test:", error);
  }
}

// Run the tests
(async () => {
  try {
    await testMemoryStore();
    console.log("\n----------------------------\n");
    await testSmartGPT();
  } catch (error) {
    console.error("Unhandled error in tests:", error);
  }
})();
