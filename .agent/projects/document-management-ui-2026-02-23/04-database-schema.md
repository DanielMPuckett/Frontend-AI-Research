---
agent: database-manager
project: document-management-ui-2026-02-23
date: 2026-02-23
status: draft
---

# Database Schema: Document Management UI

## Summary
This is a brand-new SQLite database schema using the `better-sqlite3` driver. The schema consists of five tables: `folders` (hierarchical document organization), `documents` (core entity with binary content as BLOB, extracted text, and metadata), `tags` (normalized tag definitions), `document_tags` (many-to-many junction), and `documents_fts` (FTS5 virtual table for full-text search). A `tag_string` denormalized column on `documents` caches the concatenated tag names for efficient FTS indexing without a join. Three triggers keep the FTS virtual table in sync with the documents table. All migrations are implemented as a single initialization script run at server startup when the DB file does not yet exist (no migration history table needed for a new single-user local app).

## New Tables

### folders
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | INTEGER | No | autoincrement | Primary key |
| name | TEXT | No | — | Display name of the folder |
| parent_id | INTEGER | Yes | NULL | Self-referential FK for nested folders |
| created_at | INTEGER | No | (UNIX timestamp) | seconds since epoch |
| updated_at | INTEGER | No | (UNIX timestamp) | seconds since epoch |

Notes:
- `parent_id = NULL` indicates a root-level folder.
- Depth is not enforced at the DB level; application logic limits nesting to a reasonable depth if desired.
- No `deleted_at` soft-delete column — out of scope for v1.

### documents
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | INTEGER | No | autoincrement | Primary key |
| name | TEXT | No | — | User-visible display name (not necessarily the original filename) |
| original_filename | TEXT | No | — | Original filename at upload time |
| description | TEXT | Yes | NULL | User-provided description |
| mime_type | TEXT | No | — | MIME type, e.g. `application/pdf`, `text/markdown` |
| file_size | INTEGER | No | — | File size in bytes |
| content | BLOB | No | — | Raw binary file content |
| extracted_text | TEXT | Yes | NULL | Text extracted for FTS (NULL for non-extractable types) |
| tag_string | TEXT | No | '' | Denormalized space-separated tag names for FTS; updated by trigger |
| folder_id | INTEGER | Yes | NULL | FK → folders.id; NULL = unfiled |
| created_at | INTEGER | No | (UNIX timestamp) | seconds since epoch |
| updated_at | INTEGER | No | (UNIX timestamp) | seconds since epoch |

Notes:
- `content` stores the raw binary. The Express API streams it back to the client with the stored `mime_type` as the `Content-Type` header.
- `extracted_text` is populated at upload time by the server-side text extraction pipeline.
- `tag_string` is kept in sync by the `document_tags` trigger (see Triggers section). It is never written directly by the application.

### tags
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | INTEGER | No | autoincrement | Primary key |
| name | TEXT | No | — | Unique tag label, e.g. "invoices", "recipes" |
| created_at | INTEGER | No | (UNIX timestamp) | seconds since epoch |

Constraint: `UNIQUE(name)` — tag names are global and unique.

### document_tags
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| document_id | INTEGER | No | — | FK → documents.id |
| tag_id | INTEGER | No | — | FK → tags.id |

Constraint: `PRIMARY KEY (document_id, tag_id)` — composite primary key, no id column needed.

Notes:
- Inserting or deleting from this table triggers an update to `documents.tag_string` (see Triggers section).
- Cascade delete on `document_id`: when a document is deleted, its `document_tags` rows are also deleted.

### documents_fts (FTS5 virtual table)
```sql
CREATE VIRTUAL TABLE documents_fts USING fts5(
  name,
  description,
  extracted_text,
  tag_string,
  content='documents',
  content_rowid='id',
  tokenize='unicode61'
);
```

Notes:
- `content='documents'` means FTS5 does not store content itself — it reads from the `documents` table via the rowid.
- `tokenize='unicode61'` handles accented and non-Latin characters correctly.
- The four indexed columns are: `name`, `description`, `extracted_text`, `tag_string`.
- `content` (binary) is intentionally excluded from FTS — raw binary data is never indexed.
- All four FTS columns must be kept in sync via triggers defined below.

## Modified Tables
None — this is a new schema with no existing tables.

## Indexes

| Index | Table.Column(s) | Reason |
|---|---|---|
| `idx_documents_folder_id` | documents.folder_id | Browse documents by folder (most common query) |
| `idx_documents_created_at` | documents.created_at | Sort documents by date (default sort order) |
| `idx_documents_name` | documents.name | Name-based search / sort |
| `idx_document_tags_tag_id` | document_tags.tag_id | Look up all documents for a given tag |
| `idx_document_tags_document_id` | document_tags.document_id | Look up all tags for a given document (covered by PK, but explicit for clarity) |
| `idx_folders_parent_id` | folders.parent_id | Hierarchical folder traversal |

## Foreign Keys
- `documents.folder_id` → `folders.id` — ON DELETE SET NULL (unfiling document when folder deleted)
- `document_tags.document_id` → `documents.id` — ON DELETE CASCADE (clean up tags when document deleted)
- `document_tags.tag_id` → `tags.id` — ON DELETE CASCADE (clean up junction when tag deleted)
- `folders.parent_id` → `folders.id` — ON DELETE SET NULL (orphan child folders when parent deleted)

Note: SQLite foreign key enforcement is OFF by default. The initialization script must run `PRAGMA foreign_keys = ON` at every connection open.

## Triggers

### FTS5 Sync Triggers

```sql
-- Insert new document into FTS index
CREATE TRIGGER docs_fts_after_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, name, description, extracted_text, tag_string)
  VALUES (new.id, new.name, COALESCE(new.description, ''), COALESCE(new.extracted_text, ''), new.tag_string);
END;

-- Remove old FTS entry and insert updated entry on document update
CREATE TRIGGER docs_fts_after_update AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, name, description, extracted_text, tag_string)
  VALUES ('delete', old.id, old.name, COALESCE(old.description, ''), COALESCE(old.extracted_text, ''), old.tag_string);
  INSERT INTO documents_fts(rowid, name, description, extracted_text, tag_string)
  VALUES (new.id, new.name, COALESCE(new.description, ''), COALESCE(new.extracted_text, ''), new.tag_string);
END;

-- Remove FTS entry when document is deleted
CREATE TRIGGER docs_fts_after_delete AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, name, description, extracted_text, tag_string)
  VALUES ('delete', old.id, old.name, COALESCE(old.description, ''), COALESCE(old.extracted_text, ''), old.tag_string);
END;
```

### Tag String Denormalization Triggers

```sql
-- Recompute tag_string on documents when a document_tag row is inserted
CREATE TRIGGER update_tag_string_after_insert AFTER INSERT ON document_tags BEGIN
  UPDATE documents SET
    tag_string = (
      SELECT COALESCE(GROUP_CONCAT(t.name, ' '), '')
      FROM document_tags dt
      JOIN tags t ON t.id = dt.tag_id
      WHERE dt.document_id = new.document_id
    ),
    updated_at = unixepoch()
  WHERE id = new.document_id;
END;

-- Recompute tag_string on documents when a document_tag row is deleted
CREATE TRIGGER update_tag_string_after_delete AFTER DELETE ON document_tags BEGIN
  UPDATE documents SET
    tag_string = (
      SELECT COALESCE(GROUP_CONCAT(t.name, ' '), '')
      FROM document_tags dt
      JOIN tags t ON t.id = dt.tag_id
      WHERE dt.document_id = old.document_id
    ),
    updated_at = unixepoch()
  WHERE id = old.document_id;
END;
```

Note: The `UPDATE documents` trigger fires `docs_fts_after_update`, which re-syncs the FTS index with the new `tag_string`. This chain is intentional and correct.

## Initialization Script

The following must be run at DB init (file: `server/db/schema.sql` or equivalent):

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS folders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  parent_id  INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS documents (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  original_filename TEXT    NOT NULL,
  description       TEXT,
  mime_type         TEXT    NOT NULL,
  file_size         INTEGER NOT NULL,
  content           BLOB    NOT NULL,
  extracted_text    TEXT,
  tag_string        TEXT    NOT NULL DEFAULT '',
  folder_id         INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id)      ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_folder_id  ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_name       ON documents(name);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id    ON folders(parent_id);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  name,
  description,
  extracted_text,
  tag_string,
  content='documents',
  content_rowid='id',
  tokenize='unicode61'
);

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS docs_fts_after_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, name, description, extracted_text, tag_string)
  VALUES (new.id, new.name, COALESCE(new.description, ''), COALESCE(new.extracted_text, ''), new.tag_string);
END;

CREATE TRIGGER IF NOT EXISTS docs_fts_after_update AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, name, description, extracted_text, tag_string)
  VALUES ('delete', old.id, old.name, COALESCE(old.description, ''), COALESCE(old.extracted_text, ''), old.tag_string);
  INSERT INTO documents_fts(rowid, name, description, extracted_text, tag_string)
  VALUES (new.id, new.name, COALESCE(new.description, ''), COALESCE(new.extracted_text, ''), new.tag_string);
END;

CREATE TRIGGER IF NOT EXISTS docs_fts_after_delete AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, name, description, extracted_text, tag_string)
  VALUES ('delete', old.id, old.name, COALESCE(old.description, ''), COALESCE(old.extracted_text, ''), old.tag_string);
END;

-- Tag string denormalization triggers
CREATE TRIGGER IF NOT EXISTS update_tag_string_after_insert AFTER INSERT ON document_tags BEGIN
  UPDATE documents SET
    tag_string = (
      SELECT COALESCE(GROUP_CONCAT(t.name, ' '), '')
      FROM document_tags dt JOIN tags t ON t.id = dt.tag_id
      WHERE dt.document_id = new.document_id
    ),
    updated_at = unixepoch()
  WHERE id = new.document_id;
END;

CREATE TRIGGER IF NOT EXISTS update_tag_string_after_delete AFTER DELETE ON document_tags BEGIN
  UPDATE documents SET
    tag_string = (
      SELECT COALESCE(GROUP_CONCAT(t.name, ' '), '')
      FROM document_tags dt JOIN tags t ON t.id = dt.tag_id
      WHERE dt.document_id = old.document_id
    ),
    updated_at = unixepoch()
  WHERE id = old.document_id;
END;
```

## Migrations Required
- `001_initial_schema.sql` — creates all tables, indexes, virtual table, and triggers (the initialization script above)

Note: For a new application, there is no migration history table. The Staff Backend Engineer should run the initialization script once using a `CREATE TABLE IF NOT EXISTS` guard pattern, so it is safe to re-run on server restart.

## Data Access Patterns

| Query | SQL Pattern |
|---|---|
| List all documents in a folder (sorted by date desc) | `SELECT id, name, mime_type, file_size, created_at FROM documents WHERE folder_id = ? ORDER BY created_at DESC` |
| List unfiled documents | `SELECT ... FROM documents WHERE folder_id IS NULL ORDER BY created_at DESC` |
| Full-text search | `SELECT d.id, d.name, d.mime_type, snippet(documents_fts, 0, '<mark>', '</mark>', '...', 10) as snippet FROM documents d JOIN documents_fts f ON d.id = f.rowid WHERE documents_fts MATCH ? ORDER BY rank` |
| Get document with tags | `SELECT d.*, GROUP_CONCAT(t.name) as tags FROM documents d LEFT JOIN document_tags dt ON d.id = dt.document_id LEFT JOIN tags t ON dt.tag_id = t.id WHERE d.id = ? GROUP BY d.id` |
| Filter by tag | `SELECT d.* FROM documents d JOIN document_tags dt ON d.id = dt.document_id JOIN tags t ON dt.tag_id = t.id WHERE t.name = ? ORDER BY d.created_at DESC` |
| Get document content (binary) | `SELECT content, mime_type FROM documents WHERE id = ?` |
| Update document metadata | `UPDATE documents SET name=?, description=?, folder_id=?, updated_at=unixepoch() WHERE id=?` |
| Update document text content | `UPDATE documents SET content=?, extracted_text=?, file_size=?, updated_at=unixepoch() WHERE id=?` |
| List all tags with doc counts | `SELECT t.name, COUNT(dt.document_id) as count FROM tags t LEFT JOIN document_tags dt ON t.id = dt.tag_id GROUP BY t.id ORDER BY t.name` |
| Add tag to document (upsert tag + link) | INSERT INTO tags (name) with ON CONFLICT IGNORE, then INSERT INTO document_tags |
| Remove tag from document | `DELETE FROM document_tags WHERE document_id=? AND tag_id=(SELECT id FROM tags WHERE name=?)` |
| List folder tree | `SELECT id, name, parent_id FROM folders ORDER BY parent_id NULLS FIRST, name` |

## Open Questions
None.

## Assumptions
- SQLite 3.9.0+ is available (FTS5 required) — this is guaranteed by `better-sqlite3` which bundles SQLite.
- `unixepoch()` is available — requires SQLite 3.38.0+ (2022), bundled with `better-sqlite3` >= 7.6.
- Tag names are case-sensitive at the DB level; case normalization (e.g. toLower) is handled in the application layer.
- No migration versioning table is needed for a new single-user local app — IF NOT EXISTS guards suffice.
- The `content` BLOB column is excluded from `SELECT *` queries in the application layer to avoid loading file binaries unnecessarily.
