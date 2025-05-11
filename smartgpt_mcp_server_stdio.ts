import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { SmartGPT } from "./src/core/smartGPT.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ES Module replacement for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version info
let packageJson = {};
try {
  packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );
} catch (error) {
  console.error(
    "[SmartGPT] Warning: Unable to read package.json for version info",
    error
  );
}

// Load tools configuration from file
let toolsConfig = [];
try {
  toolsConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, "tools.json"), "utf8")
  );
} catch (error) {
  console.error(
    "[SmartGPT] Warning: Unable to read tools.json configuration",
    error
  );
}

// Get version from package.json or use fallback
const version = packageJson.version || "0.7.0";

// MCP Server Definition with improved naming
const server = new McpServer({
  name: "SmartGPT",
  version: version,
  description:
    "AI Assistant Intelligence Toolkit with advanced model access and data processing capabilities",
});

// Filter to only include smartgpt_answer and smartgpt_pro_answer tools
const enabledTools = toolsConfig.filter(
  (tool) =>
    tool.name === "smartgpt_answer" || tool.name === "smartgpt_pro_answer"
);

// Initialize SmartGPT with database path in data directory
const smartGPT = new SmartGPT({
  apiKey: process.env.OPENAI_API_KEY || "",
  neo4j: {
    url: "bolt://localhost:7687",
    username: "neo4j",
    password: "password",
  },
  useNeo4j: false, // Use memory fallback
  dbPath: path.join(dataDir, "memory.sqlite"), // Set database path
});

// Function to register tools with the MCP server
async function registerTools(mcpServer: McpServer) {
  console.log(`[SmartGPT] Registering ${enabledTools.length} tools...`);
  const toolFunctions = await import("./src/tools/index.js");

  for (const tool of enabledTools) {
    console.log(`[SmartGPT] Registering tool: ${tool.name}`);
    const toolHandler = toolFunctions[tool.name];

    if (!toolHandler) {
      console.error(
        `[SmartGPT] [ERROR] Handler function not found for tool: ${tool.name}`
      );
      continue; // Skip registration if handler is missing
    }

    // Ensure the schema is a Zod object schema
    const inputSchema = tool.schema.input;
    if (!(inputSchema instanceof z.ZodObject)) {
      console.error(
        `[SmartGPT] [ERROR] Tool ${tool.name} schema is not a ZodObject. Skipping.`
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
          console.log(`[SmartGPT] Invoking tool: ${tool.name}`);
          try {
            // Validate input arguments using the tool's full schema
            const validatedArgs = inputSchema.parse(args);
            const result = await toolHandler(validatedArgs); // Pass validated args

            // Format result for MCP
            return formatToolResponse(result);
          } catch (error: any) {
            console.error(
              `[SmartGPT] [ERROR] Error executing tool ${tool.name}:`,
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
        `[SmartGPT] [ERROR] Failed to register tool ${tool.name}:`,
        registrationError
      );
    }
  }
  console.log("[SmartGPT] Tool registration complete.");
}

// Format tool response for MCP
function formatToolResponse(result: any): any {
  // Ensure the result is serializable and fits MCP expectations
  let outputText = "";
  if (typeof result === "string") {
    outputText = result;
  } else if (typeof result === "object" && result !== null) {
    outputText = JSON.stringify(result, null, 2);
  } else {
    outputText = String(result); // Fallback
  }

  // Limit output size if necessary
  const MAX_OUTPUT_LENGTH = 100000; // Increased limit for better responses
  if (outputText.length > MAX_OUTPUT_LENGTH) {
    outputText = outputText.substring(0, MAX_OUTPUT_LENGTH) + "... (truncated)";
  }

  // Format the output for MCP
  return {
    content: [
      {
        type: "text",
        text: outputText,
      },
    ],
  };
}

// Main function to set up and run the server
async function main() {
  console.log("[SmartGPT] Initializing server...");

  try {
    // Register tools
    await registerTools(server);

    // Setup transport
    const transport = new StdioServerTransport();

    transport.onerror = (error) => {
      console.error(`[SmartGPT] Transport error: ${error.message}`);
    };

    // Connect the server
    await server.connect(transport);
    console.log(
      "[SmartGPT] Server started and connected successfully via stdio."
    );
  } catch (error) {
    console.error("[SmartGPT] [FATAL] Server initialization failed:", error);
    process.exit(1); // Exit if initialization fails
  }
}

// Run the server
main().catch((error) => {
  console.error("[SmartGPT] [FATAL] Unhandled error in main:", error);
  process.exit(1);
});
