'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DesktopNav } from '@/components/nav/desktop-nav';
import { MobileNav } from '@/components/nav/mobile-nav';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPage = pathname === '/leaderboard' || pathname.startsWith('/leaderboard');

  useEffect(() => {
    if (!loading && !user && !isPublicPage) {
      router.replace('/login');
    }
  }, [user, loading, router, isPublicPage]);

  // Auth Loading State: Show skeleton layout, never a flash of protected content
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Skeleton Top Nav */}
        <header className="h-16 border-b border-border/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-36 rounded-md" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>

        {/* Skeleton Body Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>

          <Skeleton className="h-72 rounded-xl" />
        </main>
      </div>
    );
  }

  // If not logged in and not on a public page, prevent flash
  if (!user && !isPublicPage) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <DesktopNav />
      <MobileNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 animate-in fade-in duration-200">
        {children}
      </main>
    </div>
  );
}
