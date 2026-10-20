export const STRENGTH_DIVISOR = 50;
export const BODYWEIGHT_DIVISOR = 20;
export const CARDIO_DURATION_MULTIPLIER = 1;
export const CARDIO_DISTANCE_MULTIPLIER = 5;

export interface WorkoutPointsInput {
  type: 'strength' | 'bodyweight' | 'cardio';
  sets?: number | string | null;
  reps?: number | string | null;
  weight_kg?: number | string | null;
  duration_min?: number | string | null;
  distance_km?: number | string | null;
}

/**
 * Calculates estimated points for live client preview.
 * - strength:   (sets x reps x weight_kg) / 50
 * - bodyweight: (sets x reps) / 20
 * - cardio:     duration_min x 1 + distance_km x 5
 * Rounded to 2 decimal places.
 */
export function estimatePoints(input: WorkoutPointsInput): number {
  let raw = 0;

  if (input.type === 'strength') {
    const sets = Number(input.sets) || 0;
    const reps = Number(input.reps) || 0;
    const weight = Number(input.weight_kg) || 0;
    raw = (sets * reps * weight) / STRENGTH_DIVISOR;
  } else if (input.type === 'bodyweight') {
    const sets = Number(input.sets) || 0;
    const reps = Number(input.reps) || 0;
    raw = (sets * reps) / BODYWEIGHT_DIVISOR;
  } else if (input.type === 'cardio') {
    const duration = Number(input.duration_min) || 0;
    const distance = Number(input.distance_km) || 0;
    raw = duration * CARDIO_DURATION_MULTIPLIER + distance * CARDIO_DISTANCE_MULTIPLIER;
  }

  return Math.round((raw + Number.EPSILON) * 100) / 100;
}
