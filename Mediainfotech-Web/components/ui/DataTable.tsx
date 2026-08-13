import React from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  headers: string[];
  /** Optional: alignment for the last column. Defaults to 'left'. */
  lastColumnAlign?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  lastColumnAlign = 'left',
  children,
  className,
}) => {
  return (
    <div className={cn('bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl', className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider font-semibold">
            {headers.map((header, idx) => (
              <th
                key={header}
                className={cn(
                  'p-4',
                  lastColumnAlign === 'right' && idx === headers.length - 1 && 'text-right'
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-xs">
          {children}
        </tbody>
      </table>
    </div>
  );
};

interface EmptyRowProps {
  colSpan: number;
  message?: string;
}

export const EmptyRow: React.FC<EmptyRowProps> = ({
  colSpan,
  message = 'No records found.',
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-slate-500">
        {message}
      </td>
    </tr>
  );
};
