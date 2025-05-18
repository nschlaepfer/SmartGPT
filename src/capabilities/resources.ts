import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/server/schemas.js';
import { readFile } from 'fs/promises';
import path from 'path';

export function registerResources(server: McpServer) {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: `file://${path.resolve('readme.md')}`,
        name: 'Project README',
        mimeType: 'text/markdown',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async ({ uri }) => {
    const filePath = uri.startsWith('file://') ? uri.slice(7) : uri;
    const content = await readFile(filePath, 'utf-8');
    return { content };
  });
}
