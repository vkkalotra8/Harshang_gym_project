'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, RefreshCw, Sparkles, Dumbbell } from 'lucide-react';

import { apiRequest } from '@/lib/api';
import { Post } from '@/lib/types';
import { PostComposer } from '@/components/post-composer';
import { PostCard } from '@/components/post-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function FeedPage() {
  const {
    data: postsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<{ posts: Post[] }>({
    queryKey: ['posts'],
    queryFn: () => apiRequest<{ posts: Post[] }>('/api/posts'),
  });

  const posts = postsData?.posts || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-md shadow-orange-500/10">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Community <span className="text-primary">Feed</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Share your milestones, cheer on gym peers, and stay inspired.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2 font-bold h-9 px-3"
          title="Refresh feed"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-primary', isRefetching && 'animate-spin')} />
          <span className="hidden xs:inline text-xs">Refresh</span>
        </Button>
      </div>

      {/* Post Composer */}
      <PostComposer />

      {/* Feed Stream */}
      <div className="space-y-4">
        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="p-5 space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && posts.length === 0 && (
          <Card className="border-dashed border-2 border-border/80 bg-card/50 text-center p-8 sm:p-12">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4">
              <Dumbbell className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nothing here yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Nothing here yet. Share your first workout, PR, or photo with the community using the composer above!
            </p>
          </Card>
        )}

        {/* Post Cards List */}
        {!isLoading &&
          posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}
