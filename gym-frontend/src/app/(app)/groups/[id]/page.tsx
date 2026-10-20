'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Trophy,
  UserCheck,
  UserPlus,
  RefreshCw,
  PlusCircle,
  Target,
  Dumbbell,
  Activity,
  Flame,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { GroupLeaderboardResponse, Group, LeaderboardPeriod, WorkoutType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
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

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = Number(params.id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [selectedType, setSelectedType] = useState<'all' | WorkoutType>('all');

  // 1. Fetch Groups list to obtain current group metadata & membership
  const { data: groupsData, isLoading: groupsLoading } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => apiRequest<{ groups: Group[] }>('/api/groups'),
    enabled: !!user,
  });

  const groupMeta = groupsData?.groups.find((g) => g.id === groupId);

  // 2. Fetch Group Leaderboard (Public)
  const typeQuery = selectedType !== 'all' ? `&type=${selectedType}` : '';
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    isRefetching,
    refetch,
  } = useQuery<GroupLeaderboardResponse>({
    queryKey: ['group-leaderboard', groupId, period, selectedType],
    queryFn: () =>
      apiRequest<GroupLeaderboardResponse>(
        `/api/groups/${groupId}/leaderboard?period=${period}${typeQuery}`
      ),
    enabled: !!groupId && !isNaN(groupId),
  });

  // 3. Optimistic Join/Leave Mutation
  const toggleMembershipMutation = useMutation({
    mutationFn: async ({ isMember }: { isMember: boolean }) => {
      const endpoint = isMember
        ? `/api/groups/${groupId}/leave`
        : `/api/groups/${groupId}/join`;
      await apiRequest(endpoint, { method: 'POST' });
    },
    onMutate: async ({ isMember }) => {
      await queryClient.cancelQueries({ queryKey: ['groups'] });
      const previous = queryClient.getQueryData<{ groups: Group[] }>(['groups']);

      if (previous) {
        queryClient.setQueryData<{ groups: Group[] }>(['groups'], {
          groups: previous.groups.map((g) => {
            if (g.id === groupId) {
              const nextIsMember = !isMember;
              return {
                ...g,
                is_member: nextIsMember,
                member_count: nextIsMember
                  ? g.member_count + 1
                  : Math.max(0, g.member_count - 1),
              };
            }
            return g;
          }),
        });
      }

      return { previous };
    },
    onError: (err: any, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['groups'], context.previous);
      }
      toast.error(err.message || 'Membership action failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-leaderboard', groupId] });
    },
  });

  const groupName = leaderboardData?.group.name || groupMeta?.name || `Group #${groupId}`;
  const entries = leaderboardData?.leaderboard || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/groups">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to All Groups
        </Button>
      </Link>

      {/* Group Header Banner */}
      <Card className="border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl">
        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-md">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {groupName}
                  </h1>
                  {groupMeta?.is_member && (
                    <Badge variant="default" className="text-xs font-bold py-0.5 px-2">
                      Member
                    </Badge>
                  )}
                </div>
                {groupMeta?.goal && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mt-1">
                    <Target className="h-3.5 w-3.5" />
                    <span>Focus: {groupMeta.goal}</span>
                  </div>
                )}
              </div>
            </div>

            {groupMeta?.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {groupMeta.description}
              </p>
            )}

            {groupMeta && (
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground pt-1">
                <Users className="h-4 w-4 text-primary" />
                <span>
                  {groupMeta.member_count} {groupMeta.member_count === 1 ? 'member' : 'members'} enrolled
                </span>
              </div>
            )}
          </div>

          {/* Join / Leave Button */}
          {user && groupMeta && (
            <div className="self-start md:self-center">
              <Button
                variant={groupMeta.is_member ? 'outline' : 'default'}
                size="lg"
                disabled={toggleMembershipMutation.isPending}
                onClick={() =>
                  toggleMembershipMutation.mutate({ isMember: groupMeta.is_member })
                }
                className={cn(
                  'font-bold h-12 px-6 gap-2 text-sm shadow-md',
                  groupMeta.is_member
                    ? 'border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                    : 'shadow-primary/20'
                )}
              >
                {groupMeta.is_member ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Leave Group
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Join Group
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Leaderboard Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Group Member Standings
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Scores represent workout points accumulated by current group members.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 font-bold h-9 px-3 self-start sm:self-auto"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-primary', isRefetching && 'animate-spin')} />
            <span className="text-xs">Refresh</span>
          </Button>
        </div>

        {/* Period Tabs & Discipline Filter */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl max-w-md">
            {PERIODS.map((p) => {
              const isSelected = period === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {FILTER_TYPES.map((f) => {
              const isSelected = selectedType === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedType(f.key)}
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

        {/* Leaderboard Table Card */}
        <Card className="border-border/80 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4 text-right">Points</th>
                  <th className="py-3 px-4 text-right">Workouts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {/* Skeletons */}
                {leaderboardLoading &&
                  Array.from({ length: 5 }).map((_, idx) => (
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
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Trophy className="h-8 w-8 text-muted-foreground/60 mb-1" />
                        <h4 className="font-bold text-sm text-foreground">
                          No workouts logged in this group yet for {period}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Log a workout to be the first member on this group leaderboard!
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
                        {/* Rank */}
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

                        {/* Athlete */}
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

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-black text-foreground">
                            {entry.points.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground ml-1">pts</span>
                        </td>

                        {/* Entries */}
                        <td className="py-3.5 px-4 text-right text-muted-foreground font-semibold">
                          {entry.entries}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
