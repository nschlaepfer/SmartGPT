import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerResources } from '../capabilities/resources.js';
import { registerPrompts } from '../capabilities/prompts.js';
import { registerTools } from '../capabilities/tools.js';
import { logger } from '../util/logger.js';

export async function start() {
  const server = new McpServer({ name: 'smartgpt', version: '0.7.0' });

  registerResources(server);
  registerPrompts(server);
  registerTools(server);

  const transport = new StdioServerTransport();
  transport.onerror = (err) => logger.error('transport error', err);

  await server.connect(transport);
  logger.info('SmartGPT MCP server ready');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch((err) => {
    logger.error('fatal', err);
    process.exit(1);
  });
}
