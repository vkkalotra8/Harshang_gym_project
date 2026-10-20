import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import multer from 'multer';

import authRoutes from './routes/auth.js';
import workoutRoutes from './routes/workouts.js';
import leaderboardRoutes from './routes/leaderboard.js';
import postRoutes, { uploadDir } from './routes/posts.js';
import groupRoutes from './routes/groups.js';
import badgeRoutes from './routes/badges.js';

dotenv.config();

// Startup validation for JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing or shorter than 32 characters.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*'
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Ensure upload directory exists and serve static uploads
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute overall
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes on /api/auth
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' }
});

// Mount routes
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/badges', badgeRoutes);

// Unknown route handler
app.use((req, res) => {
  return res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Invalid input',
      details: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (maximum size is 5 MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry already exists' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(404).json({ error: 'Referenced resource not found' });
  }

  if (err.status && err.message) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: 'Something went wrong' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`GymCommunity backend running on port ${PORT}`);
  });
}

export default app;
