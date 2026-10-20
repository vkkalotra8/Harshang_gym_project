import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePoints, validatePoints, formatLeaderboardPoints } from '../src/points.js';

describe('Scoring Logic (src/points.js)', () => {
  test('Worked example 1: Bench press 4 sets x 8 reps x 60 kg', () => {
    const workout = {
      type: 'strength',
      exercise: 'Bench Press',
      sets: 4,
      reps: 8,
      weight_kg: 60
    };
    const points = calculatePoints(workout);
    assert.equal(points, 38.4);
  });

  test('Worked example 2: Push-ups 3 sets x 20 reps', () => {
    const workout = {
      type: 'bodyweight',
      exercise: 'Push-ups',
      sets: 3,
      reps: 20
    };
    const points = calculatePoints(workout);
    assert.equal(points, 3);
  });

  test('Worked example 3: Running 30 min, 5 km', () => {
    const workout = {
      type: 'cardio',
      exercise: 'Running',
      duration_min: 30,
      distance_km: 5
    };
    const points = calculatePoints(workout);
    assert.equal(points, 55);
  });

  test('Worked example 4: Squat 5 sets x 5 reps x 100 kg', () => {
    const workout = {
      type: 'strength',
      exercise: 'Squat',
      sets: 5,
      reps: 5,
      weight_kg: 100
    };
    const points = calculatePoints(workout);
    assert.equal(points, 50);
  });

  test('Rounding behavior: rounds workout points to 2 decimal places', () => {
    // 3 sets x 7 reps x 41 kg / 50 = 861 / 50 = 17.22
    const workout = {
      type: 'strength',
      exercise: 'Overhead Press',
      sets: 3,
      reps: 7,
      weight_kg: 41
    };
    const points = calculatePoints(workout);
    assert.equal(points, 17.22);

    // Bodyweight 3 sets x 11 reps / 20 = 33 / 20 = 1.65
    const bwWorkout = {
      type: 'bodyweight',
      exercise: 'Pull-ups',
      sets: 3,
      reps: 11
    };
    assert.equal(calculatePoints(bwWorkout), 1.65);
  });

  test('Leaderboard points formatting rounds to whole numbers', () => {
    assert.equal(formatLeaderboardPoints(38.4), 38);
    assert.equal(formatLeaderboardPoints(55.6), 56);
    assert.equal(formatLeaderboardPoints(50.0), 50);
  });

  test('Anti-cheat: allows workouts up to 1000 points', () => {
    assert.doesNotThrow(() => {
      validatePoints(1000);
    });
    assert.doesNotThrow(() => {
      validatePoints(999.99);
    });
  });

  test('Anti-cheat: rejects workouts exceeding 1000 points with status 400', () => {
    assert.throws(
      () => {
        validatePoints(1000.01);
      },
      (err) => {
        return err.message === 'Workout is too large to be realistic' && err.status === 400;
      }
    );

    assert.throws(
      () => {
        validatePoints(2500);
      },
      (err) => {
        return err.message === 'Workout is too large to be realistic' && err.status === 400;
      }
    );
  });
});
