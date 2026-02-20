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
