// Tools configuration
import toolsConfig from "./config.js";

// File system tools
export { read_csv, read_json, read_markdown, read_pdf } from "./filesystem.js";

// MacOS sandboxed shell tool
export { macos_shell } from "./sandbox.js";

// AI model provider tools
export {
  codex_sdk,
  claude_code_sdk,
} from "./models.js";

// Web search tool
export { web_search } from "./web_search.js";

// Re-export config
export { toolsConfig };

// Tool JSON schema for SmartGPT integration
export const TOOLS_JSON = JSON.stringify(
  toolsConfig.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.schema.input.shape).map(
          ([key, schema]: [string, any]) => [
            key,
            {
              type:
                schema._def.typeName === "ZodNumber"
                  ? "number"
                  : schema._def.typeName === "ZodArray"
                  ? "array"
                  : schema._def.typeName === "ZodObject"
                  ? "object"
                  : "string",
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
    returns: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.schema.output.shape).map(
          ([key, schema]: [string, any]) => [
            key,
            {
              type:
                schema._def.typeName === "ZodNumber"
                  ? "number"
                  : schema._def.typeName === "ZodArray"
                  ? "array"
                  : "string",
              description: schema.description,
            },
          ]
        )
      ),
    },
  })),
  null,
  2
);
