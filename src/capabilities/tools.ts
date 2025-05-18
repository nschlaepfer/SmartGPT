import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toolsConfig } from '../tools/config.js';
import * as handlers from '../tools/index.js';

export function registerTools(server: McpServer) {
  for (const tool of toolsConfig) {
    const handler = (handlers as any)[tool.name];
    if (!handler) continue;
    server.tool(tool.name, tool.description, tool.schema.input.shape as any, async (args: any) => {
      const result = await handler(args);
      return typeof result === 'string'
        ? { content: [{ type: 'text', text: result }] }
        : { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
  }
}
