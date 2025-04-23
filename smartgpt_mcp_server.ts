#!/usr/bin/env node
// smartgpt_mcp_server.ts — MCP (Master Control Program) server for SmartGPT
// ============================================================================
// Implements the Model Context Protocol for SmartGPT tools using stdio.
// ============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod"; // Import Zod
import * as dotenv from "dotenv";
import debug from "debug";
import { toolsConfig } from "./src/tools/index.js"; // Assuming toolsConfig is exported
import { fileURLToPath } from "url";
import path from "path";

// ES Module replacement for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const log = debug("smartgpt:mcp");
// Use console.error for logs to ensure they appear in Cursor's MCP output
if (!process.env.DEBUG) {
  debug.enable("smartgpt:mcp");
  debug.log = console.error.bind(console); // Redirect debug output to stderr
} else {
  // Ensure existing debug config also uses stderr if DEBUG is set
  debug.log = console.error.bind(console);
}

// --- Removed SmartGPT instance initialization here, as tools might handle their own state ---
// If SmartGPT class instance is needed globally by tools, it should be initialized here
// and potentially passed to tool handlers if they require it.
// const smartGPT = new SmartGPT(smartGPTConfig); // Example if needed

// MCP Server Definition
const server = new McpServer({
  name: "smartgpt-mcp-server",
  version: "0.7.0", // Consider pulling from package.json
});

// Function to register tools with the MCP server
async function registerTools(mcpServer: McpServer) {
  console.error(`[SmartGPT MCP] Registering ${toolsConfig.length} tools...`);
  const toolFunctions = await import("./src/tools/index.js");

  for (const tool of toolsConfig) {
    console.error(`[SmartGPT MCP] Registering tool: ${tool.name}`);
    const toolHandler = toolFunctions[tool.name];

    if (!toolHandler) {
      console.error(
        `[SmartGPT MCP] [ERROR] Handler function not found for tool: ${tool.name}`
      );
      continue; // Skip registration if handler is missing
    }

    // Ensure the schema is a Zod object schema
    const inputSchema = tool.schema.input;
    if (!(inputSchema instanceof z.ZodObject)) {
      console.error(
        `[SmartGPT MCP] [ERROR] Tool ${tool.name} schema is not a ZodObject. Skipping.`
      );
      continue;
    }

    try {
      // Directly use the Zod schema shape
      mcpServer.tool(
        tool.name,
        tool.description,
        inputSchema.shape as ZodRawShape, // Use the shape directly
        async (args: Record<string, any>) => {
          console.error(`[SmartGPT MCP] Invoking tool: ${tool.name}`);
          try {
            // Validate input arguments using the tool's full schema
            const validatedArgs = inputSchema.parse(args);
            const result = await toolHandler(validatedArgs); // Pass validated args

            // Ensure the result is serializable and fits MCP expectations
            // The SDK expects a specific format, often { content: [{ type: 'text', text: '...' }] }
            // Adjust this based on how your tools return results.
            // Simple example: assume tools return an object or string
            let outputText = "";
            if (typeof result === "string") {
              outputText = result;
            } else if (typeof result === "object" && result !== null) {
              outputText = JSON.stringify(result, null, 2);
            } else {
              outputText = String(result); // Fallback
            }

            // Limit output size if necessary
            const MAX_OUTPUT_LENGTH = 10000; // Example limit
            if (outputText.length > MAX_OUTPUT_LENGTH) {
              outputText =
                outputText.substring(0, MAX_OUTPUT_LENGTH) + "... (truncated)";
            }

            console.error(
              `[SmartGPT MCP] Tool ${tool.name} invocation successful.`
            );
            // Format the output for MCP
            return {
              content: [
                {
                  type: "text",
                  text: outputText,
                },
              ],
            };
          } catch (error: any) {
            console.error(
              `[SmartGPT MCP] [ERROR] Error executing tool ${tool.name}:`,
              error
            );
            // Return error information in MCP format
            return {
              content: [
                {
                  type: "text",
                  text: `Error executing tool ${tool.name}: ${error.message}`,
                },
              ],
              isError: true,
            };
          }
        }
      );
    } catch (registrationError: any) {
      console.error(
        `[SmartGPT MCP] [ERROR] Failed to register tool ${tool.name}:`,
        registrationError
      );
    }
  }
  console.error("[SmartGPT MCP] Tool registration complete.");
}

// Main function to set up and run the server
async function main() {
  console.error("[SmartGPT MCP] Initializing server...");

  try {
    // Register tools
    await registerTools(server);

    // Setup transport
    const transport = new StdioServerTransport();

    transport.onerror = (error) => {
      console.error(`[SmartGPT MCP] Transport error: ${error.message}`);
    };

    // Connect the server
    await server.connect(transport);
    console.error(
      "[SmartGPT MCP] Server started and connected successfully via stdio."
    );
  } catch (error) {
    console.error(
      "[SmartGPT MCP] [FATAL] Server initialization failed:",
      error
    );
    process.exit(1); // Exit if initialization fails
  }
}

// Run the server
main().catch((error) => {
  console.error("[SmartGPT MCP] [FATAL] Unhandled error in main:", error);
  process.exit(1);
});

// --- Removed Express app setup and endpoints ---
// --- Removed systemInfo, manifest, cursorTools generation (handled by SDK) ---
// --- Removed markdownToHtml function ---
// --- Removed old main function with app.listen ---
