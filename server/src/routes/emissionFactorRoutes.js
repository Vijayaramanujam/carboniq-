import express from 'express';
import { getEmissionFactors, getEmissionFactorSummary } from '../controllers/emissionFactorController.js';

const router = express.Router();

// GET /api/emission-factors/summary - Retrieve aggregate counts and distinct filter options
router.get('/summary', getEmissionFactorSummary);

// GET /api/emission-factors - Retrieve paginated and filtered emission factors
router.get('/', getEmissionFactors);
router.get('/dataset', getEmissionFactors);

export default router;
