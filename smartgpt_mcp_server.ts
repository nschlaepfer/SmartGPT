#!/usr/bin/env node
import { start } from './src/server/index.js';
import * as dotenv from 'dotenv';

dotenv.config();
start().catch((err) => {
  console.error('SmartGPT MCP failed', err);
  process.exit(1);
});
