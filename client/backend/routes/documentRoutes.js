import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadDocument, getEntityDocuments, verifyDocument, rejectDocument, deleteDocument } from '../controllers/documentController.js';

const router = express.Router();

router.post('/upload', authenticateToken, requireAuth(['admin']), upload.single('document'), uploadDocument);
router.get('/:entity_type/:entity_id', authenticateToken, requireAuth(['admin']), getEntityDocuments);
router.patch('/:document_id/verify', authenticateToken, requireAuth(['admin']), verifyDocument);
router.patch('/:document_id/reject', authenticateToken, requireAuth(['admin']), rejectDocument);
router.delete('/:document_id', authenticateToken, requireAuth(['admin']), deleteDocument);

export default router;