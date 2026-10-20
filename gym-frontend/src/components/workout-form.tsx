'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dumbbell,
  Activity,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  Trophy,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

import {
  workoutFormSchema,
  WorkoutFormData,
  strengthWorkoutSchema,
  bodyweightWorkoutSchema,
  cardioWorkoutSchema,
} from '@/lib/schemas';
import { apiRequest, ApiError } from '@/lib/api';
import { WorkoutLogResponse, WorkoutType, Badge } from '@/lib/types';
import { estimatePoints } from '@/lib/points';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const SUGGESTIONS: Record<WorkoutType, string[]> = {
  strength: ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Incline Dumbbell Press', 'Bicep Curl', 'Lat Pulldown'],
  bodyweight: ['Push-ups', 'Pull-ups', 'Dips', 'Chin-ups', 'Bodyweight Squats', 'Plank', 'Lunges', 'Burpees'],
  cardio: ['Running', 'Cycling', 'Rowing', 'Treadmill', 'Stair Climber', 'Jump Rope', 'Swimming', 'Outdoor Walk'],
};

export function WorkoutForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [workoutType, setWorkoutType] = useState<WorkoutType>('strength');
  const [serverError, setServerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<WorkoutLogResponse | null>(null);
  const [celebrationBadges, setCelebrationBadges] = useState<Badge[]>([]);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  // Schema matches the active segmented workout type
  const activeSchema =
    workoutType === 'strength'
      ? strengthWorkoutSchema
      : workoutType === 'bodyweight'
      ? bodyweightWorkoutSchema
      : cardioWorkoutSchema;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(activeSchema),
    defaultValues: {
      type: 'strength',
      exercise: '',
      sets: 4,
      reps: 10,
      weight_kg: 50,
      duration_min: 30,
      distance_km: 0,
    },
  });

  // Watch fields for live points calculation
  const watchedValues = useWatch({ control });

  const estimatedPts = estimatePoints({
    type: workoutType,
    sets: watchedValues?.sets,
    reps: watchedValues?.reps,
    weight_kg: watchedValues?.weight_kg,
    duration_min: watchedValues?.duration_min,
    distance_km: watchedValues?.distance_km,
  });

  // Switch active workout type
  const handleTypeChange = (newType: WorkoutType) => {
    setWorkoutType(newType);
    setServerError(null);
    setValue('type', newType);
    if (newType === 'strength') {
      setValue('sets', 4);
      setValue('reps', 8);
      setValue('weight_kg', 60);
      setValue('exercise', '');
    } else if (newType === 'bodyweight') {
      setValue('sets', 3);
      setValue('reps', 20);
      setValue('exercise', '');
    } else if (newType === 'cardio') {
      setValue('duration_min', 30);
      setValue('distance_km', 5);
      setValue('exercise', '');
    }
  };

  // Mutation to log workout
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest<WorkoutLogResponse>('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['badges-me'] });

      setSuccessData(data);
      toast.success(`Workout logged! Earned ${data.workout.points} points.`);

      // If new badges were awarded, trigger celebratory dialog
      if (data.newBadges && data.newBadges.length > 0) {
        setCelebrationBadges(data.newBadges);
        setIsCelebrationOpen(true);
      }
    },
    onError: (err: any) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Failed to log workout. Please check your network connection.');
      }
    },
  });

  const onSubmit = (formData: any) => {
    setServerError(null);
    mutation.mutate({
      ...formData,
      type: workoutType,
    });
  };

  const handleResetForAnother = () => {
    setSuccessData(null);
    setServerError(null);
    reset({
      type: workoutType,
      exercise: '',
      sets: workoutType === 'strength' ? 4 : 3,
      reps: workoutType === 'strength' ? 8 : 20,
      weight_kg: workoutType === 'strength' ? 60 : 0,
      duration_min: 30,
      distance_km: 5,
    });
  };

  // Success view after workout logging
  if (successData) {
    const { workout, newBadges } = successData;
    return (
      <Card className="border-green-500/30 bg-card shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 mb-2">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-foreground">
            Workout Logged Successfully!
          </CardTitle>
          <CardDescription>
            Your performance points have been officially calculated and added to your score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Points Highlight */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 text-center space-y-1">
            <span className="text-xs uppercase tracking-wider font-extrabold text-primary">
              Points Awarded
            </span>
            <div className="text-5xl font-black text-primary tracking-tight">
              +{workout.points} <span className="text-2xl font-bold">pts</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {workout.exercise} • {workout.type.toUpperCase()}
            </p>
          </div>

          {/* Details breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-sm">
            {workout.sets && (
              <div className="p-3 rounded-xl bg-accent/50 border border-border/60">
                <div className="text-xs text-muted-foreground">Sets</div>
                <div className="text-lg font-bold text-foreground">{workout.sets}</div>
              </div>
            )}
            {workout.reps && (
              <div className="p-3 rounded-xl bg-accent/50 border border-border/60">
                <div className="text-xs text-muted-foreground">Reps</div>
                <div className="text-lg font-bold text-foreground">{workout.reps}</div>
              </div>
            )}
            {workout.weight_kg !== null && workout.weight_kg !== undefined && (
              <div className="p-3 rounded-xl bg-accent/50 border border-border/60">
                <div className="text-xs text-muted-foreground">Weight</div>
                <div className="text-lg font-bold text-foreground">{workout.weight_kg} kg</div>
              </div>
            )}
            {workout.duration_min && (
              <div className="p-3 rounded-xl bg-accent/50 border border-border/60">
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="text-lg font-bold text-foreground">{workout.duration_min} min</div>
              </div>
            )}
            {workout.distance_km !== null && workout.distance_km !== undefined && (
              <div className="p-3 rounded-xl bg-accent/50 border border-border/60">
                <div className="text-xs text-muted-foreground">Distance</div>
                <div className="text-lg font-bold text-foreground">{workout.distance_km} km</div>
              </div>
            )}
          </div>

          {/* New Badges Notification if any */}
          {newBadges && newBadges.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500 animate-bounce" />
                <div>
                  <div className="text-sm font-bold text-amber-500 dark:text-amber-400">
                    {newBadges.length} New Milestone {newBadges.length === 1 ? 'Badge' : 'Badges'} Earned!
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {newBadges.map((b) => b.name).join(', ')}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCelebrationOpen(true)}
                className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              >
                View
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleResetForAnother}
              className="flex-1 font-bold gap-2 min-h-[48px]"
            >
              <PlusCircle className="h-4 w-4" />
              Log Another Workout
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/leaderboard')}
              className="flex-1 font-bold gap-2 min-h-[48px]"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              View Leaderboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/80 shadow-2xl backdrop-blur-sm bg-card/90">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            Workout Logger
          </CardTitle>
          <CardDescription>
            Choose your workout category, input your performance numbers, and earn live leaderboard points.
          </CardDescription>

          {/* Segmented Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => handleTypeChange('strength')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px]',
                workoutType === 'strength'
                  ? 'bg-card text-foreground shadow-md font-extrabold border border-border/80 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <Dumbbell className="h-4 w-4" />
              Strength
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('bodyweight')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px]',
                workoutType === 'bodyweight'
                  ? 'bg-card text-foreground shadow-md font-extrabold border border-border/80 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <Activity className="h-4 w-4" />
              Bodyweight
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('cardio')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px]',
                workoutType === 'cardio'
                  ? 'bg-card text-foreground shadow-md font-extrabold border border-border/80 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              )}
            >
              <Flame className="h-4 w-4" />
              Cardio
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Server Error Alert */}
            {serverError && (
              <div
                role="alert"
                className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Cannot log workout: </span>
                  <span className="font-medium">{serverError}</span>
                </div>
              </div>
            )}

            {/* Exercise Name */}
            <div className="space-y-1.5">
              <Label htmlFor="exercise">Exercise Name</Label>
              <Input
                id="exercise"
                type="text"
                placeholder={
                  workoutType === 'strength'
                    ? 'e.g., Bench Press, Squat, Barbell Row'
                    : workoutType === 'bodyweight'
                    ? 'e.g., Pull-ups, Push-ups, Dips'
                    : 'e.g., Running, Cycling, Rowing'
                }
                aria-invalid={!!errors.exercise}
                aria-describedby={errors.exercise ? 'exercise-error' : undefined}
                {...register('exercise')}
              />
              {errors.exercise && (
                <p id="exercise-error" className="text-xs font-semibold text-destructive">
                  {errors.exercise.message as string}
                </p>
              )}

              {/* Suggestions Chips */}
              <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Suggestions:</span>
                {SUGGESTIONS[workoutType].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue('exercise', s, { shouldValidate: true })}
                    className="text-xs px-2.5 py-1 rounded-md bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border border-border/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* STRENGTH FIELDS */}
            {workoutType === 'strength' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sets */}
                <div className="space-y-1.5">
                  <Label htmlFor="sets">Sets (1-50)</Label>
                  <Input
                    id="sets"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="50"
                    placeholder="4"
                    aria-invalid={!!errors.sets}
                    {...register('sets')}
                  />
                  {errors.sets && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.sets.message as string}
                    </p>
                  )}
                </div>

                {/* Reps */}
                <div className="space-y-1.5">
                  <Label htmlFor="reps">Reps per set (1-100)</Label>
                  <Input
                    id="reps"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    placeholder="8"
                    aria-invalid={!!errors.reps}
                    {...register('reps')}
                  />
                  {errors.reps && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.reps.message as string}
                    </p>
                  )}
                </div>

                {/* Weight */}
                <div className="space-y-1.5">
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    min="0"
                    max="600"
                    placeholder="60"
                    aria-invalid={!!errors.weight_kg}
                    {...register('weight_kg')}
                  />
                  {errors.weight_kg && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.weight_kg.message as string}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* BODYWEIGHT FIELDS */}
            {workoutType === 'bodyweight' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sets */}
                <div className="space-y-1.5">
                  <Label htmlFor="sets">Sets (1-50)</Label>
                  <Input
                    id="sets"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="50"
                    placeholder="3"
                    aria-invalid={!!errors.sets}
                    {...register('sets')}
                  />
                  {errors.sets && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.sets.message as string}
                    </p>
                  )}
                </div>

                {/* Reps */}
                <div className="space-y-1.5">
                  <Label htmlFor="reps">Reps per set (1-500)</Label>
                  <Input
                    id="reps"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="500"
                    placeholder="20"
                    aria-invalid={!!errors.reps}
                    {...register('reps')}
                  />
                  {errors.reps && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.reps.message as string}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CARDIO FIELDS */}
            {workoutType === 'cardio' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div className="space-y-1.5">
                  <Label htmlFor="duration_min">Duration (minutes)</Label>
                  <Input
                    id="duration_min"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max="600"
                    placeholder="30"
                    aria-invalid={!!errors.duration_min}
                    {...register('duration_min')}
                  />
                  {errors.duration_min && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.duration_min.message as string}
                    </p>
                  )}
                </div>

                {/* Distance */}
                <div className="space-y-1.5">
                  <Label htmlFor="distance_km">Distance (km, optional)</Label>
                  <Input
                    id="distance_km"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    min="0"
                    max="200"
                    placeholder="5"
                    aria-invalid={!!errors.distance_km}
                    {...register('distance_km')}
                  />
                  {errors.distance_km && (
                    <p className="text-xs font-semibold text-destructive">
                      {errors.distance_km.message as string}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* LIVE POINTS PREVIEW */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Zap className="h-5 w-5 fill-primary text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Live Score Preview
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {estimatedPts}{' '}
                    <span className="text-sm font-bold text-primary">pts</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic sm:text-right max-w-xs">
                Estimated points. Final points are calculated by the server.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full font-bold text-base min-h-[48px] shadow-lg shadow-primary/25"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Recording Workout...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Log Workout & Earn Points
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* CELEBRATORY BADGES DIALOG */}
      <Dialog open={isCelebrationOpen} onOpenChange={setIsCelebrationOpen}>
        <DialogContent className="max-w-md text-center p-6 border-amber-500/30">
          <DialogHeader className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 animate-bounce">
              <Sparkles className="h-9 w-9" />
            </div>
            <DialogTitle className="text-2xl font-black text-foreground">
              Milestone Unlocked! 🎉
            </DialogTitle>
            <DialogDescription className="text-sm">
              Your dedication paid off. You earned {celebrationBadges.length}{' '}
              {celebrationBadges.length === 1 ? 'new badge' : 'new badges'}:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4">
            {celebrationBadges.map((badge) => (
              <div
                key={badge.code}
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-4 text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0 shadow-md">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground text-base leading-tight">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full font-bold"
              onClick={() => setIsCelebrationOpen(false)}
            >
              Awesome, keep going!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
