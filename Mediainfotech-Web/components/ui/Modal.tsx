'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'max-w-md',
  children,
  className,
}) => {
  const isVisible = open !== undefined ? open : Boolean(isOpen);
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
      <div
        className={cn(
          'bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 w-full shadow-2xl max-h-[94vh] flex flex-col transition-all duration-200 animate-in fade-in zoom-in-95',
          maxWidth,
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-800/90 pb-4 mb-4 shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2.5">
              {icon && <span>{icon}</span>}
              <span>{title}</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center"
              title="Close Window"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ModalFooterProps {
  onClose?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  disabled?: boolean;
  variant?: 'blue' | 'emerald';
  children?: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onClose,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  submitting = false,
  disabled = false,
  variant = 'blue',
  children,
}) => {
  return (
    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800/80 mt-6 shrink-0">
      {children ? (
        children
      ) : (
        <>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={disabled || submitting}
            className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition flex items-center space-x-2 shadow-lg ${
              variant === 'emerald'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
            } disabled:opacity-50`}
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{submitLabel}</span>
          </button>
        </>
      )}
    </div>
  );
};
