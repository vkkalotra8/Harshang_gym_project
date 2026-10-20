import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'gold' | 'silver' | 'bronze';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variant === 'default' &&
          'border-transparent bg-primary text-primary-foreground shadow',
        variant === 'secondary' &&
          'border-transparent bg-secondary text-secondary-foreground',
        variant === 'destructive' &&
          'border-transparent bg-destructive text-destructive-foreground shadow',
        variant === 'outline' && 'text-foreground border-border',
        variant === 'gold' &&
          'border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400 font-bold',
        variant === 'silver' &&
          'border-slate-400/30 bg-slate-400/10 text-slate-400 dark:text-slate-300 font-bold',
        variant === 'bronze' &&
          'border-amber-700/30 bg-amber-700/10 text-amber-700 dark:text-amber-500 font-bold',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
