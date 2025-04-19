// smartgpt_mcp_server.ts — MCP (Master Control Program) server for SmartGPT
// ============================================================================
// This is the central control interface for the SmartGPT system, providing
// access to both individual tools and the complete dual-model pipeline.
//
// Usage:
//    tsx smartgpt_mcp_server.ts      # spins up localhost:4141
// ============================================================================

import express from "express";
import { SmartGPT } from "./src/index.js";
import * as dotenv from "dotenv";
import debug from "debug";
import { toolsConfig, read_markdown } from "./src/tools/index.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// ES Module replacement for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const log = debug("smartgpt:mcp");
if (!process.env.DEBUG) debug.enable("smartgpt:mcp");

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

// Initialize SmartGPT instance
const smartGPT = new SmartGPT(smartGPTConfig);

// Initialize Express app
const app = express();
app.use(express.json({ limit: "2mb" }));

// Add CORS headers for better compatibility with Cursor
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    next();
  }
);

// System information
const systemInfo = {
  name: "SmartGPT Control Interface",
  version: "0.7.0",
  description:
    "Comprehensive API for SmartGPT dual-model pipeline and toolchain",
  contextModel: smartGPTConfig.contextModel,
  reasoningModel: smartGPTConfig.reasoningModel,
  deepExploration: smartGPTConfig.deep,
  neo4j: smartGPTConfig.useNeo4j,
  endpoints: {
    "/": "System information and documentation",
    "/api/readme": "Full README documentation in HTML and Markdown formats",
    "/mcp/manifest": "List all available tools and their parameters",
    "/mcp/invoke": "Execute a specific tool with provided input",
    "/api/ask": "Ask a question using the SmartGPT dual-model pipeline",
    "/api/thoughtchain":
      "Run a multi-step reasoning process with drafts and refinement",
    "/api/websearch": "Perform a web search with real-time information",
    "/api/system": "Get detailed system configuration and status",
    "/sse": "Server-Sent Events endpoint for Cursor MCP integration",
  },
};

// Generate API manifest (for tools)
const manifest = {
  schema_version: "0.1",
  name_for_human: "SmartGPT Tool Hub",
  name_for_model: "smartgpt_tools",
  description_for_human:
    "Unified tool hub powered by SmartGPT (reasoning, context, tools)",
  description_for_model:
    "Expose SmartGPT tools via MCP so any LLM client can invoke them.",
  tools: toolsConfig.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.schema.input.shape).map(
          ([key, schema]: [string, any]) => [
            key,
            {
              type: schema._def.typeName === "ZodNumber" ? "number" : "string",
              description: schema.description,
            },
          ]
        )
      ),
      required: Object.keys(tool.schema.input.shape).filter(
        (key) =>
          !(tool.schema.input.shape as Record<string, any>)[key].isOptional()
      ),
    },
  })),
};

// Root endpoint with documentation
app.get("/", (req, res) => {
  res.json(systemInfo);
});

// System information endpoint
app.get("/api/system", (req, res) => {
  const status = {
    ...systemInfo,
    memory: {
      heapUsed: process.memoryUsage().heapUsed / 1024 / 1024,
      heapTotal: process.memoryUsage().heapTotal / 1024 / 1024,
    },
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      serper: !!process.env.SERPER_API_KEY,
    },
    toolsCount: toolsConfig.length,
    runningTime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  };

  res.json(status);
});

// README documentation endpoint
app.get("/api/readme", async (req, res) => {
  try {
    const format = req.query.format?.toString()?.toLowerCase() || "json";

    // Read README.md file using the existing tool
    const readmeResult = await read_markdown({ filePath: "README.md" });
    const content = readmeResult.content;

    // Send response based on requested format
    if (format === "html") {
      // Convert markdown to simple HTML
      const htmlContent = markdownToHtml(content);
      res.setHeader("Content-Type", "text/html");
      res.send(htmlContent);
    } else if (format === "markdown" || format === "md") {
      res.setHeader("Content-Type", "text/markdown");
      res.send(content);
    } else {
      // Default JSON response
      res.json({
        content,
        format: "markdown",
        endpoints: systemInfo.endpoints,
        html_url: `${req.protocol}://${req.get("host")}/api/readme?format=html`,
      });
    }
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Return manifest of available tools
app.get("/mcp/manifest", (req, res) => {
  res.json(manifest);
});

// Tool invocation endpoint
app.post("/mcp/invoke", async (req, res) => {
  try {
    const { tool, input } = req.body as { tool: string; input: any };

    // Find the matching tool in toolsConfig
    const toolConfig = toolsConfig.find((t) => t.name === tool);
    if (!toolConfig) {
      throw new Error(`Unknown tool: ${tool}`);
    }

    // Import the tool function dynamically
    const toolFunction = (await import(`./src/tools/index.js`))[tool];
    if (!toolFunction) {
      throw new Error(`Tool function not found: ${tool}`);
    }

    // Execute the tool with the provided input
    const output = await toolFunction(input);
    res.json({ output });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// === CURSOR MCP INTEGRATION USING SSE ===

// Format tools for Cursor MCP
const cursorTools = toolsConfig.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(tool.schema.input.shape).map(
        ([key, schema]: [string, any]) => [
          key,
          {
            type: schema._def.typeName === "ZodNumber" ? "number" : "string",
            description: schema.description || `Parameter: ${key}`,
          },
        ]
      )
    ),
    required: Object.keys(tool.schema.input.shape).filter(
      (key) =>
        !(tool.schema.input.shape as Record<string, any>)[key].isOptional()
    ),
  },
}));

// Handle SSE connection from Cursor
app.get("/sse", (req, res) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  };
  res.writeHead(200, headers);

  // Send initial tools data
  const toolsData = {
    tools: cursorTools,
    resources: {},
    prompts: {},
  };
  res.write(`data: ${JSON.stringify(toolsData)}\n\n`);

  // Send heartbeat every 15 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write("data: heartbeat\n\n");
  }, 15000);

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(heartbeatInterval);
    log("Client disconnected from SSE");
  });

  log("Client connected to SSE endpoint");
});

// Handle tool invocation from Cursor - keep both endpoints for compatibility
app.post("/invoke", async (req, res) => {
  try {
    const { name, parameters } = req.body;
    log(`Cursor tool invocation: ${name} with params:`, parameters);

    // Import the tool function dynamically
    const toolFunction = (await import(`./src/tools/index.js`))[name];
    if (!toolFunction) {
      res.status(404).json({
        error: `Tool not found: ${name}`,
        message: `The tool '${name}' was not found in the tools registry.`,
      });
      return;
    }

    // Execute the tool
    const result = await toolFunction(parameters);
    res.json(result);
  } catch (error) {
    log(`Tool invocation error:`, error);
    res.status(500).json({
      error: "Tool execution failed",
      message: (error as Error).message,
    });
  }
});

// Add Cursor-specific MCP endpoint format for tool invocation
app.post("/mcp/invoke/call", async (req, res) => {
  try {
    const { name, parameters } = req.body;
    log(
      `Cursor tool invocation (call format): ${name} with params:`,
      parameters
    );

    // Import the tool function dynamically
    const toolFunction = (await import(`./src/tools/index.js`))[name];
    if (!toolFunction) {
      res.status(404).json({
        error: `Tool not found: ${name}`,
        message: `The tool '${name}' was not found in the tools registry.`,
      });
      return;
    }

    // Execute the tool
    const result = await toolFunction(parameters);
    res.json(result);
  } catch (error) {
    log(`Tool invocation error:`, error);
    res.status(500).json({
      error: "Tool execution failed",
      message: (error as Error).message,
    });
  }
});

// === DUAL-MODEL PIPELINE ENDPOINTS ===

// Ask endpoint (uses the dual-model pipeline)
app.post("/api/ask", async (req, res) => {
  try {
    const { query } = req.body as { query: string };
    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string");
    }

    const answer = await smartGPT.ask(query);
    res.json({ answer });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ThoughtChain endpoint (multi-step reasoning)
app.post("/api/thoughtchain", async (req, res) => {
  try {
    const { query, drafts = 2 } = req.body as {
      query: string;
      drafts?: number;
    };
    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string");
    }

    const result = await smartGPT.thoughtChain(query, drafts);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Web search endpoint
app.post("/api/websearch", async (req, res) => {
  try {
    const { query } = req.body as { query: string };
    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string");
    }

    const results = await smartGPT.webSearch(query);
    res.json({ results });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  // Convert headers
  let html = markdown
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^##### (.+)$/gm, "<h5>$1</h5>")
    .replace(/^###### (.+)$/gm, "<h6>$1</h6>");

  // Convert code blocks
  html = html.replace(
    /```([a-z]*)\n([\s\S]*?)\n```/g,
    '<pre><code class="language-$1">$2</code></pre>'
  );

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Convert bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Convert lists
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.+<\/li>\n)+/g, "<ul>$&</ul>");

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert paragraphs (needs to be after the other conversions)
  html = html.replace(/^(?!<[a-z]).+$/gm, "<p>$&</p>");

  // Add HTML structure
  html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGPT Documentation</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 1em; color: #333; }
    h1, h2, h3 { color: #2c3e50; }
    code, pre { background-color: #f6f8fa; border-radius: 3px; }
    code { padding: 0.2em 0.4em; }
    pre { padding: 1em; overflow-x: auto; }
    a { color: #3498db; }
    p, ul, ol { margin-bottom: 1em; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

  return html;
}

// Start server
async function main() {
  const port = Number(process.env.MCP_PORT ?? 4141);

  try {
    // Start server
    app.listen(port, () => {
      console.log(
        `🧠 SmartGPT Model Context Protocol running at http://localhost:${port}`
      );
      console.log("Available endpoints:");
      console.log(
        "  GET  /                  - System information and documentation"
      );
      console.log(
        "  GET  /api/readme        - Full README documentation (formats: json, html, markdown)"
      );
      console.log(
        "  GET  /api/system        - Detailed system status and configuration"
      );
      console.log("  GET  /mcp/manifest      - List all available tools");
      console.log(
        "  GET  /sse               - Server-Sent Events endpoint for Cursor MCP integration"
      );
      console.log("  POST /mcp/invoke        - Execute a specific tool");
      console.log(
        "  POST /api/ask           - Use dual-model pipeline for questions"
      );
      console.log(
        "  POST /api/thoughtchain  - Multi-step reasoning with refinement"
      );
      console.log(
        "  POST /api/websearch     - Search the web for real-time information"
      );
    });
  } catch (error) {
    console.error("Failed to start MCP server:", error);
  }
}

// Run main function immediately
// ES modules don't have require.main === module
main().catch(console.error);
