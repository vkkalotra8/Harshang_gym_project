'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Badge as BadgeType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  Zap,
  Flame,
  Target,
  Trophy,
  Star,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────── Badge definitions (mirror backend BADGE_DEFINITIONS) ─────────── */
const ALL_BADGES: {
  code: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  gradient: string;
  requirement: string;
}[] = [
  {
    code: 'FIRST_WORKOUT',
    name: 'First Step',
    description: 'First workout ever logged',
    icon: Zap,
    color: 'text-yellow-400',
    glow: 'shadow-yellow-500/40',
    gradient: 'from-yellow-500/20 to-amber-600/10',
    requirement: 'Log your very first workout',
  },
  {
    code: 'STREAK_7',
    name: 'Week Warrior',
    description: '7-day workout streak',
    icon: Flame,
    color: 'text-orange-400',
    glow: 'shadow-orange-500/40',
    gradient: 'from-orange-500/20 to-red-600/10',
    requirement: 'Work out 7 consecutive days',
  },
  {
    code: 'STREAK_30',
    name: 'Iron Consistency',
    description: '30-day workout streak',
    icon: Target,
    color: 'text-red-400',
    glow: 'shadow-red-500/40',
    gradient: 'from-red-500/20 to-rose-600/10',
    requirement: 'Work out 30 consecutive days',
  },
  {
    code: 'WORKOUTS_100',
    name: 'Century Club',
    description: '100 workouts logged in total',
    icon: Trophy,
    color: 'text-emerald-400',
    glow: 'shadow-emerald-500/40',
    gradient: 'from-emerald-500/20 to-green-600/10',
    requirement: 'Log 100 total workouts',
  },
  {
    code: 'POINTS_1000',
    name: 'Point Master',
    description: '1,000 lifetime points earned',
    icon: Star,
    color: 'text-purple-400',
    glow: 'shadow-purple-500/40',
    gradient: 'from-purple-500/20 to-violet-600/10',
    requirement: 'Earn 1,000 lifetime points',
  },
];

/* ─────────── API Types ─────────── */
interface EarnedBadgeItem {
  code?: string;
  badge_code?: string;
  name?: string;
  description?: string;
  awarded_at?: string;
}

interface BadgesApiResponse {
  badges?: EarnedBadgeItem[];
  earned?: EarnedBadgeItem[];
  definitions?: BadgeType[];
}

/* ─────────── Badge Card ─────────── */
function BadgeCard({
  badge,
  earned,
  awardedAt,
}: {
  badge: (typeof ALL_BADGES)[number];
  earned: boolean;
  awardedAt?: string;
}) {
  const Icon = badge.icon;

  return (
    <div
      className={cn(
        'relative group rounded-2xl border overflow-hidden transition-all duration-500',
        earned
          ? [
              'border-border/80 bg-gradient-to-br',
              badge.gradient,
              'hover:scale-[1.02] hover:shadow-xl',
              badge.glow,
            ]
          : 'border-border/40 bg-card/40 opacity-60 grayscale'
      )}
    >
      {earned && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="p-6 flex flex-col items-center text-center gap-4">
        <div
          className={cn(
            'relative h-20 w-20 rounded-2xl flex items-center justify-center',
            earned
              ? ['bg-card/80 border border-white/10 shadow-lg', badge.glow]
              : 'bg-muted/50 border border-border/30'
          )}
        >
          {earned ? (
            <>
              <Icon className={cn('h-9 w-9 drop-shadow', badge.color)} />
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </>
          ) : (
            <>
              <Icon className="h-9 w-9 text-muted-foreground/40" />
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center">
                <Lock className="h-3 w-3 text-muted-foreground/60" />
              </div>
            </>
          )}
        </div>

        <div className="space-y-1">
          <h3
            className={cn(
              'text-base font-bold tracking-tight',
              earned ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {badge.name}
          </h3>
          <p
            className={cn(
              'text-xs leading-relaxed',
              earned ? 'text-muted-foreground' : 'text-muted-foreground/60'
            )}
          >
            {earned ? badge.description : badge.requirement}
          </p>
        </div>

        {earned && awardedAt ? (
          <div className="px-3 py-1 rounded-full bg-card/60 border border-white/10 text-xs text-muted-foreground">
            Earned{' '}
            {new Date(awardedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        ) : !earned ? (
          <div className="px-3 py-1 rounded-full bg-muted/50 border border-border/30 text-xs text-muted-foreground/50">
            Locked
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────── Loading Skeleton ─────────── */
function BadgesLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-6 flex flex-col items-center gap-4"
        >
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-3/4 mx-auto rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-2/3 mx-auto rounded" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─────────── Page ─────────── */
export default function BadgesPage() {
  const { data, isLoading, isError } = useQuery<BadgesApiResponse>({
    queryKey: ['badges', 'me'],
    queryFn: () => apiRequest<BadgesApiResponse>('/api/badges/me'),
    staleTime: 30_000,
  });

  const earnedList = data?.earned ?? data?.badges ?? [];
  const earnedCodes = new Set(
    earnedList.map((b) => b.code || b.badge_code).filter((c): c is string => Boolean(c))
  );
  const earnedCount = earnedCodes.size;
  const totalCount = ALL_BADGES.length;
  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Badges &amp; Achievements
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Unlock milestones for workout consistency, streaks, and lifetime points.
            </p>
          </div>
        </div>

        {!isLoading && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border/60 shadow-sm shrink-0">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground leading-none">Earned</p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {earnedCount}{' '}
                <span className="text-sm font-medium text-muted-foreground">/ {totalCount}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isLoading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Overall Progress</span>
            <span className="font-bold text-foreground">{progressPct}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* All-badges banner */}
      {!isLoading && earnedCount === totalCount && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-6 py-4 flex items-center gap-3">
          <Star className="h-6 w-6 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-foreground">All badges unlocked! 🎉</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ve mastered every milestone. Incredible work!
            </p>
          </div>
        </div>
      )}

      {/* Badge grid */}
      {isLoading ? (
        <BadgesLoadingSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load badges. Please try again.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {ALL_BADGES.map((badge) => {
            const earnedEntry = earnedList.find(
              (e) => (e.code || e.badge_code) === badge.code
            );
            return (
              <BadgeCard
                key={badge.code}
                badge={badge}
                earned={earnedCodes.has(badge.code)}
                awardedAt={earnedEntry?.awarded_at}
              />
            );
          })}
        </div>
      )}

      {/* How to earn */}
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            How to Earn Badges
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_BADGES.map((badge) => {
              const Icon = badge.icon;
              const isEarned = earnedCodes.has(badge.code);
              return (
                <div
                  key={badge.code}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                    isEarned
                      ? 'border-border/60 bg-muted/30'
                      : 'border-border/40 bg-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                      isEarned ? 'bg-card/80' : 'bg-muted/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isEarned ? badge.color : 'text-muted-foreground/40'
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        isEarned ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {badge.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.requirement}
                    </p>
                  </div>
                  {isEarned && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
