'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Title displayed in the modal header. */
  title?: string;
  /** Icon element rendered before the title. */
  icon?: React.ReactNode;
  /** Max width class. Defaults to 'max-w-md'. */
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  icon,
  maxWidth = 'max-w-md',
  children,
  className,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto',
          maxWidth,
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              {icon && <span>{icon}</span>}
              <span>{title}</span>
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

interface ModalFooterProps {
  onClose: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  disabled?: boolean;
  /** Submit button color variant. Defaults to 'blue'. */
  variant?: 'blue' | 'emerald';
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onClose,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  submitting = false,
  disabled = false,
  variant = 'blue',
}) => {
  const submitColors =
    variant === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-500'
      : 'bg-blue-600 hover:bg-blue-500';

  return (
    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={submitting || disabled}
        className={cn(
          'px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-50',
          submitColors
        )}
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
};
