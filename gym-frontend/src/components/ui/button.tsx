import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] px-4 py-2 select-none active:scale-[0.98]',
          variant === 'default' &&
            'bg-primary text-primary-foreground shadow hover:bg-primary-hover shadow-orange-500/10',
          variant === 'destructive' &&
            'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
          variant === 'outline' &&
            'border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
          variant === 'secondary' &&
            'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
          variant === 'ghost' &&
            'hover:bg-accent hover:text-accent-foreground',
          variant === 'link' &&
            'text-primary underline-offset-4 hover:underline min-h-0 p-0',
          size === 'sm' && 'h-9 px-3 rounded-md text-xs min-h-[36px]',
          size === 'lg' && 'h-12 px-8 rounded-xl text-base min-h-[48px]',
          size === 'icon' && 'h-11 w-11 p-0 rounded-lg',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
