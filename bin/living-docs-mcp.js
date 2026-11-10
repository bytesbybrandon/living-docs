#!/usr/bin/env node
import { startStdioServer } from '../src/mcp/server.js';

startStdioServer().catch(error => {
  process.stderr.write(`living-docs-mcp: ${error.stack || error.message}\n`);
  process.exit(1);
});
