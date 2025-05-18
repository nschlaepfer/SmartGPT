import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/server/schemas.js';
import prompts from '../core/prompts.json' assert { type: 'json' };

export function registerPrompts(server: McpServer) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: Object.keys(prompts).map((name) => ({ name, description: `${name} prompt` })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async ({ name }) => ({
    prompt: prompts[name] ?? '',
  }));
}
