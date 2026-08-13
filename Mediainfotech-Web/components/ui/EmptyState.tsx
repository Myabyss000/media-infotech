import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  className?: string;
}

/**
 * Empty state display for card grids / non-table contexts.
 * For empty rows inside DataTable, use <EmptyRow /> instead.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No records found.',
  className,
}) => {
  return (
    <div
      className={cn(
        'col-span-full p-8 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800 text-xs',
        className
      )}
    >
      {message}
    </div>
  );
};
