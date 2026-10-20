import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

const registerSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be between 3 and 30 characters')
    .max(30, 'Username must be between 3 and 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  goal: z
    .string()
    .trim()
    .max(50, 'Goal must be at most 50 characters')
    .optional()
    .nullable()
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if username or email already exists
    const existing = await query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [data.username, data.email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(data.password, 12);
    const goal = data.goal || null;

    const result = await query(
      'INSERT INTO users (username, email, password_hash, goal) VALUES (?, ?, ?, ?)',
      [data.username, data.email, passwordHash, goal]
    );

    const newUser = {
      id: result.insertId,
      username: data.username,
      email: data.email,
      goal,
      created_at: new Date().toISOString()
    };

    const token = signToken(newUser);

    return res.status(201).json({
      user: newUser,
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const users = await query(
      'SELECT id, username, email, password_hash, goal, created_at FROM users WHERE email = ? LIMIT 1',
      [data.email]
    );

    if (users.length === 0) {
      // Dummy compare to protect against timing attacks
      await bcrypt.compare(data.password, '$2a$12$e80yq7Kj4VbF3bX8iM/o2eP0d8V/7v0rF5qI2yD8zWbYqU1f6pXvy');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(data.password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        goal: user.goal,
        created_at: user.created_at
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({ user: req.user });
});

export default router;
