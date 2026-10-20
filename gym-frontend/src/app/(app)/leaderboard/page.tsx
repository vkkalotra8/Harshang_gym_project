'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Medal,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Info,
  Dumbbell,
  Activity,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import {
  LeaderboardResponse,
  MyLeaderboardResponse,
  LeaderboardPeriod,
  WorkoutType,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const FILTER_TYPES: { key: 'all' | WorkoutType; label: string; icon: any }[] = [
  { key: 'all', label: 'All Disciplines', icon: Trophy },
  { key: 'strength', label: 'Strength', icon: Dumbbell },
  { key: 'bodyweight', label: 'Bodyweight', icon: Activity },
  { key: 'cardio', label: 'Cardio', icon: Flame },
];

function LeaderboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [scoringInfoOpen, setScoringInfoOpen] = useState(false);

  // URL query params
  const periodParam = (searchParams.get('period') as LeaderboardPeriod) || 'weekly';
  const typeParam = searchParams.get('type') || 'all';

  const validPeriod: LeaderboardPeriod = ['daily', 'weekly', 'monthly'].includes(periodParam)
    ? periodParam
    : 'weekly';
  const validType = ['strength', 'bodyweight', 'cardio'].includes(typeParam) ? typeParam : 'all';

  // Change period or type with URL update (shareable URL)
  const updateUrlParams = (newPeriod: LeaderboardPeriod, newType: string) => {
    const params = new URLSearchParams();
    params.set('period', newPeriod);
    if (newType !== 'all') {
      params.set('type', newType);
    }
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  };

  // 1. Fetch Global Leaderboard (Public, auto-refetch every 60s)
  const apiTypeQuery = validType !== 'all' ? `&type=${validType}` : '';
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    isRefetching,
    refetch,
  } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', validPeriod, validType],
    queryFn: () => apiRequest<LeaderboardResponse>(`/api/leaderboard?period=${validPeriod}${apiTypeQuery}`),
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
  });

  // 2. Fetch User Position (if logged in)
  const { data: myRankData, isLoading: myRankLoading } = useQuery<MyLeaderboardResponse>({
    queryKey: ['leaderboard-me', validPeriod, validType],
    queryFn: () => apiRequest<MyLeaderboardResponse>(`/api/leaderboard/me?period=${validPeriod}${apiTypeQuery}`),
    enabled: !!user,
  });

  const entries = leaderboardData?.leaderboard || [];
  const isUserInTop50 = user ? entries.some((e) => e.user_id === user.id) : false;

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-md shadow-amber-500/10">
              <Trophy className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Community <span className="text-primary">Leaderboard</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time rankings based on live workout points sum. Tied scores share the same rank.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 font-bold h-10 px-3.5"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={cn('h-4 w-4 text-primary', isRefetching && 'animate-spin')} />
            <span className="hidden xs:inline">Refresh</span>
          </Button>

          {/* Log Workout Button */}
          <Link href="/log">
            <Button size="sm" className="font-bold gap-2 h-10 px-4 shadow-md shadow-primary/20">
              <PlusCircle className="h-4 w-4" />
              Log Workout
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Period Tabs & Filter Chips */}
      <div className="space-y-3">
        {/* Period Segmented Control (Daily / Weekly / Monthly) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl max-w-md">
          {PERIODS.map((p) => {
            const isSelected = validPeriod === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => updateUrlParams(p.key, validType)}
                className={cn(
                  'py-2 px-3 rounded-lg text-sm font-bold transition-all min-h-[40px]',
                  isSelected
                    ? 'bg-card text-foreground shadow-sm font-extrabold border border-border/80 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Filter Chip Row (All / Strength / Bodyweight / Cardio) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {FILTER_TYPES.map((f) => {
            const isSelected = validType === f.key;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => updateUrlParams(validPeriod, f.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border min-h-[36px]',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-orange-500/20 font-bold'
                    : 'bg-card border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Collapsible "How scoring works" Panel */}
      <Card className="border-border/80 bg-card/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setScoringInfoOpen(!scoringInfoOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/40 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-primary shrink-0" />
            <div>
              <span className="text-sm font-bold text-foreground">
                How Leaderboard Scoring Works
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                (Formulas, worked examples & periods)
              </span>
            </div>
          </div>
          {scoringInfoOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {scoringInfoOpen && (
          <CardContent className="pt-0 pb-5 px-5 border-t border-border/60 text-sm space-y-4 animate-in fade-in duration-200">
            <p className="text-muted-foreground leading-relaxed">
              Every workout earns points the moment it is logged. Points are permanently written to the workout entry and are live-aggregated across each period.
              <strong className="text-foreground"> Weeks start on Monday</strong> (ISO definition), and monthly leaderboards reset on the 1st of each month.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-accent/40 border border-border/60 space-y-1">
                <span className="font-extrabold text-primary text-xs uppercase tracking-wider block">
                  Strength Formula
                </span>
                <p className="font-mono text-xs text-foreground font-semibold">
                  (sets × reps × weight_kg) / 50
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Example: Bench press 4x8 at 60 kg = <strong className="text-foreground">38.4 points</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-accent/40 border border-border/60 space-y-1">
                <span className="font-extrabold text-blue-500 text-xs uppercase tracking-wider block">
                  Bodyweight Formula
                </span>
                <p className="font-mono text-xs text-foreground font-semibold">
                  (sets × reps) / 20
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Example: Push-ups 3x20 = <strong className="text-foreground">3 points</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-accent/40 border border-border/60 space-y-1">
                <span className="font-extrabold text-orange-500 text-xs uppercase tracking-wider block">
                  Cardio Formula
                </span>
                <p className="font-mono text-xs text-foreground font-semibold">
                  duration_min × 1 + distance_km × 5
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Example: Running 30 min & 5 km = <strong className="text-foreground">55 points</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>
                Anti-cheat protections: Single workouts cannot exceed 1,000 points. Maximum 30 workouts allowed per day. Deleting your own workout drops your score immediately.
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Leaderboard Table Card */}
      <Card className="border-border/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Athlete</th>
                <th className="py-3 px-4 text-right">Points</th>
                <th className="py-3 px-4 text-right">Workouts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {/* Loading Skeletons */}
              {leaderboardLoading &&
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 text-center">
                      <Skeleton className="h-6 w-8 mx-auto rounded-md" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-32 rounded-md" />
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-5 w-16 ml-auto rounded-md" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-4 w-10 ml-auto rounded-md" />
                    </td>
                  </tr>
                ))}

              {/* Empty State */}
              {!leaderboardLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                        <Trophy className="h-7 w-7 text-muted-foreground/60" />
                      </div>
                      <h3 className="font-bold text-base text-foreground">
                        No workouts logged in this period yet
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Be the first athlete to log a workout and claim the #1 spot on this leaderboard!
                      </p>
                      <Link href="/log" className="pt-2">
                        <Button size="sm" className="font-bold gap-2">
                          <PlusCircle className="h-4 w-4" />
                          Log Workout
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!leaderboardLoading &&
                entries.map((entry) => {
                  const isCurrentUser = user ? entry.user_id === user.id : false;

                  return (
                    <tr
                      key={entry.user_id}
                      className={cn(
                        'transition-colors',
                        isCurrentUser
                          ? 'bg-primary/10 border-l-4 border-l-primary font-semibold'
                          : 'hover:bg-accent/40'
                      )}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {entry.rank === 1 && (
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 text-sm font-black shadow-sm">
                            🥇
                          </span>
                        )}
                        {entry.rank === 2 && (
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 text-sm font-black shadow-sm">
                            🥈
                          </span>
                        )}
                        {entry.rank === 3 && (
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-700/20 text-amber-600 dark:text-amber-500 border border-amber-700/40 text-sm font-black shadow-sm">
                            🥉
                          </span>
                        )}
                        {entry.rank > 3 && (
                          <span className="text-muted-foreground font-extrabold text-sm">
                            #{entry.rank}
                          </span>
                        )}
                      </td>

                      {/* Athlete Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className={cn('h-9 w-9', isCurrentUser && 'border-2 border-primary')}>
                            <AvatarFallback name={entry.username} />
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold', isCurrentUser ? 'text-primary' : 'text-foreground')}>
                              {entry.username}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4 font-bold">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Points Column */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-base font-black text-foreground">
                          {entry.points.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground ml-1">pts</span>
                      </td>

                      {/* Entries Column */}
                      <td className="py-3.5 px-4 text-right text-muted-foreground font-semibold">
                        {entry.entries}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* 5. Pinned "Your Position" Row (If authenticated and outside top 50) */}
        {user && !leaderboardLoading && !isUserInTop50 && (
          <div className="p-4 border-t-2 border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary shadow-sm">
                <AvatarFallback name={user.username} />
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-foreground">{user.username}</span>
                  <Badge variant="default" className="text-[10px] py-0 px-2 font-bold">
                    Your Position
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {myRankData?.rank
                    ? `Currently ranked #${myRankData.rank} in this period`
                    : 'Log a workout to qualify for this period'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 self-end sm:self-auto">
              <div className="text-right">
                <div className="text-xs text-muted-foreground font-semibold">Score</div>
                <div className="text-lg font-black text-primary">
                  {myRankData?.points ?? 0} <span className="text-xs font-bold text-muted-foreground">pts</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground font-semibold">Rank</div>
                <div className="text-lg font-black text-foreground">
                  {myRankData?.rank ? `#${myRankData.rank}` : '—'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground font-semibold">Entries</div>
                <div className="text-lg font-bold text-foreground">
                  {myRankData?.entries ?? 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-10 w-80 rounded-xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      }
    >
      <LeaderboardInner />
    </Suspense>
  );
}
