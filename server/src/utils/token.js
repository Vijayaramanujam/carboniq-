import jwt from 'jsonwebtoken';

export function generateToken(companyId) {
  const secret = process.env.JWT_SECRET || 'carboniq_indian_sme_jwt_secret_key_2026_secure';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: companyId }, secret, { expiresIn });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'carboniq_indian_sme_jwt_secret_key_2026_secure';
  return jwt.verify(token, secret);
}
