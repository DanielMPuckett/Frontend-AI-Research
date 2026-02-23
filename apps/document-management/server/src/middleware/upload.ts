import multer from 'multer';

// Use memory storage so file buffers are available directly in req.file.buffer
// No file size limit enforced — per project brief requirement
export const upload = multer({ storage: multer.memoryStorage() });
