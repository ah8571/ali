import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import { extractReaderTextFromUpload } from '../services/documentReaderService.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

router.post('/extract', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const result = await extractReaderTextFromUpload(req.file);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Reader document import failed:', error.message);
    return res.status(400).json({ error: error.message || 'Unable to import document' });
  }
});

router.use((error, req, res, next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Document is too large. Keep uploads under 8 MB.' });
  }

  return next(error);
});

export default router;