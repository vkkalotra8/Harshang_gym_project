import jwt from 'jsonwebtoken';
import { query } from './db.js';

/**
 * Generate a JWT for a user with a 7-day expiration.
 * @param {object} user
 * @param {number} user.id
 * @param {string} user.username
 * @param {string} user.email
 * @returns {string}
 */
export function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Express middleware to require JWT authentication.
 * Expects "Authorization: Bearer <token>"
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const users = await query(
      'SELECT id, username, email, goal, created_at FROM users WHERE id = ?',
      [payload.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    next(err);
  }
}
