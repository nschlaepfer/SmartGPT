import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import express, { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { IncomingMessage, ServerResponse, Server } from "http";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { SmartGPT } from "./src/index.js";
import * as dotenv from "dotenv";
import * as toolsImport from "./src/tools/index.js";
import yaml from "js-yaml";

// Load environment variables
dotenv.config();

export const Logger = {
  log: (...args: any[]) => {
    console.error("[INFO]", ...args);
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args);
  },
};

// SmartGPT configuration
const smartGPTConfig = {
  apiKey: process.env.OPENAI_API_KEY || "",
  googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  contextModel: "gpt-4.1",
  reasoningModel: "o4-mini",
  deep: true,
  serperApiKey: process.env.SERPER_API_KEY,
  useNeo4j: false,
};

export class SmartGPTMcpServer {
  public readonly server: McpServer;
  private readonly smartGPT: SmartGPT;
  private transports: { [sessionId: string]: SSEServerTransport } = {};
  private httpServer: Server | null = null;
  private tools: any;

  constructor() {
    // Initialize SmartGPT instance
    this.smartGPT = new SmartGPT(smartGPTConfig);
    this.tools = toolsImport;

    // Initialize MCP server
    this.server = new McpServer(
      {
        name: "SmartGPT MCP Server",
        version: "0.7.0",
      },
      {
        capabilities: {
          logging: {},
          tools: {},
        },
      }
    );

    Logger.log("Initializing SmartGPT MCP Server");
    this.registerTools();
    Logger.log(`Registered tools with the MCP server`);
  }

  private registerTools(): void {
    // Register the ask tool - core SmartGPT dual-model pipeline
    Logger.log("Registering ask tool");
    this.server.tool(
      "ask",
      "Ask a question using the SmartGPT dual-model pipeline",
      {
        query: z.string().describe("The query to ask SmartGPT"),
      },
      async ({ query }) => {
        try {
          Logger.log(`Processing query: ${query}`);
          const answer = await this.smartGPT.ask(query);
          Logger.log(`Successfully processed query`);

          return {
            content: [{ type: "text", text: answer }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          Logger.error(`Error processing query:`, message);
          return {
            isError: true,
            content: [
              { type: "text", text: `Error processing query: ${message}` },
            ],
          };
        }
      }
    );

    // Register the thoughtchain tool
    Logger.log("Registering thoughtchain tool");
    this.server.tool(
      "thoughtchain",
      "Run a multi-step reasoning process with drafts and refinement",
      {
        query: z.string().describe("The query to process with thoughtchain"),
        drafts: z
          .number()
          .optional()
          .describe("Number of drafts to generate (default: 2)"),
      },
      async ({ query, drafts = 2 }) => {
        try {
          Logger.log(
            `Running thoughtchain for query: ${query} with ${drafts} drafts`
          );
          const result = await this.smartGPT.thoughtChain(query, drafts);
          Logger.log(`Successfully completed thoughtchain`);

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          Logger.error(`Error in thoughtchain:`, message);
          return {
            isError: true,
            content: [
              { type: "text", text: `Error in thoughtchain: ${message}` },
            ],
          };
        }
      }
    );

    // Register the websearch tool
    Logger.log("Registering websearch tool");
    this.server.tool(
      "websearch",
      "Perform a web search with real-time information",
      {
        query: z.string().describe("The search query"),
      },
      async ({ query }) => {
        try {
          Logger.log(`Performing web search for: ${query}`);
          const results = await this.smartGPT.webSearch(query);
          Logger.log(`Successfully completed web search`);

          return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          Logger.error(`Error in web search:`, message);
          return {
            isError: true,
            content: [
              { type: "text", text: `Error in web search: ${message}` },
            ],
          };
        }
      }
    );

    // Register custom tools from toolsConfig
    Logger.log(
      `Found ${Object.keys(this.tools).length} potential tools in toolsImport`
    );
    Logger.log(
      `toolsConfig has ${
        this.tools.toolsConfig ? this.tools.toolsConfig.length : 0
      } tools defined`
    );

    if (!this.tools.toolsConfig) {
      Logger.error("toolsConfig is not defined in tools import");
      return;
    }

    for (const tool of Object.keys(this.tools)) {
      // Skip certain tools or internal functions
      if (tool === "toolsConfig" || tool === "read_markdown") continue;

      // Get the tool function
      const toolFunction = this.tools[tool];
      if (typeof toolFunction !== "function") continue;

      // Find the tool config
      const toolConfig = this.tools.toolsConfig.find(
        (t: any) => t.name === tool
      );
      if (!toolConfig) {
        Logger.log(`No config found for tool: ${tool}, skipping`);
        continue;
      }

      Logger.log(`Registering tool: ${tool}`);

      // Create the parameter schema
      const paramSchema: Record<string, any> = {};
      Object.entries(toolConfig.schema.input.shape).forEach(
        ([key, schema]: [string, any]) => {
          paramSchema[key] = z
            .string()
            .describe(schema.description || `Parameter: ${key}`);
        }
      );

      // Register the tool
      this.server.tool(
        tool,
        toolConfig.description,
        paramSchema,
        async (params) => {
          try {
            Logger.log(`Executing tool: ${tool} with params:`, params);
            const result = await toolFunction(params);
            Logger.log(`Successfully executed tool: ${tool}`);

            return {
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : JSON.stringify(error);
            Logger.error(`Error executing tool ${tool}:`, message);
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Error executing tool ${tool}: ${message}`,
                },
              ],
            };
          }
        }
      );
    }
  }

  async connect(transport: Transport): Promise<void> {
    Logger.log("Connecting transport to MCP server");

    try {
      await this.server.connect(transport);
      Logger.log("Transport connected successfully");
    } catch (error) {
      Logger.error("Failed to connect transport:", error);
      throw error;
    }

    // Ensure stdout is only used for JSON messages
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
      // Only allow JSON messages to pass through
      if (typeof chunk === "string" && !chunk.startsWith("{")) {
        return true; // Silently skip non-JSON messages
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };

    Logger.log("SmartGPT MCP Server connected and ready to process requests");
    // Get the list of registered tool names from somewhere
    const registeredTools = ["ask", "thoughtchain", "websearch"];
    Logger.log(`Available tools: ${registeredTools.join(", ")}`);
  }

  async startHttpServer(port: number): Promise<void> {
    const app = express();

    app.get("/sse", async (req: Request, res: Response) => {
      console.log("Establishing new SSE connection");
      const transport = new SSEServerTransport(
        "/messages",
        res as unknown as ServerResponse<IncomingMessage>
      );
      console.log(
        `New SSE connection established for sessionId ${transport.sessionId}`
      );

      this.transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete this.transports[transport.sessionId];
      });

      await this.server.connect(transport);
    });

    app.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      if (!this.transports[sessionId]) {
        res.status(400).send(`No transport found for sessionId ${sessionId}`);
        return;
      }
      console.log(`Received message for sessionId ${sessionId}`);
      await this.transports[sessionId].handlePostMessage(req, res);
    });

    Logger.log = console.log;
    Logger.error = console.error;

    this.httpServer = app.listen(port, () => {
      Logger.log(`HTTP server listening on port ${port}`);
      Logger.log(`SSE endpoint available at http://localhost:${port}/sse`);
      Logger.log(
        `Message endpoint available at http://localhost:${port}/messages`
      );
    });
  }

  async stopHttpServer(): Promise<void> {
    if (!this.httpServer) {
      throw new Error("HTTP server is not running");
    }

    return new Promise((resolve, reject) => {
      this.httpServer!.close((err: Error | undefined) => {
        if (err) {
          reject(err);
          return;
        }
        this.httpServer = null;
        const closing = Object.values(this.transports).map((transport) => {
          return transport.close();
        });
        Promise.all(closing).then(() => {
          resolve();
        });
      });
    });
  }
}

// Entry point for stdio mode
async function main() {
  const args = process.argv.slice(2);

  // Check if we should run in stdio mode
  const isStdioMode = args.includes("--stdio");

  if (isStdioMode) {
    const server = new SmartGPTMcpServer();

    // Create a proper transport interface for stdio
    class StdioTransport implements Transport {
      private messageCallback: ((message: any) => void) | null = null;

      constructor() {
        // Set up stdin handler for non-blocking input
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        // Handle each chunk of data
        process.stdin.on("data", (data) => {
          try {
            // Split by newlines in case multiple messages arrive at once
            const lines = data.toString().split("\n").filter(Boolean);

            for (const line of lines) {
              try {
                const message = JSON.parse(line);
                Logger.log(`Received message: ${line.substring(0, 100)}...`);

                if (this.messageCallback) {
                  this.messageCallback(message);
                } else {
                  Logger.error("No message callback registered");
                }
              } catch (e) {
                Logger.error(
                  `Failed to parse message line: ${line.substring(0, 50)}...`,
                  e
                );
              }
            }
          } catch (e) {
            Logger.error("Error processing stdin data:", e);
          }
        });

        // Handle stdin errors
        process.stdin.on("error", (err) => {
          Logger.error("stdin error:", err);
        });

        // Detect client disconnection
        process.stdin.on("end", () => {
          Logger.log("stdin ended - client disconnected");
        });
      }

      onMessage(callback: (message: any) => void): void {
        Logger.log("Registering message callback");
        this.messageCallback = callback;
      }

      async send(message: any, options?: any): Promise<void> {
        const serialized = JSON.stringify(message);
        Logger.log(`Sending message: ${serialized.substring(0, 100)}...`);
        console.log(serialized);
      }

      async start(): Promise<void> {
        Logger.log("Starting StdioTransport");
        // Already set up in constructor
      }

      close(): Promise<void> {
        Logger.log("Closing StdioTransport");
        return Promise.resolve();
      }
    }

    try {
      // Connect using the stdio transport
      const transport = new StdioTransport();
      await server.connect(transport);

      // Send initialization message to signal readiness
      await transport.send({
        jsonrpc: "2.0",
        method: "ready",
        params: {},
      });

      Logger.log("Server initialization complete");

      // Keep the process alive
      setInterval(() => {}, 1000);
    } catch (error) {
      Logger.error("Fatal error in stdio mode:", error);
      process.exit(1);
    }
  } else {
    // Start HTTP server on port 4141 or from env
    const port = parseInt(process.env.MCP_PORT || "4141", 10);
    const server = new SmartGPTMcpServer();
    await server.startHttpServer(port);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
