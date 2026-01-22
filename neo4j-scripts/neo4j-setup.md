# Neo4j Setup Guide for SmartGPT

> **NOTE:** SmartGPT is currently configured to use the memory fallback retriever.
> When you're ready to use Neo4j, follow the instructions below and then set `useNeo4j: true` in example.ts.

This guide will help you set up Neo4j for use with SmartGPT, including installation, configuration, and data loading.

## Installation

### macOS (using Homebrew)

```bash
# Install Neo4j
brew install neo4j

# Start Neo4j as a service
brew services start neo4j
```

### Windows

1. Download the Neo4j Desktop installer from [Neo4j Download Page](https://neo4j.com/download/)
2. Run the installer and follow the prompts
3. Launch Neo4j Desktop and create a new database

### Linux

```bash
# For Debian/Ubuntu
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee -a /etc/apt/sources.list.d/neo4j.list
sudo apt-get update
sudo apt-get install neo4j

# Start Neo4j
sudo systemctl start neo4j
```

## Initial Setup

1. **Access the Neo4j Browser**
   * Open `http://localhost:7474` in your web browser

2. **Set Initial Password**
   * Default credentials:
     * Username: `neo4j`
     * Password: `neo4j`
   * You'll be prompted to set a new password
   * For SmartGPT example.ts, set the password to: `password`

3. **Create Fulltext Index**
   * In the Neo4j Browser, run this Cypher query:
   ```cypher
   CALL db.index.fulltext.createNodeIndex('chunkIndex',['Document'],['content'])
   ```

## Loading Sample Data

To test with some sample data, run these Cypher queries in the Neo4j Browser:

```cypher
// Create Document nodes with sample content
CREATE (d1:Document {id: "doc1", title: "Introduction to AI", content: "Artificial Intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. The term may also be applied to any machine that exhibits traits associated with a human mind such as learning and problem-solving."})

CREATE (d2:Document {id: "doc2", title: "Machine Learning Basics", content: "Machine Learning is a subset of AI that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Machine learning focuses on the development of computer programs that can access data and use it to learn for themselves."})

CREATE (d3:Document {id: "doc3", title: "Neural Networks Explained", content: "Neural networks are computing systems with interconnected nodes that work much like neurons in the human brain. Using algorithms, they can recognize hidden patterns and correlations in raw data, cluster and classify it, and continuously learn and improve over time."})

// Verify the documents were created
MATCH (d:Document) RETURN d.title, d.content LIMIT 10

// Test the fulltext index
CALL db.index.fulltext.queryNodes('chunkIndex', 'neural networks') YIELD node, score
RETURN node.title, node.content, score ORDER BY score DESC
```

## Configuring SmartGPT with Neo4j

Modify your `example.ts` file to include Neo4j configuration:

```typescript
// Create a SmartGPT instance with Neo4j
const smartGPT = new SmartGPT({
  agentProvider: "codex",

  // Neo4j config
  neo4j: {
    url: "bolt://localhost:7687",
    username: "neo4j",
    password: "password", // Use the password you set in step 2
  },
  useNeo4j: true, // Enable Neo4j connection
});
```

## Troubleshooting

### Authentication Issues

* Ensure you're using the correct username and password
* Try resetting the password:
  ```bash
  neo4j-admin reset-password
  ```

### Connection Issues

* Ensure Neo4j is running: `brew services list` or `systemctl status neo4j`
* Check the Neo4j logs: `/opt/homebrew/var/log/neo4j.log` (macOS) or `/var/log/neo4j/` (Linux)
* Verify the correct port is being used (default: 7687 for Bolt and 7474 for HTTP)

### Index Not Found

* Verify the index exists:
  ```cypher
  CALL db.indexes()
  ```
* Make sure the index name in SmartGPT matches the one created in Neo4j

## Advanced: Creating a HippoRAG Knowledge Base

For a more comprehensive knowledge base:

1. **Prepare your documents:**
   * Break documents into chunks (paragraphs or sections)
   * Include metadata like source, author, date

2. **Load documents into Neo4j:**
   ```cypher
   // Create a document with metadata
   CREATE (d:Document {
     id: "unique_id",
     title: "Document Title",
     source: "Source Name",
     url: "https://source.url",
     author: "Author Name",
     date: "2025-04-18",
     content: "The actual content of the chunk..."
   })
   ```

3. **Create relationships between documents (optional):**
   ```cypher
   // Create relationships between related documents
   MATCH (d1:Document {id: "doc1"}), (d2:Document {id: "doc2"})
   CREATE (d1)-[:RELATED_TO {weight: 0.85}]->(d2)
   ```

4. **Add additional indexes for performance:**
   ```cypher
   // Create index on document ID
   CREATE INDEX ON :Document(id)
   ```

## Next Steps

* Explore Neo4j's [APOC library](https://neo4j.com/labs/apoc/) for advanced data loading
* Consider adding [embedding-based similarity](https://neo4j.com/docs/graph-data-science/current/machine-learning/node-embeddings/) with Neo4j Graph Data Science
* Automate document ingestion with a script that processes documents and loads them into Neo4j
