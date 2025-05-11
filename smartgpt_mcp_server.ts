#!/usr/bin/env node
// SmartGPT MCP Server — Core intelligence tools for AI assistants
// ============================================================================
// Implements the Model Context Protocol for SmartGPT tools using stdio.
// ============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod"; // Import Zod
import * as dotenv from "dotenv";
import debug from "debug";
import { toolsConfig } from "./src/tools/index.ts"; // Assuming toolsConfig is exported
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server, WebSocketServer } from "ws";
import { SmartGPT } from "./src/index.js";
import { MemoryStore } from "./src/memory/memory.js";

// ES Module replacement for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (but don't require them)
const envResult = dotenv.config();
if (envResult.error) {
  console.error(
    "[SmartGPT] Warning: Could not load .env file:",
    envResult.error.message
  );
} else {
  console.error("[SmartGPT] Successfully loaded .env file");
}

// Log API key status
console.error(
  `[SmartGPT] OpenAI API key present: ${!!process.env.OPENAI_API_KEY}`
);
console.error(
  `[SmartGPT] Google API key present: ${!!process.env
    .GOOGLE_GENERATIVE_AI_API_KEY}`
);
console.error(
  `[SmartGPT] Serper API key present: ${!!process.env.SERPER_API_KEY}`
);

const log = debug("smartgpt:mcp");
// Use console.error for logs to ensure they appear in Cursor's MCP output
if (!process.env.DEBUG) {
  debug.enable("smartgpt:mcp");
  debug.log = console.error.bind(console); // Redirect debug output to stderr
} else {
  // Ensure existing debug config also uses stderr if DEBUG is set
  debug.log = console.error.bind(console);
}

// Get package version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
);
const version = packageJson.version || "0.7.0";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Use absolute path for database
const dbPath = path.join(dataDir, "memory.sqlite");

// Initialize SmartGPT
const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || "",
  useNeo4j: false,
});

// Register tools
console.log("[SmartGPT] Registering tool: smartgpt_pro_answer");

// Register the tools with appropriate handlers
const tools = {
  smartgpt_answer: async ({ query }: { query: string }) => {
    try {
      const answer = await smartGPT.answer(query);
      return {
        answer: answer,
        confidence: 0.8,
        sources: [],
      };
    } catch (error) {
      console.error("Error in smartgpt_answer:", error);
      return {
        answer: "Sorry, an error occurred while processing your request.",
        confidence: 0,
        sources: [],
      };
    }
  },

  smartgpt_pro_answer: async ({
    query,
    depth = 3,
  }: {
    query: string;
    depth?: number;
  }) => {
    try {
      // Get answer with sources and reasoning
      const result = await smartGPT.pro(query, {
        depth: Math.min(Math.max(1, depth), 5),
      });
      return {
        answer: result.answer,
        reasoning: result.reasoning,
        sources: result.sources || [],
        confidence: result.confidence || 0.5,
      };
    } catch (error) {
      console.error("Error in smartgpt_pro_answer:", error);
      return {
        answer: "Sorry, an error occurred while processing your request.",
        reasoning: "An internal error prevented processing your query.",
        sources: [],
        confidence: 0,
      };
    }
  },
};

console.log("[SmartGPT] Tool registration complete.");

// Create MCP server on HTTP
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SmartGPT MCP Server Running\n");
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("[SmartGPT MCP] Client connected");

  // Send hello message
  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: true },
        },
        serverInfo: {
          name: "SmartGPT",
          version: "0.7.0",
          description:
            "AI Assistant Intelligence Toolkit with advanced model access and data processing capabilities",
        },
      },
      id: 0,
    })
  );

  // Handle incoming messages
  ws.on("message", async (message) => {
    try {
      const request = JSON.parse(message.toString());
      console.log(
        "[SmartGPT MCP] [info] Message from client:",
        JSON.stringify(request)
      );

      // Handle different method types
      if (request.method === "tools/list") {
        // Return list of available tools
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              tools: [
                {
                  name: "smartgpt_answer",
                  description:
                    "Get a concise, accurate answer using SmartGPT intelligence",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description:
                          "The question or request to answer using SmartGPT",
                      },
                    },
                    required: ["query"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                  },
                },
                {
                  name: "smartgpt_pro_answer",
                  description:
                    "Get a comprehensive answer with deep reasoning using SmartGPT Pro intelligence",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description:
                          "The question or request to answer using SmartGPT Pro",
                      },
                      depth: {
                        type: "number",
                        description: "Reasoning depth level (1-5, default: 3)",
                      },
                    },
                    required: ["query"],
                    additionalProperties: false,
                    $schema: "http://json-schema.org/draft-07/schema#",
                  },
                },
              ],
            },
          })
        );
      } else if (request.method === "tools/call") {
        const { name, arguments: args } = request.params;

        console.log(`[SmartGPT] Invoking tool: ${name}`);

        // Check if tool exists
        if (tools[name]) {
          try {
            // Execute the tool
            const result = await tools[name](args);

            // Send response
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                result: { output: result },
              })
            );
          } catch (error) {
            console.error(`Error executing tool ${name}:`, error);
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                error: {
                  code: -32000,
                  message: `Error executing tool: ${error.message}`,
                },
              })
            );
          }
        } else {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32601,
                message: `Tool not found: ${name}`,
              },
            })
          );
        }
      } else {
        // Method not implemented
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: "Method not found",
            },
          })
        );
      }
    } catch (error) {
      console.error("[SmartGPT MCP] Error processing message:", error);
      // Send error response
      try {
        const request = JSON.parse(message.toString());
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32700,
              message: "Parse error or internal error",
            },
          })
        );
      } catch (e) {
        // If we can't parse the original message
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Invalid JSON",
            },
          })
        );
      }
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    console.log("[SmartGPT MCP] Client disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SmartGPT] Server started and listening on port ${PORT}`);
});

// Ensure stdout is only used for JSON messages
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = function (
  chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((err?: Error) => void),
  callback?: (err?: Error) => void
): boolean {
  // Only allow JSON messages to pass through
  if (typeof chunk === "string" && !chunk.startsWith("{")) {
    return true; // Silently skip non-JSON messages
  }
  return originalStdoutWrite(chunk, encodingOrCallback as any, callback as any);
};
