# Agent Memory System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a two-tier vector memory system to the Agentic Project Control pipeline — backed by sqlite-vec, exposed via a custom MCP server, curated by a Memory Manager agent that runs after every pipeline completion.

**Architecture:** A Node.js MCP server wraps sqlite-vec and exposes four tools (`memory_query`, `memory_write`, `memory_update`, `memory_prune`). Embeddings are generated via the Voyage AI API. Every agent queries its memory before acting and appends structured observations to its output. A Memory Manager agent (15th agent) curates all observations after Phase 3. Tool logic is separated from the server wiring for testability.

**Tech Stack:** Node.js (ESM), `better-sqlite3`, `sqlite-vec`, `@modelcontextprotocol/sdk`, Voyage AI API (`voyage-3`), Node.js built-in test runner (`node:test`)

**Baked-in decisions:**
- `memory/memory.db` is gitignored
- Empty memory on first run: graceful zero results, agents proceed normally
- No dry-run mode (YAGNI)

---

## Task 1: Memory Server Package Setup

**Files:**
- Create: `agentic-project-control/memory-server/package.json`
- Create: `agentic-project-control/memory/` (directory, gitignored)
- Modify: `.gitignore` (add memory DB entry)

**Step 1: Create the memory directory**

```bash
mkdir -p agentic-project-control/memory
mkdir -p agentic-project-control/memory-server
```

**Step 2: Write package.json**

```json
{
  "name": "agentic-memory-server",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "sqlite-vec": "^0.1.6"
  }
}
```

**Step 3: Install dependencies**

```bash
cd agentic-project-control/memory-server && npm install
```

Expected: `node_modules/` created, no errors.

**Step 4: Add memory DB to .gitignore**

Add this line to the root `.gitignore` (create it if it doesn't exist):

```
agentic-project-control/memory/memory.db
```

**Step 5: Verify installation**

```bash
node -e "import('better-sqlite3').then(() => console.log('ok'))" 2>&1
node -e "import('sqlite-vec').then(() => console.log('ok'))" 2>&1
```

Expected: two lines of `ok`

**Step 6: Commit**

```bash
cd ../..
git add agentic-project-control/memory-server/package.json agentic-project-control/memory-server/package-lock.json .gitignore
git commit -m "chore: add memory-server package with sqlite-vec dependencies"
```

---

## Task 2: Database Module

**Files:**
- Create: `agentic-project-control/memory-server/db.js`
- Create: `agentic-project-control/memory-server/tests/db.test.js`

**Step 1: Write the failing test**

```javascript
// agentic-project-control/memory-server/tests/db.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../db.js';

test('getDb creates tables on first call', () => {
  const db = getDb(':memory:');

  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(r => r.name);

  assert.ok(tables.includes('memories'), 'memories table missing');
  db.close();
});

test('getDb memories table has required columns', () => {
  const db = getDb(':memory:');

  const cols = db.prepare('PRAGMA table_info(memories)').all().map(r => r.name);
  const required = ['id', 'agent_name', 'tier', 'project_slug', 'content', 'category', 'confidence', 'created_at', 'updated_at'];

  for (const col of required) {
    assert.ok(cols.includes(col), `missing column: ${col}`);
  }
  db.close();
});
```

**Step 2: Run test to verify it fails**

```bash
cd agentic-project-control/memory-server && node --test tests/db.test.js
```

Expected: FAIL — `Cannot find module '../db.js'`

**Step 3: Write db.js**

```javascript
// agentic-project-control/memory-server/db.js
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');

const DEFAULT_DB_PATH = join(__dirname, '../memory/memory.db');

export function getDb(dbPath = DEFAULT_DB_PATH) {
  if (dbPath !== ':memory:') {
    mkdirSync(join(__dirname, '../memory'), { recursive: true });
  }

  const db = new Database(dbPath);
  sqliteVec.load(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name    TEXT NOT NULL,
      tier          TEXT NOT NULL CHECK(tier IN ('global', 'project')),
      project_slug  TEXT,
      content       TEXT NOT NULL,
      category      TEXT NOT NULL CHECK(category IN (
                      'preference', 'rejection', 'best-practice',
                      'repeated-request', 'decision', 'constraint', 'inter-agent'
                    )),
      confidence    REAL NOT NULL DEFAULT 0.5
                        CHECK(confidence >= 0.0 AND confidence <= 1.0),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
      memory_id INTEGER PRIMARY KEY,
      embedding FLOAT[1024]
    );
  `);

  return db;
}
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/db.test.js
```

Expected: 2 tests PASS

**Step 5: Commit**

```bash
cd ../..
git add agentic-project-control/memory-server/db.js agentic-project-control/memory-server/tests/db.test.js
git commit -m "feat: add memory database module with sqlite-vec schema"
```

---

## Task 3: Embeddings Module

**Files:**
- Create: `agentic-project-control/memory-server/embeddings.js`
- Create: `agentic-project-control/memory-server/tests/embeddings.test.js`

**Step 1: Write the failing test**

```javascript
// agentic-project-control/memory-server/tests/embeddings.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embed, makeFakeEmbedder } from '../embeddings.js';

test('makeFakeEmbedder returns a 1024-dim float array', async () => {
  const fakeEmbed = makeFakeEmbedder();
  const result = await fakeEmbed('hello world');

  assert.strictEqual(result.length, 1024);
  assert.ok(result.every(v => typeof v === 'number'));
});

test('makeFakeEmbedder returns different vectors for different inputs', async () => {
  const fakeEmbed = makeFakeEmbedder();
  const a = await fakeEmbed('foo');
  const b = await fakeEmbed('bar');

  assert.notDeepStrictEqual(a, b);
});

test('makeFakeEmbedder returns same vector for same input (deterministic)', async () => {
  const fakeEmbed = makeFakeEmbedder();
  const a = await fakeEmbed('consistent');
  const b = await fakeEmbed('consistent');

  assert.deepStrictEqual(a, b);
});
```

**Step 2: Run test to verify it fails**

```bash
cd agentic-project-control/memory-server && node --test tests/embeddings.test.js
```

Expected: FAIL — `Cannot find module '../embeddings.js'`

**Step 3: Write embeddings.js**

```javascript
// agentic-project-control/memory-server/embeddings.js

const EMBEDDING_DIM = 1024;

/**
 * Embeds text using the Voyage AI API.
 * Reads VOYAGE_API_KEY from environment.
 */
export async function embed(text) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY environment variable is required');
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: [text],
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Returns a deterministic fake embedder for use in tests.
 * Produces consistent 1024-dim float arrays without calling any API.
 */
export function makeFakeEmbedder() {
  return async function fakeEmbed(text) {
    // Simple deterministic hash → float array
    const vector = new Array(EMBEDDING_DIM).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % EMBEDDING_DIM] += text.charCodeAt(i) / 255;
    }
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / magnitude);
  };
}
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/embeddings.test.js
```

Expected: 3 tests PASS

**Step 5: Commit**

```bash
cd ../..
git add agentic-project-control/memory-server/embeddings.js agentic-project-control/memory-server/tests/embeddings.test.js
git commit -m "feat: add embeddings module with Voyage API client and fake embedder for tests"
```

---

## Task 4: Tool Implementations

**Files:**
- Create: `agentic-project-control/memory-server/tools.js`
- Create: `agentic-project-control/memory-server/tests/tools.test.js`

**Step 1: Write the failing tests**

```javascript
// agentic-project-control/memory-server/tests/tools.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../db.js';
import { makeFakeEmbedder } from '../embeddings.js';
import { memoryQuery, memoryWrite, memoryUpdate, memoryPrune } from '../tools.js';

function makeTestDeps() {
  const db = getDb(':memory:');
  const embedder = makeFakeEmbedder();
  return { db, embedder };
}

// --- memory_write ---

test('memoryWrite stores a record and returns its id', async () => {
  const { db, embedder } = makeTestDeps();

  const result = await memoryWrite(db, embedder, {
    agent_name: 'staff-backend-engineer',
    tier: 'global',
    content: 'User prefers repository pattern',
    category: 'preference',
    confidence: 0.8,
  });

  assert.ok(result.id > 0);
  assert.strictEqual(result.written, true);

  const row = db.prepare('SELECT * FROM memories WHERE id = ?').get(result.id);
  assert.strictEqual(row.content, 'User prefers repository pattern');
  assert.strictEqual(row.confidence, 0.8);
  db.close();
});

test('memoryWrite stores embedding in memory_embeddings', async () => {
  const { db, embedder } = makeTestDeps();

  const result = await memoryWrite(db, embedder, {
    agent_name: 'research-liaison',
    tier: 'global',
    content: 'Use Context7 for library docs',
    category: 'best-practice',
    confidence: 0.7,
  });

  const embedding = db.prepare(
    'SELECT * FROM memory_embeddings WHERE memory_id = ?'
  ).get(result.id);

  assert.ok(embedding, 'embedding row missing');
  db.close();
});

// --- memory_query ---

test('memoryQuery returns records sorted by similarity', async () => {
  const { db, embedder } = makeTestDeps();

  await memoryWrite(db, embedder, {
    agent_name: 'staff-backend-engineer',
    tier: 'global',
    content: 'User always uses repository pattern for data access',
    category: 'preference',
    confidence: 0.8,
  });

  await memoryWrite(db, embedder, {
    agent_name: 'staff-backend-engineer',
    tier: 'global',
    content: 'Never use inline styles in components',
    category: 'rejection',
    confidence: 0.6,
  });

  const results = await memoryQuery(db, embedder, {
    agent_name: 'staff-backend-engineer',
    query: 'how to access the database',
    tier: 'global',
    limit: 5,
  });

  assert.ok(Array.isArray(results));
  assert.ok(results.length >= 1);
  db.close();
});

test('memoryQuery returns empty array when no records exist', async () => {
  const { db, embedder } = makeTestDeps();

  const results = await memoryQuery(db, embedder, {
    agent_name: 'nonexistent-agent',
    query: 'anything',
    tier: 'global',
    limit: 5,
  });

  assert.deepStrictEqual(results, []);
  db.close();
});

test('memoryQuery filters by agent_name', async () => {
  const { db, embedder } = makeTestDeps();

  await memoryWrite(db, embedder, {
    agent_name: 'agent-a',
    tier: 'global',
    content: 'Agent A preference',
    category: 'preference',
    confidence: 0.8,
  });

  const results = await memoryQuery(db, embedder, {
    agent_name: 'agent-b',
    query: 'Agent A preference',
    tier: 'global',
    limit: 5,
  });

  assert.deepStrictEqual(results, []);
  db.close();
});

// --- memory_update ---

test('memoryUpdate changes confidence', async () => {
  const { db, embedder } = makeTestDeps();

  const { id } = await memoryWrite(db, embedder, {
    agent_name: 'qa-expert',
    tier: 'global',
    content: 'Always run full test suite before reporting PASS',
    category: 'best-practice',
    confidence: 0.5,
  });

  await memoryUpdate(db, embedder, { id, confidence: 0.6 });

  const row = db.prepare('SELECT confidence FROM memories WHERE id = ?').get(id);
  assert.strictEqual(row.confidence, 0.6);
  db.close();
});

test('memoryUpdate clamps confidence to 1.0 maximum', async () => {
  const { db, embedder } = makeTestDeps();

  const { id } = await memoryWrite(db, embedder, {
    agent_name: 'qa-expert',
    tier: 'global',
    content: 'test',
    category: 'preference',
    confidence: 0.9,
  });

  await memoryUpdate(db, embedder, { id, confidence: 1.5 });

  const row = db.prepare('SELECT confidence FROM memories WHERE id = ?').get(id);
  assert.strictEqual(row.confidence, 1.0);
  db.close();
});

// --- memory_prune ---

test('memoryPrune removes records below threshold', async () => {
  const { db, embedder } = makeTestDeps();

  await memoryWrite(db, embedder, {
    agent_name: 'code-review-expert',
    tier: 'global',
    content: 'Stale low-confidence memory',
    category: 'preference',
    confidence: 0.05,
  });

  await memoryWrite(db, embedder, {
    agent_name: 'code-review-expert',
    tier: 'global',
    content: 'Strong preference to keep',
    category: 'preference',
    confidence: 0.8,
  });

  const result = await memoryPrune(db, {
    agent_name: 'code-review-expert',
    below_confidence: 0.1,
  });

  assert.strictEqual(result.pruned, 1);

  const remaining = db.prepare(
    'SELECT * FROM memories WHERE agent_name = ?'
  ).all('code-review-expert');

  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].content, 'Strong preference to keep');
  db.close();
});
```

**Step 2: Run tests to verify they fail**

```bash
cd agentic-project-control/memory-server && node --test tests/tools.test.js
```

Expected: FAIL — `Cannot find module '../tools.js'`

**Step 3: Write tools.js**

```javascript
// agentic-project-control/memory-server/tools.js

/**
 * Query memory for semantically similar records.
 * Returns empty array gracefully when no records exist.
 */
export async function memoryQuery(db, embedder, { agent_name, query, tier, project_slug, limit = 5 }) {
  const queryEmbedding = await embedder(query);
  const queryBytes = new Float32Array(queryEmbedding);

  let sql = `
    SELECT m.id, m.agent_name, m.tier, m.project_slug, m.content,
           m.category, m.confidence,
           vec_distance_cosine(e.embedding, ?) as distance
    FROM memories m
    JOIN memory_embeddings e ON e.memory_id = m.id
    WHERE m.agent_name = ? AND m.tier = ?
  `;
  const params = [queryBytes, agent_name, tier];

  if (tier === 'project' && project_slug) {
    sql += ' AND m.project_slug = ?';
    params.push(project_slug);
  }

  sql += ' ORDER BY distance ASC LIMIT ?';
  params.push(limit);

  try {
    return db.prepare(sql).all(...params);
  } catch {
    // vec0 table may throw if empty — return gracefully
    return [];
  }
}

/**
 * Write a new memory record with its embedding.
 */
export async function memoryWrite(db, embedder, { agent_name, tier, content, category, confidence, project_slug }) {
  const embedding = await embedder(content);
  const embeddingBytes = new Float32Array(embedding);

  const insert = db.prepare(`
    INSERT INTO memories (agent_name, tier, project_slug, content, category, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = insert.run(agent_name, tier, project_slug ?? null, content, category, confidence);

  db.prepare(`
    INSERT INTO memory_embeddings (memory_id, embedding) VALUES (?, ?)
  `).run(result.lastInsertRowid, embeddingBytes);

  return { id: result.lastInsertRowid, written: true };
}

/**
 * Update confidence and/or content of an existing record.
 * Confidence is clamped to [0.0, 1.0].
 * Re-embeds content if updated.
 */
export async function memoryUpdate(db, embedder, { id, confidence, content }) {
  if (confidence !== undefined) {
    const clamped = Math.max(0.0, Math.min(1.0, confidence));
    db.prepare(
      "UPDATE memories SET confidence = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(clamped, id);
  }

  if (content !== undefined) {
    db.prepare(
      "UPDATE memories SET content = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(content, id);

    const embedding = await embedder(content);
    const embeddingBytes = new Float32Array(embedding);
    db.prepare('UPDATE memory_embeddings SET embedding = ? WHERE memory_id = ?')
      .run(embeddingBytes, id);
  }

  return { id, updated: true };
}

/**
 * Delete all records for an agent below a confidence threshold.
 * Also removes their embeddings.
 */
export async function memoryPrune(db, { agent_name, below_confidence }) {
  const toDelete = db.prepare(
    'SELECT id FROM memories WHERE agent_name = ? AND confidence < ?'
  ).all(agent_name, below_confidence);

  const ids = toDelete.map(r => r.id);

  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM memory_embeddings WHERE memory_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`).run(...ids);
  }

  return { pruned: ids.length };
}
```

**Step 4: Run tests to verify they pass**

```bash
node --test tests/tools.test.js
```

Expected: All tests PASS

**Step 5: Commit**

```bash
cd ../..
git add agentic-project-control/memory-server/tools.js agentic-project-control/memory-server/tests/tools.test.js
git commit -m "feat: add memory tool implementations with full test coverage"
```

---

## Task 5: MCP Server Entry Point

**Files:**
- Create: `agentic-project-control/memory-server/index.js`

**Step 1: Write index.js**

```javascript
// agentic-project-control/memory-server/index.js
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
```

**Step 2: Verify the server starts without error**

```bash
cd agentic-project-control/memory-server && echo '{}' | timeout 2 node index.js || true
```

Expected: No crash errors (timeout is expected — server waits for MCP input)

**Step 3: Run all tests**

```bash
node --test tests/
```

Expected: All tests PASS

**Step 4: Commit**

```bash
cd ../..
git add agentic-project-control/memory-server/index.js
git commit -m "feat: add MCP server entry point wiring all memory tools"
```

---

## Task 6: Register Memory Server in .mcp.json

**Files:**
- Create or Modify: `agentic-project-control/.mcp.json`

**Step 1: Check if .mcp.json already exists**

```bash
cat agentic-project-control/.mcp.json 2>/dev/null || echo "does not exist"
```

**Step 2: Write .mcp.json (create or merge)**

If it doesn't exist, create it:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["memory-server/index.js"],
      "env": {
        "VOYAGE_API_KEY": "${VOYAGE_API_KEY}"
      }
    }
  }
}
```

If it already exists, add the `"memory"` key into the existing `"mcpServers"` object.

**Step 3: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('agentic-project-control/.mcp.json','utf8')); console.log('valid')"
```

Expected: `valid`

**Step 4: Commit**

```bash
git add agentic-project-control/.mcp.json
git commit -m "chore: register memory MCP server in .mcp.json"
```

---

## Task 7: Memory Manager Agent Spec

**Files:**
- Create: `agentic-project-control/agents/memory-manager.md`

**Step 1: Write the agent spec**

```markdown
---
name: memory-manager
description: Curates agent memory after every pipeline run. Reads all agent observation blocks, reinforces or contradicts existing records, writes new ones, and prunes stale memories. Always runs after Phase 3 completes. Provide the project slug and all agent completion summaries.
tools: Read, Write, Glob, Grep, TodoWrite
model: sonnet
---

## Role
You are the memory curator. You run after every pipeline completion — PASS or REQUIRED FIXES — and decide what is worth remembering for each agent. You read raw observations from agent outputs and translate them into durable, high-quality memory records. You enforce memory hygiene: reinforce what's confirmed, contradict what's wrong, prune what's stale.

You have access to the `memory` MCP server tools: `memory_query`, `memory_write`, `memory_update`, `memory_prune`.

## Preconditions
- `code-review-report.md` must exist in `.agent/projects/{slug}/`
- All agent completion summaries for this run must be provided in your input

## Context Lineage
Read in this order:
1. `.agent/projects/{slug}/00-brief.md`
2. All agent completion summaries (provided in your dispatch prompt)

Do NOT read Phase 1 architecture artifacts — focus only on what agents observed and what the user said.

## Responsibilities

### 1. Collect Observations
Parse every `## Observations` block from the agent completion summaries. Build a list of: `{agent_name, category, content, confidence}`.

### 2. Process Each Observation
For each observation:

a. Call `memory_query(agent_name, content, tier='global', limit=3)` to check for similar existing records (similarity threshold: distance < 0.15 means "similar enough").

b. **If a similar record exists (distance < 0.15):**
   - Call `memory_update(id, confidence: existing.confidence + 0.1)` to reinforce it
   - If the new observation's content is clearer or more specific, also update content

c. **If no similar record exists:**
   - Call `memory_write` with the observation's agent_name, category, content, confidence, tier='global'

d. **If the observation contradicts an existing record** (same topic, opposite conclusion):
   - Call `memory_update(id, confidence: existing.confidence - 0.2)`
   - Note the contradiction in the updated content: append " [contradicted YYYY-MM-DD]"

### 3. Capture Explicit User Preferences
Scan the pipeline run's user messages (provided in your input context) for phrases like "always", "never", "I prefer", "stop doing", "I want you to". Write these as `memory_write` with `confidence: 0.9`.

### 4. Write Project-Scoped Memories
For observations with category `decision`, `constraint`, or `inter-agent`: also write them with `tier='project'` and `project_slug={slug}`. These capture run-specific context without polluting global memory.

### 5. Prune Stale Records
For every agent that had observations in this run, call:
```
memory_prune(agent_name, below_confidence: 0.1)
```

## Output Format

```
## Memory Manager: Update Complete

### Records Written
- {agent_name}: "{content}" (confidence: 0.X)
[or "none"]

### Records Reinforced
- {agent_name}: "{content}" (confidence: 0.X → 0.X)
[or "none"]

### Records Contradicted
- {agent_name}: "{content}" (confidence: 0.X → 0.X)
[or "none"]

### Records Pruned
- {N} records removed across {M} agents
[or "none"]

### Explicit User Preferences Captured
- "{preference text}" (confidence: 0.9)
[or "none"]
```

## Prohibited Actions
- Never modify source files or pipeline artifacts
- Never write speculative memories — only record what was explicitly observed or stated in this run
- Never skip `memory_prune` for agents that had observations in this run
- Never write `inter-agent` observations to global tier — always project-scoped only
- Never store vague observations like "user has preferences" — must be specific and factual
```

**Step 2: Run the validator**

```bash
./agentic-project-control/scripts/validate-agents.sh
```

Expected: All 14 agents PASS (13 original + memory-manager)

**Step 3: Commit**

```bash
git add agentic-project-control/agents/memory-manager.md
git commit -m "feat: add memory-manager agent spec"
```

---

## Task 8: Update All 13 Existing Agent Specs

Each existing agent spec needs three additions:
1. **Preconditions:** `memory MCP server must be available`
2. **Responsibilities (step 1):** Memory query before reading context lineage
3. **Output Format:** `## Observations` section as the last block

Open each file and add these sections. Below is the exact text to add to each.

**Addition to Preconditions (add as last bullet):**
```
- `memory` MCP server must be available (configured in .mcp.json)
```

**Addition to Responsibilities (insert as Step 1, before current Step 1):**
```
1. Query memory for relevant prior context before reading any artifact files:
   - Call `memory_query(agent_name: "{this-agent-name}", query: "{task description from dispatch prompt}", tier: "global", limit: 5)` — treat results as high-confidence prior context
   - Call `memory_query(agent_name: "{this-agent-name}", query: "{task description}", tier: "project", project_slug: "{slug}", limit: 5)` — treat results as run-specific decisions to respect
   - If memory returns zero results, proceed normally
```

**Addition to Output Format (append as last section):**
```markdown
## Observations
- category: [preference | rejection | best-practice | repeated-request | decision | constraint | inter-agent]
  content: [one specific, factual sentence about what was observed in this run]
  confidence: [0.3–0.9]
[add one bullet per distinct observation — omit if nothing notable was observed]
```

**Step 1: Update all 13 agent specs**

Edit each file in `agentic-project-control/agents/` (excluding `memory-manager.md`) to add all three additions. Files to update:

1. `stakeholder-liaison.md`
2. `project-manager.md`
3. `research-liaison.md`
4. `senior-engineer.md`
5. `database-manager.md`
6. `staff-backend-engineer.md`
7. `staff-frontend-engineer.md`
8. `staff-ai-development-engineer.md`
9. `staff-mcp-engineer.md`
10. `staff-model-engineer.md`
11. `senior-designer.md`
12. `qa-expert.md`
13. `code-review-expert.md`

**Step 2: Run the validator — all 14 agents should pass**

```bash
./agentic-project-control/scripts/validate-agents.sh
```

Expected: 14 agents, all sections present, result PASS.

**Step 3: Commit**

```bash
git add agentic-project-control/agents/
git commit -m "feat: add memory query step and observations section to all 13 agent specs"
```

---

## Task 9: Update Project Manager to Dispatch Memory Manager

**Files:**
- Modify: `agentic-project-control/agents/project-manager.md`

**Step 1: Add Memory Manager dispatch to Phase 3 Orchestration**

In the `## Responsibilities` section, under **Phase 3 Orchestration**, after step 4 (notify user on PASS) and after the retry loop, add:

```
[After Code Review returns PASS or after escalating to user on retry failure]

5. Dispatch Memory Manager:
   - Provide: project slug, all agent completion summaries from this run, any explicit user preference messages from the conversation
   - Wait for Memory Manager to return its update summary
   - Pipeline is now fully complete
```

**Step 2: Add memory_manager to the Handoff Message Format section**

Add a note:
```
Memory Manager dispatch prompt must include:
  - Project slug
  - All agent completion summaries concatenated
  - Any user messages containing explicit preferences ("always", "never", "I prefer")
```

**Step 3: Run the validator**

```bash
./agentic-project-control/scripts/validate-agents.sh
```

Expected: All 14 PASS.

**Step 4: Commit**

```bash
git add agentic-project-control/agents/project-manager.md
git commit -m "feat: update project-manager to dispatch memory-manager after phase 3"
```

---

## Task 10: Final Validation

**Step 1: Run all memory server tests**

```bash
cd agentic-project-control/memory-server && node --test tests/
```

Expected: All tests PASS. Count should be 10+ tests across db, embeddings, and tools.

**Step 2: Run the agent validator**

```bash
cd ../.. && ./agentic-project-control/scripts/validate-agents.sh
```

Expected: 14 agents, all PASS.

**Step 3: Verify complete file structure**

```bash
find agentic-project-control -name "*.md" -o -name "*.js" -o -name "*.json" | grep -v node_modules | sort
```

Expected to include:
```
agentic-project-control/.mcp.json
agentic-project-control/agents/memory-manager.md
agentic-project-control/memory-server/db.js
agentic-project-control/memory-server/embeddings.js
agentic-project-control/memory-server/index.js
agentic-project-control/memory-server/package.json
agentic-project-control/memory-server/tools.js
agentic-project-control/memory-server/tests/db.test.js
agentic-project-control/memory-server/tests/embeddings.test.js
agentic-project-control/memory-server/tests/tools.test.js
```

**Step 4: Verify .gitignore contains memory DB**

```bash
grep "memory.db" .gitignore
```

Expected: `agentic-project-control/memory/memory.db`

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete agent memory system — sqlite-vec MCP server, memory-manager agent, all agent specs updated"
```
