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

  // sqlite-vec vec0 PRIMARY KEY requires BigInt binding
  const memoryId = BigInt(result.lastInsertRowid);
  db.prepare(`
    INSERT INTO memory_embeddings (memory_id, embedding) VALUES (?, ?)
  `).run(memoryId, embeddingBytes);

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
    // sqlite-vec vec0 PRIMARY KEY requires BigInt binding
    db.prepare('UPDATE memory_embeddings SET embedding = ? WHERE memory_id = ?')
      .run(embeddingBytes, BigInt(id));
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
    // sqlite-vec vec0 PRIMARY KEY requires BigInt binding
    const bigIds = ids.map(id => BigInt(id));
    db.prepare(`DELETE FROM memory_embeddings WHERE memory_id IN (${placeholders})`).run(...bigIds);
    db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`).run(...ids);
  }

  return { pruned: ids.length };
}
