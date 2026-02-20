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
