import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'indigo';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variantStyles = {
      default: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500',
      destructive: 'bg-red-600/80 text-white hover:bg-red-600 shadow-lg shadow-red-600/20',
      outline: 'border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white',
      secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
      ghost: 'hover:bg-slate-800 text-slate-400 hover:text-white',
      link: 'text-blue-400 underline-offset-4 hover:underline',
      success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500',
      indigo: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25',
    };

    const sizeStyles = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-xl px-3 text-xs',
      lg: 'h-12 rounded-2xl px-6 text-sm',
      icon: 'h-9 w-9 p-0 rounded-xl',
    };

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
