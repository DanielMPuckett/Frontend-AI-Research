import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDb } from './db.js';
import { embed } from './embeddings.js';
import { memoryQuery, memoryWrite, memoryUpdate, memoryPrune } from './tools.js';

const TOOLS = [
  {
    name: 'memory_query',
    description: 'Query agent memory for semantically similar records using vector search.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string', description: 'Name of the agent querying memory' },
        query: { type: 'string', description: 'Task description to find relevant memories for' },
        tier: { type: 'string', enum: ['global', 'project'], description: 'Memory tier to search' },
        project_slug: { type: 'string', description: 'Required when tier is project' },
        limit: { type: 'number', description: 'Max records to return (default 5)' },
      },
      required: ['agent_name', 'query', 'tier'],
    },
  },
  {
    name: 'memory_write',
    description: 'Store a new memory record with its vector embedding.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string' },
        tier: { type: 'string', enum: ['global', 'project'] },
        content: { type: 'string', description: 'One specific, factual sentence' },
        category: {
          type: 'string',
          enum: ['preference', 'rejection', 'best-practice', 'repeated-request', 'decision', 'constraint', 'inter-agent'],
        },
        confidence: { type: 'number', description: 'Between 0.0 and 1.0' },
        project_slug: { type: 'string', description: 'Required when tier is project' },
      },
      required: ['agent_name', 'tier', 'content', 'category', 'confidence'],
    },
  },
  {
    name: 'memory_update',
    description: 'Update the confidence score or content of an existing memory record.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Memory record ID to update' },
        confidence: { type: 'number', description: 'New confidence value (clamped to 0.0–1.0)' },
        content: { type: 'string', description: 'New content (triggers re-embedding)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'memory_prune',
    description: 'Delete all memory records for an agent below a confidence threshold.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string' },
        below_confidence: { type: 'number', description: 'Records below this value are deleted' },
      },
      required: ['agent_name', 'below_confidence'],
    },
  },
];

const server = new Server(
  { name: 'memory', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const db = getDb();

  try {
    let result;

    if (name === 'memory_query') {
      result = await memoryQuery(db, embed, args);
    } else if (name === 'memory_write') {
      result = await memoryWrite(db, embed, args);
    } else if (name === 'memory_update') {
      result = await memoryUpdate(db, embed, args);
    } else if (name === 'memory_prune') {
      result = await memoryPrune(db, args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } finally {
    db.close();
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
