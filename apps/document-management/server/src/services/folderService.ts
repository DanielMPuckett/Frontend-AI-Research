import Database from 'better-sqlite3';
import { getDb } from '../db/connection';
import { Folder, FolderNode, ValidationError } from '../types';

interface RawFolderRow {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: number;
  updated_at: number;
}

function rowToFolder(row: RawFolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildTree(folders: Folder[]): FolderNode[] {
  const map = new Map<number, FolderNode>();
  const roots: FolderNode[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // orphaned folder — treat as root
      }
    }
  }

  return roots;
}

export function listFolders(db?: Database.Database): FolderNode[] {
  const instance = db ?? getDb();
  const rows = instance
    .prepare('SELECT id, name, parent_id, created_at, updated_at FROM folders ORDER BY name')
    .all() as RawFolderRow[];
  const folders = rows.map(rowToFolder);
  return buildTree(folders);
}

export function createFolder(
  name: string,
  parentId?: number | null,
  db?: Database.Database
): Folder {
  const instance = db ?? getDb();

  if (!name || !name.trim()) {
    throw new ValidationError('Folder name is required');
  }

  const result = instance
    .prepare(
      'INSERT INTO folders (name, parent_id) VALUES (?, ?)'
    )
    .run(name.trim(), parentId ?? null);

  const row = instance
    .prepare('SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?')
    .get(result.lastInsertRowid) as RawFolderRow;

  return rowToFolder(row);
}

export function renameFolder(
  id: number,
  name: string,
  db?: Database.Database
): Folder | null {
  const instance = db ?? getDb();

  if (!name || !name.trim()) {
    throw new ValidationError('Folder name cannot be empty');
  }

  const result = instance
    .prepare('UPDATE folders SET name = ?, updated_at = unixepoch() WHERE id = ?')
    .run(name.trim(), id);

  if (result.changes === 0) return null;

  const row = instance
    .prepare('SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?')
    .get(id) as RawFolderRow | undefined;

  return row ? rowToFolder(row) : null;
}

export function deleteFolder(id: number, db?: Database.Database): boolean {
  const instance = db ?? getDb();
  const result = instance
    .prepare('DELETE FROM folders WHERE id = ?')
    .run(id);
  return result.changes > 0;
}
