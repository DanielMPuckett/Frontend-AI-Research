import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDb } from './connection';

export function runMigrations(db?: Database.Database): void {
  const instance = db ?? getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  instance.exec(sql);
}
