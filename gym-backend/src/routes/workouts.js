import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import {
  calculatePoints,
  validatePoints,
  MAX_WORKOUTS_PER_DAY,
  STRENGTH_REPS_MAX,
  BODYWEIGHT_REPS_MAX
} from '../points.js';
import { awardBadges, calculateStreak, formatLocalDate } from '../badges.js';

const router = Router();

// Workouts require authentication
router.use(requireAuth);

const strengthSchema = z.object({
  type: z.literal('strength'),
  exercise: z.string().trim().min(1, 'Exercise name is required').max(100, 'Exercise name is too long'),
  sets: z.number().int().min(1, 'Sets must be at least 1').max(50, 'Sets cannot exceed 50'),
  reps: z.number().int().min(1, 'Reps must be at least 1').max(STRENGTH_REPS_MAX, `Strength reps must be between 1 and ${STRENGTH_REPS_MAX} per set`),
  weight_kg: z.number().min(0, 'Weight must be non-negative').max(600, 'Weight cannot exceed 600 kg'),
  logged_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional()
});

const bodyweightSchema = z.object({
  type: z.literal('bodyweight'),
  exercise: z.string().trim().min(1, 'Exercise name is required').max(100, 'Exercise name is too long'),
  sets: z.number().int().min(1, 'Sets must be at least 1').max(50, 'Sets cannot exceed 50'),
  reps: z.number().int().min(1, 'Reps must be at least 1').max(BODYWEIGHT_REPS_MAX, `Bodyweight reps must be between 1 and ${BODYWEIGHT_REPS_MAX} per set`),
  logged_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional()
});

const cardioSchema = z.object({
  type: z.literal('cardio'),
  exercise: z.string().trim().min(1, 'Exercise name is required').max(100, 'Exercise name is too long'),
  duration_min: z.number().min(1, 'Duration must be at least 1 minute').max(600, 'Duration cannot exceed 600 minutes'),
  distance_km: z.number().min(0, 'Distance must be non-negative').max(200, 'Distance cannot exceed 200 km').optional().default(0),
  logged_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional()
});

const createWorkoutSchema = z.discriminatedUnion('type', [
  strengthSchema,
  bodyweightSchema,
  cardioSchema
]);

// GET /api/workouts/streak
router.get('/streak', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT DISTINCT logged_on FROM workouts WHERE user_id = ? ORDER BY logged_on DESC',
      [req.user.id]
    );

    const dateStrings = rows.map((r) => r.logged_on);
    const streak = calculateStreak(dateStrings);

    return res.status(200).json({ streak });
  } catch (err) {
    next(err);
  }
});

// POST /api/workouts
router.post('/', async (req, res, next) => {
  try {
    const data = createWorkoutSchema.parse(req.body);

    // Calculate server points (ignoring any points from client)
    const points = calculatePoints(data);

    // Anti-cheat: Check maximum points per workout
    validatePoints(points);

    const loggedOnDate = data.logged_on || formatLocalDate(new Date());

    // Anti-cheat: Limit to at most 30 workouts per day
    const countRows = await query(
      'SELECT COUNT(*) AS count FROM workouts WHERE user_id = ? AND logged_on = ?',
      [req.user.id, loggedOnDate]
    );

    if (Number(countRows[0]?.count || 0) >= MAX_WORKOUTS_PER_DAY) {
      return res.status(429).json({ error: 'Daily workout limit reached (max 30 per day)' });
    }

    const sets = data.sets !== undefined ? data.sets : null;
    const reps = data.reps !== undefined ? data.reps : null;
    const weightKg = data.weight_kg !== undefined ? data.weight_kg : null;
    const durationMin = data.duration_min !== undefined ? data.duration_min : null;
    const distanceKm = data.distance_km !== undefined ? data.distance_km : null;

    const result = await query(
      `INSERT INTO workouts (
        user_id, exercise, type, sets, reps, weight_kg, duration_min, distance_km, points, logged_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        data.exercise,
        data.type,
        sets,
        reps,
        weightKg,
        durationMin,
        distanceKm,
        points,
        loggedOnDate
      ]
    );

    const insertedRows = await query(
      'SELECT * FROM workouts WHERE id = ?',
      [result.insertId]
    );

    const workout = insertedRows[0];

    // Check and award badges
    const newBadges = await awardBadges(req.user.id);

    return res.status(201).json({
      workout,
      newBadges
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/workouts
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;

    if (date) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
      }

      const rows = await query(
        'SELECT * FROM workouts WHERE user_id = ? AND logged_on = ? ORDER BY id DESC',
        [req.user.id, date]
      );
      return res.status(200).json({ workouts: rows });
    }

    const rows = await query(
      'SELECT * FROM workouts WHERE user_id = ? ORDER BY logged_on DESC, id DESC LIMIT 100',
      [req.user.id]
    );

    return res.status(200).json({ workouts: rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workouts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const workoutId = Number(req.params.id);
    if (!Number.isInteger(workoutId) || workoutId <= 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const result = await query(
      'DELETE FROM workouts WHERE id = ? AND user_id = ?',
      [workoutId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
