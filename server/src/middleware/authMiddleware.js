import { verifyToken } from '../utils/token.js';
import { Company } from '../models/Company.js';

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
    const company = await Company.findById(decoded.id).select('-password');

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
