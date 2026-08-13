import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Form field wrapper with consistent label styling.
 * Wraps any input/select/textarea with the standardized uppercase label.
 */
export const FormField: React.FC<FormFieldProps> = ({ label, children, className }) => {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
        {label}
      </label>
      {children}
    </div>
  );
};

/** Standard input class string for consistent styling across all form inputs. */
export const inputClassName =
  'w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white';

/** Standard textarea class string. */
export const textareaClassName =
  'w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white resize-none';
