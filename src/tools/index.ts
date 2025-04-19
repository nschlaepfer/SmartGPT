// Tools configuration
import toolsConfig from "./config.js";

// File system tools
export { read_csv, read_json, read_markdown, read_pdf } from "./filesystem.js";

// MacOS sandboxed shell tool
export { macos_shell } from "./sandbox.js";

// AI model provider tools
export {
  openai_completion,
  anthropic_completion,
  google_gemini,
  groq_completion,
} from "./models.js";

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
