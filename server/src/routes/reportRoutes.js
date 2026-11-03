import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getStatutorySummary,
  exportBRSRPDF,
  exportBRSRExcel,
  exportCBAMXml,
  exportCBAMCsv,
  exportAuditLedgerCsv,
} from '../controllers/reportController.js';

const router = express.Router();

// All reporting endpoints require authentication
router.use(authenticateToken);


// Summary JSON for live preview
router.get('/summary', getStatutorySummary);

// SEBI BRSR Core Exports
router.get('/brsr/pdf', exportBRSRPDF);
router.get('/brsr/excel', exportBRSRExcel);

// EU CBAM Exports (Steel, Aluminum, Cement)
router.get('/cbam/xml', exportCBAMXml);
router.get('/cbam/csv', exportCBAMCsv);

// Standard Full Audit Ledger
router.get('/export/csv', exportAuditLedgerCsv);

export default router;
