import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const variantConfig: Record<AlertVariant, { bg: string; icon: React.ReactNode }> = {
  error: {
    bg: 'bg-red-500/10 border-red-500/30 text-red-400',
    icon: <AlertCircle size={18} className="shrink-0 text-red-400" />,
  },
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    icon: <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />,
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    icon: <AlertCircle size={18} className="shrink-0 text-amber-400" />,
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    icon: <AlertCircle size={18} className="shrink-0 text-blue-400" />,
  },
};

interface AlertBannerProps {
  message: string | null | undefined;
  variant?: AlertVariant;
  className?: string;
}

/**
 * Dismissible-free alert banner. Renders nothing if message is null/undefined/empty.
 */
export const AlertBanner: React.FC<AlertBannerProps> = ({
  message,
  variant = 'error',
  className,
}) => {
  if (!message) return null;

  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border text-xs flex items-center space-x-3',
        config.bg,
        className
      )}
    >
      {config.icon}
      <span>{message}</span>
    </div>
  );
};
