'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  UserX,
  Trash2,
  Calendar,
  FileText,
  Users,
  CheckCircle2,
  Lock,
  Archive,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmployeeOffboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null;
  onSuccess?: () => void;
  managers?: any[];
}

export function EmployeeOffboardModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
  managers = [],
}: EmployeeOffboardModalProps) {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'ADMIN';

  // Mode: 'archive' (Legal Relieving & Compliance Archival) vs 'purge' (Hard Delete)
  const [mode, setMode] = useState<'archive' | 'purge'>('archive');

  // Confirmation Text State (GitHub style)
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // Form State for Archival
  const [exitReason, setExitReason] = useState('Resignation / Voluntary Exit');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignationDate, setResignationDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reassignReportsToId, setReassignReportsToId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTypedConfirmation('');
      setMode('archive');
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  const requiredConfirmationText = employee.employeeCode || employee.username || employee.email;
  const isConfirmationMatched =
    typedConfirmation.trim().toLowerCase() === requiredConfirmationText.toLowerCase() ||
    typedConfirmation.trim().toLowerCase() === `${employee.firstName} ${employee.lastName}`.trim().toLowerCase();

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmationMatched) return;

    try {
      setSubmitting(true);

      if (mode === 'archive') {
        // Legal Governance Relieving & Archival
        const res = await api.post(`/api/users/${employee.id}/offboard`, {
          exitReason,
          exitDate,
          resignationDate,
          handoverNotes,
          reassignReportsToId: reassignReportsToId || null,
        });

        alert(res.data.message || 'Employee offboarded and compliance records archived successfully.');
      } else {
        // Permanent Purge (Admin Only)
        const res = await api.delete(`/api/users/${employee.id}/purge`);
        alert(res.data.message || 'Employee records permanently purged.');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process offboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl my-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in duration-200 text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                mode === 'archive'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {mode === 'archive' ? <Archive size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'archive' ? 'Employee Relieving & Legal Archival' : 'Permanent Database Purge'}
              </h3>
              <p className="text-xs text-slate-400">
                Target: <span className="text-white font-bold">{employee.firstName} {employee.lastName}</span> ({requiredConfirmationText})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector (Governance Compliant vs Hard Purge) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('archive')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
              mode === 'archive'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Legal Relieving (Recommended)</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setMode('purge')}
              className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                mode === 'purge'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <Trash2 size={14} />
              <span>Permanent Purge</span>
            </button>
          )}
        </div>

        {/* Governance & Legal System Advisory Notice */}
        {mode === 'archive' ? (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck size={16} />
              <span>Statutory Compliance & Legal Governance Protection</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Under Labor Law, Income Tax Act (TDS Form 16), and EPFO regulations, companies are legally mandated to retain employee identity, PAN, attendance logs, and historical payslips for 7+ years.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                <span>Immediate login/token revocation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                <span>Identity & tax vault preserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                <span>Assigned vehicles returned to pool</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                <span>Past payslips remain printable</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <AlertTriangle size={16} />
              <span>Permanent Purge Warning (Data Erasure)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              This action will permanently erase all records for this employee (including historical payslips, leave balances, documents, and attendance records). This action <strong className="text-rose-300">CANNOT BE UNDONE</strong>.
            </p>
          </div>
        )}

        <form onSubmit={handleAction} className="space-y-4 text-xs">
          {mode === 'archive' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Reason for Relieving / Exit *</label>
                  <select
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    required
                  >
                    <option value="Resignation / Voluntary Exit">Resignation / Voluntary Exit</option>
                    <option value="Mutual Separation Agreement">Mutual Separation Agreement</option>
                    <option value="End of Employment Contract">End of Employment Contract</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Relocation / Career Transition">Relocation / Career Transition</option>
                    <option value="Termination / Redundancy">Termination / Redundancy</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Official Last Working Day *</label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    required
                  >
                  </input>
                </div>
              </div>

              {managers.length > 0 && (
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Reassign Direct Reports (Subordinates) To
                  </label>
                  <select
                    value={reassignReportsToId}
                    onChange={(e) => setReassignReportsToId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  >
                    <option value="">-- Do not reassign / Set to Root --</option>
                    {managers
                      .filter((m) => m.id !== employee.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.designation || m.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Handover, Asset & Clearance Remarks
                </label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  placeholder="e.g. Laptop & ID badge surrendered, NOC signed, 30 days notice served."
                />
              </div>
            </>
          )}

          {/* GitHub-Style Type-to-Confirm Challenge */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-slate-300 font-bold block text-xs">
              To verify and confirm this action, please type{' '}
              <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold select-all">
                {requiredConfirmationText}
              </span>{' '}
              below:
            </label>
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={`Type "${requiredConfirmationText}" to confirm`}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isConfirmationMatched || submitting}
              className={`font-bold transition ${
                mode === 'archive'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white disabled:bg-slate-800 disabled:text-slate-600'
                  : 'bg-rose-600 hover:bg-rose-500 text-white disabled:bg-slate-800 disabled:text-slate-600'
              }`}
            >
              {submitting
                ? 'Processing...'
                : mode === 'archive'
                ? 'Relieve & Archive Employee'
                : 'I understand, permanently purge record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
