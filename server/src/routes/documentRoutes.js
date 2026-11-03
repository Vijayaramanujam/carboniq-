import express from 'express';
import {
  uploadDocuments,
  uploadZip,
  getDocuments,
  getDocumentById,
  getDocumentPreview,
  reuploadDocument,
  reprocessDocument,
  reviewDocument,
  calculateDocumentEmissionsHandler,
  exportDocumentReportPDF,
} from '../controllers/documentController.js';
import { uploadMulti, uploadSingle } from '../middleware/uploadMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All document operations require authenticated Indian SME session
router.use(authenticateToken);

router.post('/calculate-emissions', calculateDocumentEmissionsHandler);
router.post('/upload', uploadMulti, uploadDocuments);
router.post('/upload-zip', uploadSingle, uploadZip);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.get('/:id/preview', getDocumentPreview);
router.get('/:id/report/pdf', exportDocumentReportPDF);
router.post('/:id/reupload', uploadSingle, reuploadDocument);
router.post('/:id/reprocess', reprocessDocument);
router.patch('/:id/review', reviewDocument);

export default router;

