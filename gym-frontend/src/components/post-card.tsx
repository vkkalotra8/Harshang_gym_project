/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  MessageCircle,
  Trash2,
  Send,
  Calendar,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { apiRequest, getFullImageUrl } from '@/lib/api';
import { Post, Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
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

// Helper for relative time display
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Local optimistic like state
  const [isLiked, setIsLiked] = useState(post.liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes);

  const imageUrl = getFullImageUrl(post.image_url);
  const isAuthor = user ? post.user_id === user.id : false;

  // 1. Optimistic Like Toggle Mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ liked: boolean }>(`/api/posts/${post.id}/like`, {
        method: 'POST',
      });
    },
    onMutate: async () => {
      // Optimistic update
      const prevLiked = isLiked;
      const prevCount = likesCount;

      const nextLiked = !prevLiked;
      const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

      setIsLiked(nextLiked);
      setLikesCount(nextCount);

      return { prevLiked, prevCount };
    },
    onError: (err, variables, context) => {
      if (context) {
        setIsLiked(context.prevLiked);
        setLikesCount(context.prevCount);
      }
      toast.error('Failed to update like');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // 2. Fetch comments when thread is opened
  const {
    data: commentsData,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useQuery<{ comments: Comment[] }>({
    queryKey: ['post-comments', post.id],
    queryFn: () => apiRequest<{ comments: Comment[] }>(`/api/posts/${post.id}/comments`),
    enabled: commentsOpen,
  });

  // 3. Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest<{ comment: Comment }>(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      });
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Comment added!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to post comment');
    },
  });

  // 4. Delete Post Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/posts/${post.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post deleted successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete post');
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  const comments = commentsData?.comments || [];

  return (
    <>
      <Card className="border-border/80 shadow-md bg-card/90 overflow-hidden transition-all hover:border-border">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Post Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-primary/30">
                <AvatarFallback name={post.username} />
              </Avatar>
              <div>
                <span className="font-extrabold text-foreground text-sm block">
                  {post.username}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
            </div>

            {/* Author Delete Action */}
            {isAuthor && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title="Delete post"
                aria-label="Delete your post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Post Body */}
          <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {post.body}
          </p>

          {/* Post Image (Lazy Loaded) */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border/60 bg-muted/30 max-h-[500px] flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Post attachment"
                loading="lazy"
                className="w-full h-auto max-h-[500px] object-cover rounded-xl"
              />
            </div>
          )}

          {/* Post Actions Bar */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/60">
            {/* Like Toggle */}
            <button
              type="button"
              onClick={() => likeMutation.mutate()}
              className={cn(
                'inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 min-h-[36px]',
                isLiked
                  ? 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
            >
              <Heart
                className={cn(
                  'h-4 w-4 transition-transform',
                  isLiked && 'fill-rose-500 text-rose-500 scale-110'
                )}
              />
              <span>{likesCount}</span>
            </button>

            {/* Comment Thread Button */}
            <button
              type="button"
              onClick={() => setCommentsOpen(!commentsOpen)}
              className={cn(
                'inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-h-[36px]',
                commentsOpen && 'text-primary bg-primary/10'
              )}
              aria-label="Comments"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments} Comments</span>
            </button>
          </div>

          {/* Expanded Comments Thread */}
          {commentsOpen && (
            <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={500}
                  className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="font-bold px-3 h-10 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>

              {/* Comments List */}
              {commentsLoading ? (
                <div className="space-y-2 py-2">
                  <div className="h-10 bg-muted/60 rounded-lg animate-pulse" />
                  <div className="h-10 bg-muted/60 rounded-lg animate-pulse" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No comments yet. Start the conversation!
                </p>
              ) : (
                <div className="space-y-2 pt-1 max-h-64 overflow-y-auto">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-2.5 rounded-lg bg-accent/40 border border-border/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          {comment.username}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Post?
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Are you sure you want to delete this post? This action cannot be undone and any uploaded photo will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="gap-2 font-bold"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
