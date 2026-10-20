// Named constants for tuning scoring and limits
export const STRENGTH_DIVISOR = 50;
export const BODYWEIGHT_DIVISOR = 20;
export const CARDIO_DURATION_MULTIPLIER = 1;
export const CARDIO_DISTANCE_MULTIPLIER = 5;
export const MAX_WORKOUT_POINTS = 1000;
export const MAX_WORKOUTS_PER_DAY = 30;
export const STRENGTH_REPS_MIN = 1;
export const STRENGTH_REPS_MAX = 100;
export const BODYWEIGHT_REPS_MIN = 1;
export const BODYWEIGHT_REPS_MAX = 500;

// Whitelisted database period filter fragments
export const PERIOD_FILTERS = {
  daily: "w.logged_on = CURDATE()",
  weekly: "w.logged_on >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
  monthly: "w.logged_on >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
};

/**
 * Calculate points earned for a single workout based on its type and metrics.
 * 
 * Formulas:
 * - strength:   points = (sets x reps x weight_kg) / 50
 * - bodyweight: points = (sets x reps) / 20
 * - cardio:     points = duration_min x 1 + distance_km x 5 (distance_km defaults to 0)
 * 
 * Points are rounded to 2 decimal places.
 *
 * @param {object} workout
 * @param {'strength'|'bodyweight'|'cardio'} workout.type
 * @param {number} [workout.sets]
 * @param {number} [workout.reps]
 * @param {number} [workout.weight_kg]
 * @param {number} [workout.duration_min]
 * @param {number} [workout.distance_km]
 * @returns {number} Points rounded to 2 decimals
 */
export function calculatePoints(workout) {
  let rawPoints = 0;

  switch (workout.type) {
    case 'strength': {
      const sets = Number(workout.sets);
      const reps = Number(workout.reps);
      const weight = Number(workout.weight_kg);
      rawPoints = (sets * reps * weight) / STRENGTH_DIVISOR;
      break;
    }
    case 'bodyweight': {
      const sets = Number(workout.sets);
      const reps = Number(workout.reps);
      rawPoints = (sets * reps) / BODYWEIGHT_DIVISOR;
      break;
    }
    case 'cardio': {
      const duration = Number(workout.duration_min);
      const distance = Number(workout.distance_km !== undefined && workout.distance_km !== null ? workout.distance_km : 0);
      rawPoints = (duration * CARDIO_DURATION_MULTIPLIER) + (distance * CARDIO_DISTANCE_MULTIPLIER);
      break;
    }
    default:
      throw new Error(`Unsupported workout type: ${workout.type}`);
  }

  // Round to 2 decimals
  const roundedPoints = Math.round((rawPoints + Number.EPSILON) * 100) / 100;
  return roundedPoints;
}

/**
 * Validates that the calculated workout points do not violate the anti-cheat cap.
 * @param {number} points
 */
export function validatePoints(points) {
  if (points > MAX_WORKOUT_POINTS) {
    const error = new Error("Workout is too large to be realistic");
    error.status = 400;
    throw error;
  }
}

/**
 * Formats points for leaderboard display (rounded to whole number).
 * @param {number} totalPoints
 * @returns {number}
 */
export function formatLeaderboardPoints(totalPoints) {
  return Math.round(Number(totalPoints) || 0);
}
