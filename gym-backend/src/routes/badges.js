import { Router } from 'express';
import { BADGE_DEFINITIONS } from '../badges.js';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

const router = Router();

// GET /api/badges - List all badge definitions
router.get('/', (req, res) => {
  return res.status(200).json({ badges: BADGE_DEFINITIONS, definitions: BADGE_DEFINITIONS });
});

// GET /api/badges/me - List caller's earned badges with awarded_at
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT badge_code, awarded_at FROM user_badges WHERE user_id = ? ORDER BY awarded_at DESC',
      [req.user.id]
    );

    const badges = rows.map((row) => {
      const def = BADGE_DEFINITIONS.find((b) => b.code === row.badge_code);
      return {
        badge_code: row.badge_code,
        code: row.badge_code,
        name: def ? def.name : row.badge_code,
        description: def ? def.description : '',
        awarded_at: row.awarded_at
      };
    });

    return res.status(200).json({ badges, earned: badges });
  } catch (err) {
    next(err);
  }
});

export default router;
