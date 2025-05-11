// Test script focusing only on MemoryStore with proper initialization time
import { MemoryStore } from "./src/memory/memory.ts";

async function testMemoryStore() {
  console.log("Testing MemoryStore with initialization delay...");

  try {
    // Create a memory store with default settings
    console.log("Creating memory store...");
    const memoryStore = new MemoryStore(1536);
    console.log("Memory store created, waiting for initialization...");

    // Wait to ensure initialization is complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create a simple embedding function
    const mockEmbed = async (text) => {
      return new Float32Array(new Array(1536).fill(0.1));
    };

    // Add test entries with different content
    console.log("Adding test entries...");
    await memoryStore.add(
      "This is test entry number one about artificial intelligence",
      mockEmbed
    );
    await memoryStore.add(
      "Second test entry discussing machine learning and data science",
      mockEmbed
    );
    await memoryStore.add(
      "Third test case about natural language processing",
      mockEmbed
    );
    console.log("Test entries added");

    // Search for entry - modify the mock embed to better match the first entry
    console.log("Searching for entries...");
    const results = await memoryStore.search(
      "artificial intelligence test",
      2,
      mockEmbed
    );
    console.log("Search results:", results);

    console.log("MemoryStore test completed successfully");
    return true;
  } catch (error) {
    console.error("Error in MemoryStore test:", error);
    return false;
  }
}

// Run the test function
testMemoryStore();
