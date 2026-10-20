'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flame,
  PlusCircle,
  Trophy,
  Dumbbell,
  Trash2,
  Calendar,
  Activity,
  Award,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { Workout, StreakResponse, MyLeaderboardResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// Helper to get local date in YYYY-MM-DD
function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const todayStr = getTodayDateString();

  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

  // 1. Fetch Streak
  const { data: streakData, isLoading: streakLoading } = useQuery<StreakResponse>({
    queryKey: ['streak'],
    queryFn: () => apiRequest<StreakResponse>('/api/workouts/streak'),
  });

  // 2. Fetch Today's Workouts
  const { data: workoutsData, isLoading: workoutsLoading } = useQuery<{ workouts: Workout[] }>({
    queryKey: ['workouts', todayStr],
    queryFn: () => apiRequest<{ workouts: Workout[] }>(`/api/workouts?date=${todayStr}`),
  });

  // 3. Fetch Today's Rank
  const { data: dailyRankData, isLoading: dailyRankLoading } = useQuery<MyLeaderboardResponse>({
    queryKey: ['leaderboard-me', 'daily'],
    queryFn: () => apiRequest<MyLeaderboardResponse>('/api/leaderboard/me?period=daily'),
  });

  // 4. Fetch Weekly Rank
  const { data: weeklyRankData, isLoading: weeklyRankLoading } = useQuery<MyLeaderboardResponse>({
    queryKey: ['leaderboard-me', 'weekly'],
    queryFn: () => apiRequest<MyLeaderboardResponse>('/api/leaderboard/me?period=weekly'),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/workouts/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard-me'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      toast.success('Workout deleted. Leaderboard score updated immediately.');
      setWorkoutToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete workout');
    },
  });

  const todayWorkouts = workoutsData?.workouts || [];
  const todayPoints = todayWorkouts.reduce((sum, w) => sum + Number(w.points), 0);
  const roundedTodayPoints = Math.round((todayPoints + Number.EPSILON) * 100) / 100;
  const streak = streakData?.streak ?? 0;

  return (
    <div className="space-y-8">
      {/* 1. Header Greeting & Large CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Hello, <span className="text-primary">{user?.username}</span>
            </h1>
            {user?.goal && (
              <Badge variant="secondary" className="font-semibold text-xs py-1">
                {user.goal}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground/80" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>•</span>
            <span>Stay disciplined and conquer your milestones.</span>
          </p>
        </div>

        {/* Large Prominent Log Workout Button */}
        <Link href="/log" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto font-black text-base gap-2.5 h-14 px-8 rounded-xl shadow-xl shadow-primary/25 active:scale-95 transition-transform"
          >
            <PlusCircle className="h-5 w-5 stroke-[2.5]" />
            LOG WORKOUT
          </Button>
        </Link>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <Card className="border-border/80 relative overflow-hidden bg-gradient-to-br from-card via-card to-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Streak
            </CardTitle>
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center',
                streak > 0 ? 'bg-orange-500/15 text-orange-500' : 'bg-muted text-muted-foreground'
              )}
            >
              <Flame className={cn('h-5 w-5', streak > 0 && 'animate-pulse text-orange-500')} />
            </div>
          </CardHeader>
          <CardContent>
            {streakLoading ? (
              <Skeleton className="h-9 w-24 rounded-md" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-foreground">{streak}</span>
                <span className="text-sm font-bold text-muted-foreground">
                  {streak === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {streak > 0
                ? 'Consecutive days active'
                : 'Log a workout today to start your streak'}
            </p>
          </CardContent>
        </Card>

        {/* Today's Points Card */}
        <Card className="border-border/80 relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Points
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {workoutsLoading ? (
              <Skeleton className="h-9 w-28 rounded-md" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-primary">
                  {roundedTodayPoints}
                </span>
                <span className="text-sm font-bold text-muted-foreground">pts</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Across {todayWorkouts.length} {todayWorkouts.length === 1 ? 'session' : 'sessions'} today
            </p>
          </CardContent>
        </Card>

        {/* Daily Rank Card */}
        <Card className="border-border/80 relative overflow-hidden bg-gradient-to-br from-card via-card to-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rank Today
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {dailyRankLoading ? (
              <Skeleton className="h-9 w-20 rounded-md" />
            ) : dailyRankData?.rank ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-extrabold text-amber-500">#</span>
                <span className="text-3xl sm:text-4xl font-black text-foreground">
                  {dailyRankData.rank}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({dailyRankData.points} pts)
                </span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">Unranked</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {dailyRankData?.rank ? 'Daily leaderboard standing' : 'Log a workout to place on today\'s board'}
            </p>
          </CardContent>
        </Card>

        {/* Weekly Rank Card */}
        <Card className="border-border/80 relative overflow-hidden bg-gradient-to-br from-card via-card to-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rank This Week
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {weeklyRankLoading ? (
              <Skeleton className="h-9 w-20 rounded-md" />
            ) : weeklyRankData?.rank ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-extrabold text-emerald-500">#</span>
                <span className="text-3xl sm:text-4xl font-black text-foreground">
                  {weeklyRankData.rank}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({weeklyRankData.points} pts)
                </span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">Unranked</div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {weeklyRankData?.rank ? 'Weekly championship position' : 'Weekly leaderboard starts Monday'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Today's Workouts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Today&apos;s Workout Activity
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              All workouts completed and points recorded today ({todayStr}).
            </p>
          </div>

          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="gap-1.5 font-bold text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Leaderboard
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Loading state */}
        {workoutsLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {/* Empty state */}
        {!workoutsLoading && todayWorkouts.length === 0 && (
          <Card className="border-dashed border-2 border-border/80 bg-card/50 text-center p-8 sm:p-12">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4">
              <Dumbbell className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No workouts yet today</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              No workouts yet today. Log your first one to start earning points and climbing the leaderboard!
            </p>
            <div className="mt-6">
              <Link href="/log">
                <Button className="font-bold gap-2 px-6 shadow-md shadow-primary/20">
                  <PlusCircle className="h-4 w-4" />
                  Log Workout Now
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Workouts List */}
        {!workoutsLoading && todayWorkouts.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {todayWorkouts.map((w) => (
              <div
                key={w.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm gap-4"
              >
                {/* Left: exercise and metrics */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border',
                      w.type === 'strength' && 'bg-primary/10 border-primary/20 text-primary',
                      w.type === 'bodyweight' && 'bg-blue-500/10 border-blue-500/20 text-blue-500',
                      w.type === 'cardio' && 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                    )}
                  >
                    <Dumbbell className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-foreground leading-tight">
                        {w.exercise}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize font-semibold py-0">
                        {w.type}
                      </Badge>
                    </div>

                    {/* Exercise specifics */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {w.type === 'strength' && (
                        <span>
                          <strong className="text-foreground">{w.sets}</strong> sets ×{' '}
                          <strong className="text-foreground">{w.reps}</strong> reps @{' '}
                          <strong className="text-foreground">{w.weight_kg} kg</strong>
                        </span>
                      )}
                      {w.type === 'bodyweight' && (
                        <span>
                          <strong className="text-foreground">{w.sets}</strong> sets ×{' '}
                          <strong className="text-foreground">{w.reps}</strong> reps
                        </span>
                      )}
                      {w.type === 'cardio' && (
                        <span>
                          <strong className="text-foreground">{w.duration_min}</strong> min
                          {Number(w.distance_km) > 0 && (
                            <>
                              {' '}
                              • <strong className="text-foreground">{w.distance_km} km</strong>
                            </>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Points and Delete button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-primary">
                      +{w.points}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground ml-1">pts</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWorkoutToDelete(w)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                    title="Delete workout"
                    aria-label={`Delete ${w.exercise} workout`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!workoutToDelete} onOpenChange={(open) => !open && setWorkoutToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Workout?
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{workoutToDelete?.exercise}</strong> (+
              {workoutToDelete?.points} pts)?
              <br />
              <span className="text-destructive font-semibold mt-1 block">
                This will immediately reduce your points on all daily, weekly, and monthly leaderboards.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setWorkoutToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => workoutToDelete && deleteMutation.mutate(workoutToDelete.id)}
              className="gap-2 font-bold"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
