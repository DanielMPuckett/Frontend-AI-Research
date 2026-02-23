import Database from 'better-sqlite3';
import { getDb } from '../db/connection';
import {
  DocumentListItem,
  DocumentDetail,
  NotFoundError,
  ValidationError,
} from '../types';

interface RawDocumentRow {
  id: number;
  name: string;
  original_filename: string;
  description: string | null;
  mime_type: string;
  file_size: number;
  folder_id: number | null;
  tag_string: string;
  created_at: number;
  updated_at: number;
  snippet?: string;
}

interface RawDocumentContent {
  content: Buffer;
  mime_type: string;
}

function rowToDocumentListItem(row: RawDocumentRow): DocumentListItem {
  return {
    id: row.id,
    name: row.name,
    originalFilename: row.original_filename,
    description: row.description,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    folderId: row.folder_id,
    tags: row.tag_string ? row.tag_string.split(' ').filter(Boolean) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    snippet: row.snippet,
  };
}

export function listDocuments(
  opts: {
    folderId?: number | null;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
  db?: Database.Database
): DocumentListItem[] {
  const instance = db ?? getDb();
  const { folderId, tag, search, limit = 100, offset = 0 } = opts;

  if (search && search.trim()) {
    // FTS5 search
    const escapedSearch = search.trim().replace(/"/g, '""');
    const rows = instance
      .prepare(
        `SELECT d.id, d.name, d.original_filename, d.description, d.mime_type,
                d.file_size, d.folder_id, d.tag_string, d.created_at, d.updated_at,
                snippet(documents_fts, 2, '<mark>', '</mark>', '...', 10) as snippet
         FROM documents d
         JOIN documents_fts f ON d.id = f.rowid
         WHERE documents_fts MATCH ?
         ORDER BY rank
         LIMIT ? OFFSET ?`
      )
      .all(`"${escapedSearch}"*`, limit, offset) as RawDocumentRow[];
    return rows.map(rowToDocumentListItem);
  }

  if (tag) {
    const rows = instance
      .prepare(
        `SELECT d.id, d.name, d.original_filename, d.description, d.mime_type,
                d.file_size, d.folder_id, d.tag_string, d.created_at, d.updated_at
         FROM documents d
         JOIN document_tags dt ON d.id = dt.document_id
         JOIN tags t ON dt.tag_id = t.id
         WHERE t.name = ?
         ORDER BY d.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(tag, limit, offset) as RawDocumentRow[];
    return rows.map(rowToDocumentListItem);
  }

  if (folderId !== undefined) {
    const rows = instance
      .prepare(
        `SELECT id, name, original_filename, description, mime_type,
                file_size, folder_id, tag_string, created_at, updated_at
         FROM documents
         WHERE folder_id ${folderId === null ? 'IS NULL' : '= ?'}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(
        ...(folderId === null ? [limit, offset] : [folderId, limit, offset])
      ) as RawDocumentRow[];
    return rows.map(rowToDocumentListItem);
  }

  // All documents
  const rows = instance
    .prepare(
      `SELECT id, name, original_filename, description, mime_type,
              file_size, folder_id, tag_string, created_at, updated_at
       FROM documents
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as RawDocumentRow[];
  return rows.map(rowToDocumentListItem);
}

export function getDocument(
  id: number,
  db?: Database.Database
): DocumentDetail | null {
  const instance = db ?? getDb();
  const row = instance
    .prepare(
      `SELECT id, name, original_filename, description, mime_type,
              file_size, folder_id, tag_string, created_at, updated_at
       FROM documents WHERE id = ?`
    )
    .get(id) as RawDocumentRow | undefined;

  if (!row) return null;
  return rowToDocumentListItem(row);
}

export function getDocumentContent(
  id: number,
  db?: Database.Database
): { content: Buffer; mimeType: string } | null {
  const instance = db ?? getDb();
  const row = instance
    .prepare('SELECT content, mime_type FROM documents WHERE id = ?')
    .get(id) as RawDocumentContent | undefined;

  if (!row) return null;
  return { content: row.content, mimeType: row.mime_type };
}

export function createDocument(
  input: {
    name: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    content: Buffer;
    extractedText: string | null;
    folderId?: number | null;
    description?: string;
  },
  db?: Database.Database
): DocumentDetail {
  const instance = db ?? getDb();

  if (!input.name || !input.name.trim()) {
    throw new ValidationError('Document name is required');
  }

  const result = instance
    .prepare(
      `INSERT INTO documents
         (name, original_filename, description, mime_type, file_size, content, extracted_text, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name.trim(),
      input.originalFilename,
      input.description ?? null,
      input.mimeType,
      input.fileSize,
      input.content,
      input.extractedText ?? null,
      input.folderId ?? null
    );

  const doc = getDocument(result.lastInsertRowid as number, instance);
  if (!doc) throw new Error('Failed to retrieve created document');
  return doc;
}

export function updateDocument(
  id: number,
  updates: {
    name?: string;
    description?: string | null;
    folderId?: number | null;
  },
  db?: Database.Database
): DocumentDetail | null {
  const instance = db ?? getDb();

  const existing = getDocument(id, instance);
  if (!existing) return null;

  if (updates.name !== undefined && !updates.name.trim()) {
    throw new ValidationError('Document name cannot be empty');
  }

  instance
    .prepare(
      `UPDATE documents
       SET name = ?, description = ?, folder_id = ?, updated_at = unixepoch()
       WHERE id = ?`
    )
    .run(
      updates.name !== undefined ? updates.name.trim() : existing.name,
      updates.description !== undefined ? updates.description : existing.description,
      updates.folderId !== undefined ? updates.folderId : existing.folderId,
      id
    );

  return getDocument(id, instance);
}

export function updateDocumentContent(
  id: number,
  input: {
    content: Buffer;
    extractedText: string | null;
    fileSize: number;
  },
  db?: Database.Database
): DocumentDetail | null {
  const instance = db ?? getDb();

  const existing = getDocument(id, instance);
  if (!existing) return null;

  instance
    .prepare(
      `UPDATE documents
       SET content = ?, extracted_text = ?, file_size = ?, updated_at = unixepoch()
       WHERE id = ?`
    )
    .run(input.content, input.extractedText ?? null, input.fileSize, id);

  return getDocument(id, instance);
}

export function deleteDocument(
  id: number,
  db?: Database.Database
): boolean {
  const instance = db ?? getDb();
  const result = instance
    .prepare('DELETE FROM documents WHERE id = ?')
    .run(id);
  return result.changes > 0;
}
