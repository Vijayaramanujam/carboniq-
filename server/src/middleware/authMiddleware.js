import mongoose from 'mongoose';
import { verifyToken } from '../utils/token.js';
import { Company } from '../models/Company.js';
import { demoCompanies } from '../controllers/authController.js';

export async function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  // 2. Check query parameter token (used by browser <img>, <iframe>, and new tab previews)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid JWT bearer token.',
    });
  }

  try {
    const decoded = verifyToken(token);

    let company = null;
    if (mongoose.connection.readyState === 1) {
      company = await Company.findById(decoded.id).select('-password');
    } else {
      company = demoCompanies.get(decoded.id) || {
        _id: decoded.id,
        companyName: 'Apex Precision Engineering Ltd',
        businessEmail: 'sustainability@apexprecision.com',
        phoneNumber: '+919876543210',
        industryType: 'Manufacturing',
        businessSize: 'Small',
        gstin: '27AABCA1234F1Z5',
        country: 'India',
        currency: 'INR',
        isPhoneVerified: true,
        hasCompletedOnboarding: true,
      };
    }

    if (!company) {
      return res.status(401).json({
        success: false,
        error: 'The registered company account associated with this token no longer exists.',
      });
    }

    req.company = company;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please log in again.',
    });
  }
}
