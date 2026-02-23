import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './setup';
import { createDocument, listDocuments } from '../src/services/documentService';
import { addTagToDocument } from '../src/services/tagService';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

describe('Full-text search', () => {
  it('finds documents by name', () => {
    createDocument(
      {
        name: 'Budget Report 2025',
        originalFilename: 'budget.txt',
        mimeType: 'text/plain',
        fileSize: 10,
        content: Buffer.from('some content'),
        extractedText: 'some content',
      },
      db
    );
    createDocument(
      {
        name: 'Team Meeting Notes',
        originalFilename: 'notes.txt',
        mimeType: 'text/plain',
        fileSize: 10,
        content: Buffer.from('other content'),
        extractedText: 'other content',
      },
      db
    );

    const results = listDocuments({ search: 'Budget' }, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Budget Report 2025');
  });

  it('finds documents by extracted text content', () => {
    createDocument(
      {
        name: 'Random File',
        originalFilename: 'random.txt',
        mimeType: 'text/plain',
        fileSize: 30,
        content: Buffer.from('The quick brown fox jumps high'),
        extractedText: 'The quick brown fox jumps high',
      },
      db
    );
    createDocument(
      {
        name: 'Other File',
        originalFilename: 'other.txt',
        mimeType: 'text/plain',
        fileSize: 15,
        content: Buffer.from('completely different'),
        extractedText: 'completely different',
      },
      db
    );

    const results = listDocuments({ search: 'fox' }, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Random File');
  });

  it('finds documents by tag string', () => {
    const doc = createDocument(
      {
        name: 'Invoice March',
        originalFilename: 'invoice.txt',
        mimeType: 'text/plain',
        fileSize: 5,
        content: Buffer.from('data'),
        extractedText: null,
      },
      db
    );

    addTagToDocument(doc.id, 'finance', db);
    addTagToDocument(doc.id, 'invoice', db);

    const results = listDocuments({ search: 'invoice' }, db);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const found = results.find((r) => r.id === doc.id);
    expect(found).toBeDefined();
  });

  it('returns empty array for no matching results', () => {
    createDocument(
      {
        name: 'Completely Unrelated',
        originalFilename: 'file.txt',
        mimeType: 'text/plain',
        fileSize: 5,
        content: Buffer.from('hello'),
        extractedText: 'hello',
      },
      db
    );

    const results = listDocuments({ search: 'zzz_no_match_xyzzy' }, db);
    expect(results).toEqual([]);
  });

  it('includes snippet field in search results', () => {
    createDocument(
      {
        name: 'Research Paper',
        originalFilename: 'paper.txt',
        mimeType: 'text/plain',
        fileSize: 50,
        content: Buffer.from('This paper discusses advanced algorithms in detail'),
        extractedText: 'This paper discusses advanced algorithms in detail',
      },
      db
    );

    const results = listDocuments({ search: 'algorithms' }, db);
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toBeDefined();
  });
});
