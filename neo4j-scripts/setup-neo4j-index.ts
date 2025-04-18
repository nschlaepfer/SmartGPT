// Neo4j Setup Script - Creates necessary index and sample data
// Run with: npx tsx setup-neo4j-index.ts

import neo4j from "neo4j-driver";

// Sample documents for testing
const SAMPLE_DOCUMENTS = [
  {
    id: "doc1",
    title: "Introduction to AI",
    content:
      "Artificial Intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. The term may also be applied to any machine that exhibits traits associated with a human mind such as learning and problem-solving.",
  },
  {
    id: "doc2",
    title: "Machine Learning Basics",
    content:
      "Machine Learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Machine learning focuses on the development of computer programs that can access data and use it to learn for themselves.",
  },
  {
    id: "doc3",
    title: "Neural Networks Explained",
    content:
      "Neural networks are computing systems with interconnected nodes that work much like neurons in the human brain. Using algorithms, they can recognize hidden patterns and correlations in raw data, cluster and classify it, and continuously learn and improve over time.",
  },
  {
    id: "doc4",
    title: "HippoRAG Architecture",
    content:
      "HippoRAG combines a Highly Predictive Polynomial Operator (HiPPO) memory module with Retrieval-Augmented Generation (RAG) to enable efficient processing of long context sequences. This architecture maintains a fixed-size memory representation of past context, allowing language models to reference information beyond their standard context window limitations.",
  },
];

async function setupNeo4j() {
  console.log("===================================");
  console.log("Setting up Neo4j for SmartGPT");
  console.log("===================================");

  // Neo4j connection parameters
  const uri = "bolt://localhost:7687";
  const username = "neo4j";
  const password = "password";

  // Create driver
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    encrypted: false,
    trust: "TRUST_ALL_CERTIFICATES",
  });

  try {
    // Test connection
    console.log("Testing Neo4j connection...");
    await driver.verifyConnectivity();
    console.log("✅ Connected to Neo4j");

    // Create standard index
    console.log("Creating indexes...");
    const session = driver.session();

    try {
      // Create standard indexes
      await session.run(
        `CREATE INDEX IF NOT EXISTS FOR (d:Document) ON (d.id)`
      );
      console.log("✅ Created index on Document.id");

      await session.run(
        `CREATE INDEX IF NOT EXISTS FOR (d:Document) ON (d.title)`
      );
      console.log("✅ Created index on Document.title");
    } catch (error: any) {
      console.error("❌ Failed to create index:", error.message);
      throw error;
    }

    // Check for existing documents
    const countResult = await session.run(
      "MATCH (d:Document) RETURN count(d) as count"
    );
    const count = countResult.records[0].get("count").toNumber();

    if (count > 0) {
      console.log(`ℹ️ Found ${count} existing documents`);
    } else {
      // Create sample documents
      console.log("Creating sample documents...");

      for (const doc of SAMPLE_DOCUMENTS) {
        await session.run(
          `CREATE (d:Document {id: $id, title: $title, content: $content})`,
          doc
        );
      }

      console.log(`✅ Created ${SAMPLE_DOCUMENTS.length} sample documents`);
    }

    // Test text search using CONTAINS
    console.log("\nTesting text search...");
    const searchResult = await session.run(
      `MATCH (d:Document)
       WHERE d.content CONTAINS 'neural' OR d.content CONTAINS 'networks'
       RETURN d.title, d.id
       LIMIT 3`
    );

    if (searchResult.records.length === 0) {
      console.log(
        "❌ No search results found. There might be an issue with the data."
      );
    } else {
      console.log("✅ Found search results:");
      searchResult.records.forEach((record, i) => {
        console.log(
          `  ${i + 1}. ${record.get("d.title")} (${record.get("d.id")})`
        );
      });
    }

    // Also create a text property we can search on
    console.log("\nUpdating SmartGPT to use standard search...");

    try {
      // Edit smartgpt.ts to use regular CONTAINS search instead of fulltext
      const fs = await import("fs/promises");
      const path = "./smartgpt.ts";
      let content = await fs.readFile(path, "utf8");

      // Find and update the HippoRetriever.retrieve method
      if (content.includes("CALL db.index.fulltext.queryNodes")) {
        const updated = content.replace(
          /CALL db\.index\.fulltext\.queryNodes\('chunkIndex',\$q\) YIELD node,score RETURN node\.content AS c ORDER BY score DESC LIMIT \$k/g,
          `MATCH (node:Document)
           WHERE node.content CONTAINS $q OR node.title CONTAINS $q
           RETURN node.content AS c LIMIT $k`
        );

        if (updated !== content) {
          await fs.writeFile(path, updated);
          console.log("✅ Updated SmartGPT to use standard text search");
        } else {
          console.log("ℹ️ No changes needed to SmartGPT search implementation");
        }
      } else {
        console.log(
          "ℹ️ Could not locate fulltext search in SmartGPT, it may already be compatible"
        );
      }
    } catch (error: any) {
      console.error("❌ Failed to update SmartGPT:", error.message);
    }

    console.log("\n===================================");
    console.log("✅ Neo4j setup complete!");
    console.log("   You can now run SmartGPT with Neo4j");
    console.log("===================================");

    await session.close();
  } catch (error: any) {
    console.error("❌ Error setting up Neo4j:", error.message);
    if (error.message && error.message.includes("authentication")) {
      console.log("\nPossible authentication error:");
      console.log("1. Make sure Neo4j is running: brew services start neo4j");
      console.log("2. The default password for a new installation is 'neo4j'");
      console.log(
        "3. If you've changed the password, use that instead of 'password' in example.ts"
      );
      console.log(
        "4. If using a fresh Neo4j installation, you may need to set a new password through the Neo4j Browser at http://localhost:7474"
      );
    }
  } finally {
    await driver.close();
  }
}

// Run the setup
setupNeo4j().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
