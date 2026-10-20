import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { requireAuth } from '../auth.js';
import { PERIOD_FILTERS, formatLeaderboardPoints } from '../points.js';

const router = Router();

const VALID_TYPES = ['strength', 'bodyweight', 'cardio'];

const createGroupSchema = z.object({
  name: z
    .string({ required_error: 'Group name is required' })
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name is too long'),
  goal: z
    .string()
    .trim()
    .max(100, 'Goal is too long')
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description is too long')
    .optional()
    .nullable()
});

// GET /api/groups/:id/leaderboard - Public group leaderboard
router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const groupRows = await query('SELECT id, name FROM fitness_groups WHERE id = ?', [groupId]);
    if (groupRows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupRows[0];
    const periodParam = req.query.period;
    const typeParam = req.query.type;

    const period = (typeof periodParam === 'string' && PERIOD_FILTERS[periodParam.toLowerCase()])
      ? periodParam.toLowerCase()
      : 'weekly';

    const periodCondition = PERIOD_FILTERS[period];
    let typeCondition = '';
    const params = [groupId];

    if (typeof typeParam === 'string' && VALID_TYPES.includes(typeParam.toLowerCase())) {
      typeCondition = 'AND w.type = ?';
      params.push(typeParam.toLowerCase());
    }

    const sql = `
      WITH GroupRankedLeaderboard AS (
        SELECT 
          u.id AS user_id,
          u.username,
          SUM(w.points) AS raw_points,
          ROUND(SUM(w.points)) AS points,
          COUNT(w.id) AS entries,
          RANK() OVER (ORDER BY SUM(w.points) DESC) AS \`rank\`
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        JOIN workouts w ON u.id = w.user_id
        WHERE gm.group_id = ?
          AND ${periodCondition} ${typeCondition}
        GROUP BY u.id, u.username
      )
      SELECT \`rank\`, user_id, username, points, entries
      FROM GroupRankedLeaderboard
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
      group: {
        id: Number(group.id),
        name: group.name
      },
      period,
      type: typeof typeParam === 'string' && VALID_TYPES.includes(typeParam.toLowerCase()) ? typeParam.toLowerCase() : null,
      leaderboard: formattedRows
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated group endpoints
router.use(requireAuth);

// GET /api/groups - List all groups with member count and membership status
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        g.id,
        g.name,
        g.goal,
        g.description,
        g.created_by,
        g.created_at,
        COUNT(DISTINCT gm.user_id) AS member_count,
        EXISTS(SELECT 1 FROM group_members my_gm WHERE my_gm.group_id = g.id AND my_gm.user_id = ?) AS is_member
      FROM fitness_groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id, g.name, g.goal, g.description, g.created_by, g.created_at
      ORDER BY member_count DESC, g.name ASC;
    `;

    const rows = await query(sql, [req.user.id]);

    const groups = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      goal: r.goal,
      description: r.description,
      created_by: r.created_by !== null ? Number(r.created_by) : null,
      created_at: r.created_at,
      member_count: Number(r.member_count),
      is_member: Boolean(r.is_member)
    }));

    return res.status(200).json({ groups });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups - Create a new fitness group (creator automatically joins)
router.post('/', async (req, res, next) => {
  let connection;
  try {
    const data = createGroupSchema.parse(req.body);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      'INSERT INTO fitness_groups (name, goal, description, created_by) VALUES (?, ?, ?, ?)',
      [data.name, data.goal || null, data.description || null, req.user.id]
    );

    const groupId = insertResult.insertId;

    // Creator joins group automatically
    await connection.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, req.user.id]
    );

    await connection.commit();

    const newGroup = {
      id: groupId,
      name: data.name,
      goal: data.goal || null,
      description: data.description || null,
      created_by: req.user.id,
      member_count: 1,
      is_member: true,
      created_at: new Date().toISOString()
    };

    return res.status(201).json({ group: newGroup });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    next(err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// POST /api/groups/:id/join - Join a group (idempotent 204)
router.post('/:id/join', async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const groupRows = await query('SELECT id FROM fitness_groups WHERE id = ?', [groupId]);
    if (groupRows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    await query(
      'INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, req.user.id]
    );

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/leave - Leave a group (idempotent 204)
router.post('/:id/leave', async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const groupRows = await query('SELECT id FROM fitness_groups WHERE id = ?', [groupId]);
    if (groupRows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    await query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
