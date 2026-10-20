'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dumbbell,
  LayoutDashboard,
  PlusCircle,
  Trophy,
  MessageSquare,
  Users,
  Award,
  TrendingUp,
  LogOut,
  LogIn,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from './theme-toggle';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/feed', label: 'Social Feed', icon: MessageSquare },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/badges', label: 'Badges', icon: Award },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
];

export function DesktopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Brand */}
        <Link href={user ? '/dashboard' : '/leaderboard'} className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-foreground">
            Gym<span className="text-primary">Community</span>
          </span>
        </Link>

        {/* Primary nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px]',
                  isActive
                    ? 'bg-accent text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                {link.label}
              </Link>
            );
          })}

          {/* Prominent Log Workout Button */}
          <Link href="/log" className="ml-2">
            <Button
              size="sm"
              className={cn(
                'font-bold gap-2 shadow-md shadow-primary/20',
                pathname === '/log'
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : ''
              )}
            >
              <PlusCircle className="h-4 w-4" />
              Log Workout
            </Button>
          </Link>
        </nav>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <Avatar className="h-9 w-9 border-2 border-primary/30">
                <AvatarFallback name={user.username} />
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-foreground leading-tight">
                  {user.username}
                </span>
                {user.goal && (
                  <span className="text-[10px] font-semibold text-primary/90 leading-tight">
                    {user.goal}
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg ml-1"
                title="Log Out"
                aria-label="Log out of account"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Link href="/login">
                <Button size="sm" variant="ghost" className="gap-1.5 font-bold">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-bold">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
