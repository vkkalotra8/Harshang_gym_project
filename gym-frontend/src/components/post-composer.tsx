/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X, Send, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function PostComposer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('body', body.trim());
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      // Simulate progress indicator for visual feedback
      setUploadProgress(40);
      const res = await apiRequest<{ post: Post }>('/api/posts', {
        method: 'POST',
        body: formData,
      });
      setUploadProgress(100);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post shared to the community feed!');
      setBody('');
      handleRemoveImage();
      setErrorMessage(null);
      setUploadProgress(0);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to publish post');
      setUploadProgress(0);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Only JPEG, PNG, and WebP images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Image is too large. Maximum size is 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    mutation.mutate();
  };

  const charCount = body.length;
  const isOverLimit = charCount > 1000;

  return (
    <Card className="border-border/80 shadow-lg bg-card/90 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3 items-start">
            <Avatar className="h-10 w-10 border border-primary/30 shrink-0 mt-0.5">
              <AvatarFallback name={user?.username} />
            </Avatar>

            <div className="flex-1 space-y-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your workout PR, session recap, or motivation..."
                rows={3}
                maxLength={1000}
                className="w-full bg-transparent resize-none border-0 p-0 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed"
                aria-label="Write a community post"
              />

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted/40 max-h-72 w-fit">
                  <img
                    src={imagePreview}
                    alt="Upload preview"
                    className="object-cover max-h-72 w-auto rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors shadow-md"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {mutation.isPending && uploadProgress > 0 && (
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                id="feed-image-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={mutation.isPending}
                className="text-muted-foreground hover:text-foreground gap-2 h-9 px-3 rounded-lg"
              >
                <ImagePlus className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold hidden xs:inline">Photo</span>
              </Button>

              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                JPEG, PNG, WebP (Max 5MB)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-mono font-medium ${
                  isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'
                }`}
              >
                {charCount}/1000
              </span>

              <Button
                type="submit"
                disabled={!body.trim() || isOverLimit || mutation.isPending}
                size="sm"
                className="gap-2 font-bold px-4 h-9 shadow-md shadow-primary/20"
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Posting...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Post
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
