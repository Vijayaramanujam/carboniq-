import express from 'express';
import {
  createActivity,
  getActivities,
  updateActivity,
  deleteActivity,
} from '../controllers/activityController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All activity operations require authenticated Indian SME session
router.use(authenticateToken);

router.post('/', createActivity);
router.get('/', getActivities);
router.patch('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
