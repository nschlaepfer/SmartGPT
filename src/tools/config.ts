import { z } from "zod";

// Define Zod schemas for tool inputs and outputs
// These will be used for validation and type safety

// MacOS Shell Tool
export const macosShellInput = z.object({
  command: z.string().describe("The shell command to execute."),
});

export const macosShellOutput = z.object({
  stdout: z.string().describe("Standard output of the command."),
  stderr: z.string().describe("Standard error of the command."),
  exitCode: z.number().describe("Process exit code (0 means success)."),
});

// Codex SDK Tool
export const codexSdkInput = z.object({
  prompt: z.string().describe("The user prompt or task for Codex."),
  model: z
    .string()
    .optional()
    .describe("Codex model name (optional, default uses Codex config)."),
  threadId: z
    .string()
    .optional()
    .describe("Existing Codex thread ID to resume (optional)."),
});

export const codexSdkOutput = z.object({
  completion: z.string().describe("The final response from Codex."),
  threadId: z
    .string()
    .optional()
    .describe("Thread ID for follow-up Codex runs."),
});

// Claude Code (Agent) SDK Tool
export const claudeCodeSdkInput = z.object({
  prompt: z.string().describe("The task prompt for Claude Code."),
  model: z
    .string()
    .optional()
    .describe("Claude model name (optional, default uses Claude Code config)."),
  maxTurns: z
    .number()
    .optional()
    .describe("Maximum turns the agent can take (optional)."),
  systemPrompt: z
    .string()
    .optional()
    .describe("System prompt to steer Claude Code behavior (optional)."),
  allowedTools: z
    .array(z.string())
    .optional()
    .describe(
      "Restrict tools Claude Code can use (optional, e.g. ['Bash','Read','Write'])."
    ),
  cwd: z
    .string()
    .optional()
    .describe("Working directory for Claude Code execution (optional)."),
});

export const claudeCodeSdkOutput = z.object({
  completion: z.string().describe("The final response from Claude Code."),
});

// Web Search Tool
export const webSearchInput = z.object({
  query: z.string().describe("The search query to find real-time information."),
  numResults: z
    .number()
    .optional()
    .describe("Number of search results to return (default: 5)."),
});

export const webSearchOutput = z.object({
  results: z
    .array(
      z.object({
        title: z.string().describe("Title of the search result."),
        link: z.string().describe("URL of the search result."),
        snippet: z.string().describe("Text snippet from the search result."),
        source: z.string().optional().describe("Source domain of the result."),
      })
    )
    .describe("Array of search results from the web."),
  searchTime: z.number().optional().describe("Search time in seconds."),
});

// File Tools
export const readCsvInput = z.object({
  filePath: z.string().describe("Path to the CSV file to read."),
});

export const readCsvOutput = z.object({
  data: z
    .array(z.record(z.any()))
    .describe("Array of records (objects) from the CSV, one per row."),
});

export const readJsonInput = z.object({
  filePath: z.string().describe("Path to the JSON file to read."),
});

export const readJsonOutput = z.object({
  data: z.any().describe("Parsed JSON content (could be object or array)."),
});

export const readMarkdownInput = z.object({
  filePath: z.string().describe("Path to the Markdown file to read."),
});

export const readMarkdownOutput = z.object({
  content: z.string().describe("The raw text content of the Markdown file."),
});

export const readPdfInput = z.object({
  filePath: z.string().describe("Path to the PDF file to read."),
});

export const readPdfOutput = z.object({
  content: z.string().describe("The extracted text content of the PDF."),
});

// Tool metadata in format compatible with tools.json
export const toolsConfig = [
  {
    name: "macos_shell",
    description:
      "Execute a shell command in a secure macOS sandbox (no network, limited file access).",
    schema: {
      input: macosShellInput,
      output: macosShellOutput,
    },
  },
  {
    name: "codex_sdk",
    description:
      "Run a task using the OpenAI Codex SDK (uses Codex login or API key).",
    schema: {
      input: codexSdkInput,
      output: codexSdkOutput,
    },
  },
  {
    name: "claude_code_sdk",
    description:
      "Run a task using the Claude Code (Claude Agent) SDK (subscription or API key).",
    schema: {
      input: claudeCodeSdkInput,
      output: claudeCodeSdkOutput,
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for real-time information on a given query using Serper API.",
    schema: {
      input: webSearchInput,
      output: webSearchOutput,
    },
  },
  {
    name: "read_csv",
    description:
      "Read a CSV file from local disk and return its contents as JSON records.",
    schema: {
      input: readCsvInput,
      output: readCsvOutput,
    },
  },
  {
    name: "read_json",
    description:
      "Read a JSON file from local disk and return its parsed contents.",
    schema: {
      input: readJsonInput,
      output: readJsonOutput,
    },
  },
  {
    name: "read_markdown",
    description: "Read a Markdown (.md) file and return its text content.",
    schema: {
      input: readMarkdownInput,
      output: readMarkdownOutput,
    },
  },
  {
    name: "read_pdf",
    description: "Read a PDF file and extract its text content for analysis.",
    schema: {
      input: readPdfInput,
      output: readPdfOutput,
    },
  },
];

export default toolsConfig;
