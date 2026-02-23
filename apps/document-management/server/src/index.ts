import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import documentsRouter from './routes/documents';
import foldersRouter from './routes/folders';
import tagsRouter from './routes/tags';
import { NotFoundError, ValidationError } from './types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/documents', documentsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/tags', tagsRouter);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// Initialize DB and start server
runMigrations();
app.listen(PORT, () => {
  console.log(`Document Management API running on http://localhost:${PORT}`);
});

export default app;
