import express from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  completeOnboarding,
  updateProfile,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.patch('/complete-onboarding', authenticateToken, completeOnboarding);
router.put('/me', authenticateToken, updateProfile);

export default router;
