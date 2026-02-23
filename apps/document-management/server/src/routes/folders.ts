import { Router, Request, Response, NextFunction } from 'express';
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
} from '../services/folderService';
import { NotFoundError } from '../types';

const router = Router();

// GET /api/folders — List all folders as a tree
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const folders = listFolders();
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// POST /api/folders — Create a new folder
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, parentId } = req.body as {
      name: string;
      parentId?: number | null;
    };
    const folder = createFolder(name, parentId);
    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

// PUT /api/folders/:id — Rename a folder
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body as { name: string };
    const folder = renameFolder(id, name);
    if (!folder) throw new NotFoundError(`Folder ${id} not found`);
    res.json(folder);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/folders/:id — Delete a folder
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = deleteFolder(id);
    if (!deleted) throw new NotFoundError(`Folder ${id} not found`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
