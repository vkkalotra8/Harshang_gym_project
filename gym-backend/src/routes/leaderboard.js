import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { PERIOD_FILTERS, formatLeaderboardPoints } from '../points.js';

const router = Router();

const VALID_TYPES = ['strength', 'bodyweight', 'cardio'];

/**
 * Helper to build the period condition and type filter
 */
function buildLeaderboardFilter(periodParam, typeParam) {
  const period = (typeof periodParam === 'string' && PERIOD_FILTERS[periodParam.toLowerCase()])
    ? periodParam.toLowerCase()
    : 'weekly';

  const periodCondition = PERIOD_FILTERS[period];
  let typeCondition = '';
  const params = [];

  if (typeof typeParam === 'string' && VALID_TYPES.includes(typeParam.toLowerCase())) {
    typeCondition = 'AND w.type = ?';
    params.push(typeParam.toLowerCase());
  }

  return { period, periodCondition, typeCondition, params };
}

// GET /api/leaderboard - Public leaderboard
router.get('/', async (req, res, next) => {
  try {
    const { period, periodCondition, typeCondition, params } = buildLeaderboardFilter(
      req.query.period,
      req.query.type
    );

    const sql = `
      WITH RankedLeaderboard AS (
        SELECT 
          u.id AS user_id,
          u.username,
          SUM(w.points) AS raw_points,
          ROUND(SUM(w.points)) AS points,
          COUNT(w.id) AS entries,
          RANK() OVER (ORDER BY SUM(w.points) DESC) AS \`rank\`
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        WHERE ${periodCondition} ${typeCondition}
        GROUP BY u.id, u.username
      )
      SELECT \`rank\`, user_id, username, points, entries
      FROM RankedLeaderboard
      ORDER BY raw_points DESC, entries ASC, username ASC
      LIMIT 50;
    `;

    const rows = await query(sql, params);

    const formattedRows = rows.map((r) => ({
      rank: Number(r.rank),
      user_id: Number(r.user_id),
      username: r.username,
      points: formatLeaderboardPoints(r.points),
      entries: Number(r.entries)
    }));

    return res.status(200).json({
      period,
      type: req.query.type && VALID_TYPES.includes(String(req.query.type).toLowerCase()) ? String(req.query.type).toLowerCase() : null,
      leaderboard: formattedRows
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboard/me - Caller rank & score (even outside top 50)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { period, periodCondition, typeCondition, params } = buildLeaderboardFilter(
      req.query.period,
      req.query.type
    );

    const sql = `
      WITH RankedLeaderboard AS (
        SELECT 
          u.id AS user_id,
          u.username,
          SUM(w.points) AS raw_points,
          ROUND(SUM(w.points)) AS points,
          COUNT(w.id) AS entries,
          RANK() OVER (ORDER BY SUM(w.points) DESC) AS \`rank\`
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        WHERE ${periodCondition} ${typeCondition}
        GROUP BY u.id, u.username
      )
      SELECT \`rank\`, user_id, username, points, entries
      FROM RankedLeaderboard
      WHERE user_id = ?;
    `;

    const meParams = [...params, req.user.id];
    const rows = await query(sql, meParams);

    if (rows.length > 0) {
      const r = rows[0];
      return res.status(200).json({
        period,
        rank: Number(r.rank),
        user_id: Number(r.user_id),
        username: r.username,
        points: formatLeaderboardPoints(r.points),
        entries: Number(r.entries)
      });
    }

    return res.status(200).json({
      period,
      rank: null,
      user_id: req.user.id,
      username: req.user.username,
      points: 0,
      entries: 0
    });
  } catch (err) {
    next(err);
  }
});

export default router;
