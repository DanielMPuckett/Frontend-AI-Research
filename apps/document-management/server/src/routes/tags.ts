import { Router, Request, Response, NextFunction } from 'express';
import { listTags } from '../services/tagService';

const router = Router();

// GET /api/tags — List all tags with document counts
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = listTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

export default router;
