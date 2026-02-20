import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeEmbedder } from '../embeddings.js';

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
