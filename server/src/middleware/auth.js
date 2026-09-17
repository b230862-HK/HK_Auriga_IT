import jwt from 'jsonwebtoken';
import { Owner } from '../models/Owner.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'tiffin_secret_key_change_in_prod_2026';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token.'
      });
    }

    const owner = await Owner.findById(decoded.id).select('-password');
    if (!owner) {
      return res.status(401).json({
        success: false,
        error: 'Owner account associated with this token not found.'
      });
    }

    req.owner = owner;
    next();
  } catch (err) {
    next(err);
  }
}

export function generateToken(ownerId) {
  return jwt.sign({ id: ownerId }, JWT_SECRET, { expiresIn: '7d' });
}
