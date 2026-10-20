import * as React from 'react';
import { cn } from '@/lib/utils';

export function Avatar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted/50 items-center justify-center font-bold text-sm text-foreground select-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarFallback({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <span className={cn('text-sm font-bold uppercase text-primary', className)}>
      {initial}
    </span>
  );
}
