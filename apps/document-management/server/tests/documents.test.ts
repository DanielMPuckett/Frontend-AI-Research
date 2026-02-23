import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './setup';
import {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
} from '../src/services/documentService';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

const sampleDoc = {
  name: 'Test Document',
  originalFilename: 'test.txt',
  mimeType: 'text/plain',
  fileSize: 13,
  content: Buffer.from('Hello, World!'),
  extractedText: 'Hello, World!',
};

describe('createDocument', () => {
  it('creates a document and returns it with correct fields', () => {
    const doc = createDocument(sampleDoc, db);

    expect(doc.id).toBeTypeOf('number');
    expect(doc.name).toBe('Test Document');
    expect(doc.originalFilename).toBe('test.txt');
    expect(doc.mimeType).toBe('text/plain');
    expect(doc.fileSize).toBe(13);
    expect(doc.folderId).toBeNull();
    expect(doc.tags).toEqual([]);
    expect(doc.createdAt).toBeTypeOf('number');
  });

  it('trims document name on creation', () => {
    const doc = createDocument({ ...sampleDoc, name: '  Trimmed  ' }, db);
    expect(doc.name).toBe('Trimmed');
  });
});

describe('listDocuments', () => {
  it('returns all documents sorted by created_at desc', () => {
    createDocument({ ...sampleDoc, name: 'Doc A' }, db);
    createDocument({ ...sampleDoc, name: 'Doc B' }, db);
    const docs = listDocuments({}, db);
    expect(docs).toHaveLength(2);
    expect(docs[0].name).toBe('Doc B'); // Most recent first
    expect(docs[1].name).toBe('Doc A');
  });

  it('filters by folderId', () => {
    // Create a folder
    db.prepare('INSERT INTO folders (name) VALUES (?)').run('Work');
    const folder = db.prepare("SELECT id FROM folders WHERE name = 'Work'").get() as { id: number };

    createDocument({ ...sampleDoc, name: 'Filed Doc', folderId: folder.id }, db);
    createDocument({ ...sampleDoc, name: 'Unfiled Doc', folderId: null }, db);

    const inFolder = listDocuments({ folderId: folder.id }, db);
    expect(inFolder).toHaveLength(1);
    expect(inFolder[0].name).toBe('Filed Doc');

    const unfiled = listDocuments({ folderId: null }, db);
    expect(unfiled).toHaveLength(1);
    expect(unfiled[0].name).toBe('Unfiled Doc');
  });

  it('returns empty array when no documents exist', () => {
    const docs = listDocuments({}, db);
    expect(docs).toEqual([]);
  });
});

describe('getDocument', () => {
  it('returns document by id', () => {
    const created = createDocument(sampleDoc, db);
    const found = getDocument(created.id, db);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('Test Document');
  });

  it('returns null for non-existent id', () => {
    const found = getDocument(999, db);
    expect(found).toBeNull();
  });
});

describe('updateDocument', () => {
  it('updates name and description', () => {
    const created = createDocument(sampleDoc, db);
    const updated = updateDocument(
      created.id,
      { name: 'Updated Name', description: 'A description' },
      db
    );
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.description).toBe('A description');
  });

  it('returns null for non-existent id', () => {
    const result = updateDocument(999, { name: 'New Name' }, db);
    expect(result).toBeNull();
  });
});

describe('deleteDocument', () => {
  it('deletes a document and returns true', () => {
    const created = createDocument(sampleDoc, db);
    const deleted = deleteDocument(created.id, db);
    expect(deleted).toBe(true);
    expect(getDocument(created.id, db)).toBeNull();
  });

  it('returns false for non-existent id', () => {
    const deleted = deleteDocument(999, db);
    expect(deleted).toBe(false);
  });
});
