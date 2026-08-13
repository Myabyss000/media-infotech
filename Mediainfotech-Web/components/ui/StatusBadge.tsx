import React from 'react';
import { cn } from '@/lib/utils';

type StatusVariant =
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'IN_STOCK'
  | 'ASSIGNED'
  | 'UNDER_MAINTENANCE'
  | 'RETIRED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'INACTIVE'
  | string;

const variantStyles: Record<string, string> = {
  APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  AVAILABLE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  IN_STOCK: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',

  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
  INACTIVE: 'bg-red-500/20 text-red-400 border-red-500/30',

  PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  OPEN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ASSIGNED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  UNDER_MAINTENANCE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',

  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',

  CLOSED: 'bg-slate-700/40 text-slate-400 border-slate-600',
  RETIRED: 'bg-slate-800 text-slate-400 border-slate-700',

  // Priority variants
  URGENT: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LOW: 'bg-slate-800 text-slate-400 border-slate-700',
};

interface StatusBadgeProps {
  status: StatusVariant;
  /** Optional label override. Defaults to the status string with underscores replaced by spaces. */
  label?: string;
  /** Whether to show a border. Defaults to true. */
  bordered?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  bordered = true,
  className,
}) => {
  const style = variantStyles[status] || 'bg-slate-800 text-slate-400 border-slate-700';
  const displayLabel = label ?? status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase',
        bordered && 'border',
        style,
        className
      )}
    >
      {displayLabel}
    </span>
  );
};
