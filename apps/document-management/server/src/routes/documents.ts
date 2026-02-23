import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/upload';
import {
  listDocuments,
  getDocument,
  getDocumentContent,
  createDocument,
  updateDocument,
  updateDocumentContent,
  deleteDocument,
} from '../services/documentService';
import { addTagToDocument, removeTagFromDocument } from '../services/tagService';
import { extractText } from '../services/textExtractor';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

// POST /api/documents/upload — Upload a new document
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('No file provided');
      }

      const { buffer, originalname, mimetype, size } = req.file;
      const name = (req.body.name as string | undefined) || originalname;
      const folderId = req.body.folderId
        ? parseInt(req.body.folderId as string, 10)
        : null;
      const description = (req.body.description as string | undefined) || null;

      const extractedText = await extractText(buffer, mimetype);

      const doc = createDocument({
        name,
        originalFilename: originalname,
        mimeType: mimetype,
        fileSize: size,
        content: buffer,
        extractedText,
        folderId,
        description: description ?? undefined,
      });

      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/documents — List documents with optional filters
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folderId, tag, search, limit, offset } = req.query;

    const opts: Parameters<typeof listDocuments>[0] = {};

    if (folderId !== undefined) {
      opts.folderId = folderId === 'null' ? null : parseInt(folderId as string, 10);
    }
    if (tag) opts.tag = tag as string;
    if (search) opts.search = search as string;
    if (limit) opts.limit = parseInt(limit as string, 10);
    if (offset) opts.offset = parseInt(offset as string, 10);

    const docs = listDocuments(opts);
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id — Get document metadata
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const doc = getDocument(id);
    if (!doc) throw new NotFoundError(`Document ${id} not found`);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/content — Stream document binary content
router.get('/:id/content', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = getDocumentContent(id);
    if (!result) throw new NotFoundError(`Document ${id} not found`);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', result.content.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(result.content);
  } catch (err) {
    next(err);
  }
});

// PUT /api/documents/:id — Update document metadata
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, folderId } = req.body as {
      name?: string;
      description?: string | null;
      folderId?: number | null;
    };

    const doc = updateDocument(id, { name, description, folderId });
    if (!doc) throw new NotFoundError(`Document ${id} not found`);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// PUT /api/documents/:id/content — Update text content of editable document
router.put(
  '/:id/content',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { text } = req.body as { text: string };

      if (typeof text !== 'string') {
        throw new ValidationError('text field is required');
      }

      const existing = getDocument(id);
      if (!existing) throw new NotFoundError(`Document ${id} not found`);

      const buffer = Buffer.from(text, 'utf8');
      const extractedText = await extractText(buffer, existing.mimeType);

      const doc = updateDocumentContent(id, {
        content: buffer,
        extractedText,
        fileSize: buffer.length,
      });

      if (!doc) throw new NotFoundError(`Document ${id} not found`);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/documents/:id — Delete document
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = deleteDocument(id);
    if (!deleted) throw new NotFoundError(`Document ${id} not found`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/tags — Add tag to document
router.post('/:id/tags', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { tag } = req.body as { tag: string };

    if (!tag || !tag.trim()) {
      throw new ValidationError('tag is required');
    }

    const existing = getDocument(id);
    if (!existing) throw new NotFoundError(`Document ${id} not found`);

    addTagToDocument(id, tag);
    const updated = getDocument(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id/tags/:tag — Remove tag from document
router.delete(
  '/:id/tags/:tag',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { tag } = req.params;

      const existing = getDocument(id);
      if (!existing) throw new NotFoundError(`Document ${id} not found`);

      removeTagFromDocument(id, tag);
      const updated = getDocument(id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
