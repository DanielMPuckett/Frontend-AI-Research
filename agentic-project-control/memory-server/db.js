import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import * as sqliteVec from 'sqlite-vec';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DEFAULT_DB_PATH = join(__dirname, '../memory/memory.db');

export function getDb(dbPath = DEFAULT_DB_PATH) {
  if (dbPath !== ':memory:') {
    mkdirSync(join(__dirname, '../memory'), { recursive: true });
  }

  const Database = require('better-sqlite3');
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
