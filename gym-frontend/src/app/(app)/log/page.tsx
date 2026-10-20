'use client';

import React from 'react';
import Link from 'next/link';
import { Dumbbell, Trophy, Info } from 'lucide-react';
import { WorkoutForm } from '@/components/workout-form';

export default function LogPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-md shadow-orange-500/10">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Log Workout
            </h1>
            <p className="text-sm text-muted-foreground">
              Record sets, reps, weight, or distance to calculate live points.
            </p>
          </div>
        </div>

        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <Trophy className="h-4 w-4 text-amber-500" />
          View Current Rankings
        </Link>
      </div>

      {/* Main Interactive Workout Form */}
      <WorkoutForm />

      {/* Quick Scoring Guidance Banner */}
      <div className="p-4 rounded-xl border border-border/80 bg-card/60 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Points Scoring System:</p>
          <p>
            • <strong className="text-foreground">Strength:</strong> (sets × reps × weight) / 50
            &nbsp;|&nbsp;
            • <strong className="text-foreground">Bodyweight:</strong> (sets × reps) / 20
            &nbsp;|&nbsp;
            • <strong className="text-foreground">Cardio:</strong> (duration × 1) + (distance × 5)
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Anti-cheat rules: Max 1,000 points per workout. Maximum 30 workouts logged per day.
          </p>
        </div>
      </div>
    </div>
  );
}
