import Database from 'better-sqlite3';
import { getDb } from '../db/connection';
import { TagWithCount } from '../types';

interface RawTagRow {
  id: number;
  name: string;
  count: number;
}

export function listTags(db?: Database.Database): TagWithCount[] {
  const instance = db ?? getDb();
  const rows = instance
    .prepare(
      `SELECT t.id, t.name, COUNT(dt.document_id) as count
       FROM tags t
       LEFT JOIN document_tags dt ON t.id = dt.tag_id
       GROUP BY t.id
       ORDER BY t.name`
    )
    .all() as RawTagRow[];

  return rows.map((row) => ({ id: row.id, name: row.name, count: row.count }));
}

export function addTagToDocument(
  documentId: number,
  tagName: string,
  db?: Database.Database
): void {
  const instance = db ?? getDb();
  const name = tagName.trim().toLowerCase();

  if (!name) return;

  // Upsert tag
  instance
    .prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)')
    .run(name);

  const tag = instance
    .prepare('SELECT id FROM tags WHERE name = ?')
    .get(name) as { id: number } | undefined;

  if (!tag) return;

  // Link to document (ignore if already linked)
  instance
    .prepare('INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)')
    .run(documentId, tag.id);
}

export function removeTagFromDocument(
  documentId: number,
  tagName: string,
  db?: Database.Database
): void {
  const instance = db ?? getDb();
  const name = tagName.trim().toLowerCase();

  const tag = instance
    .prepare('SELECT id FROM tags WHERE name = ?')
    .get(name) as { id: number } | undefined;

  if (!tag) return;

  instance
    .prepare('DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?')
    .run(documentId, tag.id);
}
