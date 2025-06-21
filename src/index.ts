#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { DatabaseManager } from './database.js';
import { createToolDefinitions } from './tools.js';
import { ToolHandlers } from './handlers.js';
import { ResourceHandlers } from './resources.js';

const server = new Server(
  {
    name: 'postgres-multi-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

const config = loadConfig();
const dbManager = new DatabaseManager(config);
const toolHandlers = new ToolHandlers(dbManager, config);
const resourceHandlers = new ResourceHandlers(dbManager);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return resourceHandlers.handleListResources();
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return resourceHandlers.handleReadResource(request);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const databaseNames = Object.keys(dbManager.getDatabases());
  return {
    tools: createToolDefinitions(databaseNames),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return toolHandlers.handleToolCall(request);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on('SIGINT', async () => {
  await dbManager.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbManager.closeAll();
  process.exit(0);
});

runServer().catch(console.error);