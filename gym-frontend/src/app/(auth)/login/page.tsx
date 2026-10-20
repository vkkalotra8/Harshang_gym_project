'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dumbbell, AlertCircle, ArrowRight, Trophy } from 'lucide-react';

import { loginSchema, LoginFormData } from '@/lib/schemas';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back to GymCommunity!');
      router.push('/dashboard');
    } catch (err: any) {
      if (err instanceof ApiError || err?.name === 'ApiError') {
        setServerError(err.message);
      } else {
        setServerError(err?.message || 'Unable to reach server. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-background via-background/95 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-orange-500/10">
            <Dumbbell className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Gym<span className="text-primary">Community</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Log workouts, climb leaderboards & challenge athletes.
          </p>
        </div>

        {/* Card */}
        <Card className="border-border/80 shadow-2xl backdrop-blur-sm bg-card/90">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your workout diary and rank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Server error */}
              {serverError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="font-medium">{serverError}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="athlete@gym.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs font-semibold text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                {errors.password && (
                  <p id="password-error" className="text-xs font-semibold text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-bold text-base mt-2 shadow-lg shadow-primary/20"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">
            <div>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Register now
              </Link>
            </div>
            <div className="text-xs">
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <Trophy className="h-3.5 w-3.5 text-primary" />
                View Public Leaderboard
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
