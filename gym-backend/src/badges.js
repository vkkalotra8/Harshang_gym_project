import { query } from './db.js';

export const BADGE_DEFINITIONS = [
  {
    code: 'FIRST_WORKOUT',
    name: 'First Step',
    description: 'First workout ever logged'
  },
  {
    code: 'STREAK_7',
    name: 'Week Warrior',
    description: '7-day workout streak'
  },
  {
    code: 'STREAK_30',
    name: 'Iron Consistency',
    description: '30-day workout streak'
  },
  {
    code: 'WORKOUTS_100',
    name: 'Century Club',
    description: '100 workouts logged in total'
  },
  {
    code: 'POINTS_1000',
    name: 'Point Master',
    description: '1,000 lifetime points earned'
  }
];

/**
 * Format a Date object as YYYY-MM-DD in local time
 * @param {Date} [d]
 * @returns {string}
 */
export function formatLocalDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date object (not UTC)
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate consecutive workout streak ending today or yesterday.
 * @param {string[]} dateStrings
 * @returns {number}
 */
export function calculateStreak(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) {
    return 0;
  }

  const now = new Date();
  const todayStr = formatLocalDate(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  // Distinct dates sorted descending
  const uniqueDates = Array.from(new Set(dateStrings)).sort().reverse();
  const mostRecent = uniqueDates[0];

  // If the last workout was 2 or more days ago the streak is 0
  if (mostRecent !== todayStr && mostRecent !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expected = parseLocalDate(mostRecent);

  for (const dStr of uniqueDates) {
    const cur = parseLocalDate(dStr);
    const diffDays = Math.round((expected.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      streak++;
      expected = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Checks and awards any newly earned badges for a user.
 * Uses INSERT IGNORE so badges are never awarded twice.
 * @param {number} userId
 * @returns {Promise<Array<{code: string, name: string, description: string}>>} Newly earned badges
 */
export async function awardBadges(userId) {
  // 1. Fetch user workout totals
  const stats = await query(
    'SELECT COUNT(*) AS total_count, COALESCE(SUM(points), 0) AS total_points FROM workouts WHERE user_id = ?',
    [userId]
  );

  const totalCount = Number(stats[0]?.total_count || 0);
  const totalPoints = Number(stats[0]?.total_points || 0);

  // 2. Fetch workout dates for streak calculation
  const dateRows = await query(
    'SELECT DISTINCT logged_on FROM workouts WHERE user_id = ? ORDER BY logged_on DESC',
    [userId]
  );
  const dateStrings = dateRows.map((r) => r.logged_on);
  const streak = calculateStreak(dateStrings);

  // 3. Determine qualifying badges
  const eligibleCodes = [];
  if (totalCount >= 1) {
    eligibleCodes.push('FIRST_WORKOUT');
  }
  if (totalCount >= 100) {
    eligibleCodes.push('WORKOUTS_100');
  }
  if (totalPoints >= 1000) {
    eligibleCodes.push('POINTS_1000');
  }
  if (streak >= 7) {
    eligibleCodes.push('STREAK_7');
  }
  if (streak >= 30) {
    eligibleCodes.push('STREAK_30');
  }

  // 4. Insert ignore and identify newly awarded badges
  const newlyEarned = [];
  for (const code of eligibleCodes) {
    const result = await query(
      'INSERT IGNORE INTO user_badges (user_id, badge_code) VALUES (?, ?)',
      [userId, code]
    );

    if (result.affectedRows > 0) {
      const def = BADGE_DEFINITIONS.find((b) => b.code === code);
      if (def) {
        newlyEarned.push(def);
      }
    }
  }

  return newlyEarned;
}
