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
