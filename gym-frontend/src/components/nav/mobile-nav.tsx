'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dumbbell,
  LayoutDashboard,
  Plus,
  Trophy,
  MessageSquare,
  Menu,
  Users,
  Award,
  TrendingUp,
  LogOut,
  LogIn,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from './theme-toggle';

export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <>
      {/* Top Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md px-4 h-14 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/leaderboard'} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Gym<span className="text-primary">Community</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Avatar className="h-8 w-8 border border-primary/30">
              <AvatarFallback name={user.username} className="text-xs" />
            </Avatar>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs font-bold">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Bottom Mobile Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/80 bg-card/95 backdrop-blur-lg px-2 flex items-center justify-around"
      >
        {/* 1. Home */}
        <Link
          href={user ? '/dashboard' : '/login'}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors',
            pathname === '/dashboard' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] mt-1">Home</span>
        </Link>

        {/* 2. Leaderboard */}
        <Link
          href="/leaderboard"
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors',
            pathname.startsWith('/leaderboard') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-[10px] mt-1">Ranks</span>
        </Link>

        {/* 3. Prominent Central LOG Action */}
        <div className="flex-1 flex justify-center items-center">
          <Link
            href="/log"
            aria-label="Log Workout"
            className={cn(
              'h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-orange-500/30 flex items-center justify-center -translate-y-3 transition-transform active:scale-95 border-2 border-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              pathname === '/log' && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </Link>
        </div>

        {/* 4. Feed */}
        <Link
          href={user ? '/feed' : '/login'}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors',
            pathname.startsWith('/feed') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] mt-1">Feed</span>
        </Link>

        {/* 5. More */}
        <button
          onClick={() => setMoreMenuOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors',
            moreMenuOpen ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Open more navigation options"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-1">More</span>
        </button>
      </nav>

      {/* More Options Modal / Drawer */}
      {moreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMoreMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full bg-card border-t border-border rounded-t-2xl p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-primary/30">
                    <AvatarFallback name={user.username} />
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">{user.username}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">Guest User</span>
                </div>
              )}
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/groups"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent text-foreground font-semibold min-h-[44px]"
              >
                <Users className="h-5 w-5 text-primary" />
                Fitness Groups
              </Link>
              <Link
                href="/badges"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent text-foreground font-semibold min-h-[44px]"
              >
                <Award className="h-5 w-5 text-primary" />
                Badges & Achievements
              </Link>
              <Link
                href="/progress"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent text-foreground font-semibold min-h-[44px]"
              >
                <TrendingUp className="h-5 w-5 text-primary" />
                Progress & Charts
              </Link>
            </div>

            <div className="pt-2 border-t border-border">
              {user ? (
                <Button
                  variant="destructive"
                  className="w-full gap-2 font-bold min-h-[44px]"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              ) : (
                <Link href="/login" onClick={() => setMoreMenuOpen(false)}>
                  <Button className="w-full gap-2 font-bold min-h-[44px]">
                    <LogIn className="h-4 w-4" />
                    Sign In to GymCommunity
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
