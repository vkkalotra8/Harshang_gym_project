'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  PlusCircle,
  Trophy,
  ArrowRight,
  UserCheck,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Target,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { Group } from '@/lib/types';
import { groupSchema, GroupFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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

export default function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 1. Fetch all groups
  const {
    data: groupsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => apiRequest<{ groups: Group[] }>('/api/groups'),
  });

  const groups = groupsData?.groups || [];

  // Form setup for creating group
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      goal: '',
      description: '',
    },
  });

  // 2. Create Group Mutation
  const createMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      return await apiRequest<{ group: Group }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(`Group "${res.group.name}" created! You joined automatically.`);
      setCreateDialogOpen(false);
      reset();
      setServerError(null);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to create group');
    },
  });

  // 3. Optimistic Join/Leave Mutations
  const toggleMembershipMutation = useMutation({
    mutationFn: async ({ groupId, isMember }: { groupId: number; isMember: boolean }) => {
      const endpoint = isMember
        ? `/api/groups/${groupId}/leave`
        : `/api/groups/${groupId}/join`;
      await apiRequest(endpoint, { method: 'POST' });
    },
    onMutate: async ({ groupId, isMember }) => {
      await queryClient.cancelQueries({ queryKey: ['groups'] });
      const previous = queryClient.getQueryData<{ groups: Group[] }>(['groups']);

      if (previous) {
        queryClient.setQueryData<{ groups: Group[] }>(['groups'], {
          groups: previous.groups.map((g) => {
            if (g.id === groupId) {
              const nextIsMember = !isMember;
              const nextCount = nextIsMember
                ? g.member_count + 1
                : Math.max(0, g.member_count - 1);
              return {
                ...g,
                is_member: nextIsMember,
                member_count: nextCount,
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
      toast.error(err.message || 'Membership update failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const onSubmitCreate = (data: GroupFormData) => {
    setServerError(null);
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-md shadow-orange-500/10">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Fitness <span className="text-primary">Groups</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Join communities focused on shared fitness goals and compete on squad leaderboards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-10 px-3.5 gap-2 font-bold"
            title="Refresh groups"
          >
            <RefreshCw className={cn('h-4 w-4 text-primary', isRefetching && 'animate-spin')} />
            <span className="hidden xs:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setServerError(null);
              reset();
              setCreateDialogOpen(true);
            }}
            className="h-10 px-4 gap-2 font-bold shadow-md shadow-primary/20"
          >
            <PlusCircle className="h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="p-6 space-y-4 animate-pulse">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && groups.length === 0 && (
        <Card className="border-dashed border-2 border-border/80 bg-card/50 text-center p-12">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4">
            <Users className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No fitness groups yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Create the first community group or run the database seeder to load the defaults!
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="mt-6 gap-2 font-bold"
          >
            <PlusCircle className="h-4 w-4" />
            Create First Group
          </Button>
        </Card>
      )}

      {/* Groups Cards List */}
      {!isLoading && groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className={cn(
                'border-border/80 bg-card/90 shadow-sm transition-all hover:border-primary/40 flex flex-col justify-between',
                group.is_member && 'border-primary/30 ring-1 ring-primary/20'
              )}
            >
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-1">
                    {group.name}
                  </CardTitle>
                  {group.is_member && (
                    <Badge variant="default" className="text-[10px] font-bold py-0.5 px-2">
                      Member
                    </Badge>
                  )}
                </div>

                {group.goal && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Target className="h-3.5 w-3.5" />
                    <span>{group.goal}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pb-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {group.description || 'No description provided for this group.'}
                </p>
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 bg-muted/20">
                {/* Member Count */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Join / Leave Toggle */}
                  <Button
                    variant={group.is_member ? 'outline' : 'default'}
                    size="sm"
                    disabled={toggleMembershipMutation.isPending}
                    onClick={() =>
                      toggleMembershipMutation.mutate({
                        groupId: group.id,
                        isMember: group.is_member,
                      })
                    }
                    className={cn(
                      'font-bold h-9 px-3 gap-1.5 text-xs',
                      group.is_member
                        ? 'border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30'
                        : 'shadow-sm shadow-primary/20'
                    )}
                  >
                    {group.is_member ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Leave
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Join
                      </>
                    )}
                  </Button>

                  {/* Leaderboard Detail Link */}
                  <Link href={`/groups/${group.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-2 text-xs font-bold text-muted-foreground hover:text-foreground gap-1"
                      title="View Group Leaderboard"
                    >
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE GROUP DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Create Fitness Group
            </DialogTitle>
            <DialogDescription className="text-sm">
              Form a new squad. You will be automatically added as the founding member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4" noValidate>
            {serverError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{serverError}</span>
              </div>
            )}

            {/* Group Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Runners Club"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <Label htmlFor="goal">Primary Objective / Focus</Label>
              <Input
                id="goal"
                placeholder="e.g., Marathon Prep, 100kg Bench, Calisthenics"
                aria-invalid={!!errors.goal}
                {...register('goal')}
              />
              {errors.goal && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.goal.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="Describe your group's rules, workout plans, and community vibe..."
                maxLength={1000}
                className="w-full rounded-lg border border-input bg-background/50 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting || createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="font-bold gap-2"
              >
                {createMutation.isPending ? 'Creating Group...' : 'Create & Join'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
