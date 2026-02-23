import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'documents.db');

let db: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? DB_PATH;

  if (dbPath) {
    // For tests: always create a new instance for the given path
    const instance = new Database(resolvedPath);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    return instance;
  }

  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(resolvedPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
