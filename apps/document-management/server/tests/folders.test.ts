import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './setup';
import {
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder,
} from '../src/services/folderService';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

describe('createFolder', () => {
  it('creates a root folder', () => {
    const folder = createFolder('Work', null, db);
    expect(folder.id).toBeTypeOf('number');
    expect(folder.name).toBe('Work');
    expect(folder.parentId).toBeNull();
  });

  it('creates a nested folder', () => {
    const parent = createFolder('Work', null, db);
    const child = createFolder('Reports', parent.id, db);
    expect(child.parentId).toBe(parent.id);
  });
});

describe('listFolders', () => {
  it('returns folder tree', () => {
    const parent = createFolder('Work', null, db);
    createFolder('Reports', parent.id, db);

    const tree = listFolders(db);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Work');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('Reports');
  });

  it('returns empty array when no folders', () => {
    expect(listFolders(db)).toEqual([]);
  });
});

describe('renameFolder', () => {
  it('renames a folder', () => {
    const folder = createFolder('Old Name', null, db);
    const renamed = renameFolder(folder.id, 'New Name', db);
    expect(renamed).not.toBeNull();
    expect(renamed!.name).toBe('New Name');
  });

  it('returns null for non-existent id', () => {
    const result = renameFolder(999, 'Name', db);
    expect(result).toBeNull();
  });
});

describe('deleteFolder', () => {
  it('deletes a folder', () => {
    const folder = createFolder('Temp', null, db);
    const deleted = deleteFolder(folder.id, db);
    expect(deleted).toBe(true);
    expect(listFolders(db)).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    expect(deleteFolder(999, db)).toBe(false);
  });
});
