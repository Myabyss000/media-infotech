'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Calendar,
  Award,
  Sparkles,
  Users,
  Building,
  UserCheck,
  Search,
  CheckSquare,
  Square,
  CheckCircle2,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  ArrowLeft,
  CalendarCheck,
  HeartPulse,
  Clock,
  Baby,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaveQuotaAllocatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialUserId?: string;
}

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Sales & Marketing',
  'Product & Design',
  'Finance & Accounts',
  'Operations',
  'Customer Support',
  'General',
];

interface QuotaItem {
  type: string;
  label: string;
  code: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  days: string;
  enabled: boolean;
}

const DEFAULT_QUOTAS: QuotaItem[] = [
  {
    type: 'CASUAL',
    label: 'Casual Leave',
    code: 'CL',
    icon: CalendarCheck,
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    days: '12',
    enabled: true,
  },
  {
    type: 'SICK',
    label: 'Sick Leave',
    code: 'SL',
    icon: HeartPulse,
    iconBg: 'bg-rose-500/15 border-rose-500/30',
    iconColor: 'text-rose-400',
    days: '12',
    enabled: true,
  },
  {
    type: 'EARNED',
    label: 'Earned / Privilege',
    code: 'EL',
    icon: Award,
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    days: '15',
    enabled: true,
  },
  {
    type: 'COMPENSATORY',
    label: 'Compensatory Off',
    code: 'CO',
    icon: Clock,
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    iconColor: 'text-amber-400',
    days: '0',
    enabled: true,
  },
  {
    type: 'MATERNITY',
    label: 'Maternity Leave',
    code: 'ML',
    icon: Baby,
    iconBg: 'bg-pink-500/15 border-pink-500/30',
    iconColor: 'text-pink-400',
    days: '90',
    enabled: false,
  },
  {
    type: 'PATERNITY',
    label: 'Paternity Leave',
    code: 'PL',
    icon: ShieldCheck,
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    days: '15',
    enabled: false,
  },
];

export function LeaveQuotaAllocatorModal({
  isOpen,
  onClose,
  onSuccess,
  initialUserId,
}: LeaveQuotaAllocatorModalProps) {
  const [mode, setMode] = useState<'set_quota' | 'credit_days'>('set_quota');
  const [targetScope, setTargetScope] = useState<'ALL' | 'DEPARTMENT' | 'SPECIFIC'>(
    initialUserId ? 'SPECIFIC' : 'ALL'
  );

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialUserId ? [initialUserId] : []);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['Engineering']);
  const [userSearch, setUserSearch] = useState('');

  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Multi-Category Quota Matrix
  const [quotas, setQuotas] = useState<QuotaItem[]>(DEFAULT_QUOTAS);
  const [quotaNote, setQuotaNote] = useState('Annual Leave Policy Allocation');

  // Credit Leave state
  const [creditType, setCreditType] = useState('COMPENSATORY');
  const [creditDays, setCreditDays] = useState('1');
  const [creditReason, setCreditReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (initialUserId) {
        setTargetScope('SPECIFIC');
        setSelectedUserIds([initialUserId]);
      }
    }
  }, [isOpen, initialUserId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users?limit=300');
      const list = res.data.data || [];
      setUsers(list);
      if (initialUserId) {
        setSelectedUserIds([initialUserId]);
      } else if (list.length > 0 && selectedUserIds.length === 0) {
        setSelectedUserIds(list.map((u: any) => u.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute resolved target users
  const getResolvedEmployeesCount = (): number => {
    if (targetScope === 'ALL') return users.length;
    if (targetScope === 'DEPARTMENT') {
      return users.filter((u) => u.department && selectedDepts.includes(u.department)).length;
    }
    return selectedUserIds.length;
  };

  const getResolvedUserIds = (): string[] => {
    if (targetScope === 'ALL') return users.map((u) => u.id);
    if (targetScope === 'DEPARTMENT') {
      return users
        .filter((u) => u.department && selectedDepts.includes(u.department))
        .map((u) => u.id);
    }
    return selectedUserIds;
  };

  // Presets
  const applyPreset = (presetName: 'STANDARD' | 'EXECUTIVE' | 'INTERN') => {
    if (presetName === 'STANDARD') {
      setQuotas((prev) =>
        prev.map((q) => {
          if (q.type === 'CASUAL') return { ...q, days: '12', enabled: true };
          if (q.type === 'SICK') return { ...q, days: '12', enabled: true };
          if (q.type === 'EARNED') return { ...q, days: '15', enabled: true };
          if (q.type === 'COMPENSATORY') return { ...q, days: '0', enabled: true };
          return q;
        })
      );
      setQuotaNote('Standard Employee Policy Quota');
    } else if (presetName === 'EXECUTIVE') {
      setQuotas((prev) =>
        prev.map((q) => {
          if (q.type === 'CASUAL') return { ...q, days: '15', enabled: true };
          if (q.type === 'SICK') return { ...q, days: '15', enabled: true };
          if (q.type === 'EARNED') return { ...q, days: '20', enabled: true };
          if (q.type === 'COMPENSATORY') return { ...q, days: '2', enabled: true };
          return q;
        })
      );
      setQuotaNote('Executive / Management Quota Package');
    } else if (presetName === 'INTERN') {
      setQuotas((prev) =>
        prev.map((q) => {
          if (q.type === 'CASUAL') return { ...q, days: '6', enabled: true };
          if (q.type === 'SICK') return { ...q, days: '6', enabled: true };
          if (q.type === 'EARNED') return { ...q, days: '0', enabled: true };
          if (q.type === 'COMPENSATORY') return { ...q, days: '0', enabled: true };
          return q;
        })
      );
      setQuotaNote('Internship / Trainee Leave Allocation');
    }
  };

  const handleQuotaChange = (type: string, field: 'days' | 'enabled', value: any) => {
    setQuotas((prev) =>
      prev.map((q) => (q.type === type ? { ...q, [field]: value } : q))
    );
  };

  const toggleDept = (dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllUsers = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  // Submit Handler: Set Quotas
  const handleSetQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIds = getResolvedUserIds();
    if (targetIds.length === 0) {
      alert('Please select at least one employee or department.');
      return;
    }

    const enabledQuotas = quotas.filter((q) => q.enabled);
    if (enabledQuotas.length === 0) {
      alert('Please enable at least one leave category to allocate.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put('/api/leave/set-quota', {
        userIds: targetIds,
        quotas: enabledQuotas.map((q) => ({
          type: q.type,
          total: parseFloat(q.days || '0'),
          enabled: true,
        })),
        year: parseInt(year, 10),
        note: quotaNote,
      });

      alert(res.data.message || 'Leave quotas allocated successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update leave quotas');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler: Credit Extra Days
  const handleCreditDays = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIds = getResolvedUserIds();
    if (targetIds.length === 0) {
      alert('Please select at least one employee or department.');
      return;
    }
    if (!creditDays || !creditReason) {
      alert('Please provide days to credit and a valid reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/leave/credit-leave', {
        userIds: targetIds,
        type: creditType,
        days: parseFloat(creditDays),
        year: parseInt(year, 10),
        reason: creditReason,
      });

      alert(res.data.message || `Successfully credited +${creditDays} days!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to credit leave');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const resolvedCount = getResolvedEmployeesCount();

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Leave Center"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Return</span>
            </button>
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Bulk Leave Quota & Credit Manager
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Allocate multi-category annual quotas or grant comp-off credits across multiple staff.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-5 sm:px-6 pt-4 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('set_quota')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                mode === 'set_quota'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={14} />
              <span>Multi-Category Annual Quotas</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('credit_days')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                mode === 'credit_days'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award size={14} />
              <span>Bulk Extra Days / Comp-Off</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="quota-allocator-form"
          onSubmit={mode === 'set_quota' ? handleSetQuotas : handleCreditDays}
          className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar"
        >
          {/* SECTION 1: TARGET EMPLOYEE AUDIENCE SELECTOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-blue-400" />
                <span>1. Select Target Audience</span>
              </label>

              {/* Year Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Policy Year:</span>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            {/* Scope Radios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetScope('ALL')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition ${
                  targetScope === 'ALL'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Users size={16} className={targetScope === 'ALL' ? 'text-blue-400' : 'text-slate-500'} />
                <span>All Employees</span>
                <span className="text-[10px] text-slate-500">Company-wide ({users.length} staff)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('DEPARTMENT')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition ${
                  targetScope === 'DEPARTMENT'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Building size={16} className={targetScope === 'DEPARTMENT' ? 'text-blue-400' : 'text-slate-500'} />
                <span>By Department</span>
                <span className="text-[10px] text-slate-500">Teams / Functions</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('SPECIFIC')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center text-center gap-1 transition ${
                  targetScope === 'SPECIFIC'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <UserCheck size={16} className={targetScope === 'SPECIFIC' ? 'text-blue-400' : 'text-slate-500'} />
                <span>Select Specific Staff</span>
                <span className="text-[10px] text-slate-500">Multi-pick ({selectedUserIds.length})</span>
              </button>
            </div>

            {/* Scope A: Departments Sub-Selector */}
            {targetScope === 'DEPARTMENT' && (
              <div className="pt-2.5 border-t border-slate-800/60 space-y-2">
                <p className="text-[11px] text-slate-400">Choose one or more target departments:</p>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDepts.includes(dept);
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => toggleDept(dept)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 size={13} /> : <Square size={13} />}
                        <span>{dept}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scope B: Specific Staff Multi-Selector */}
            {targetScope === 'SPECIFIC' && (
              <div className="pt-2.5 border-t border-slate-800/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search employees by name, email, department..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAllUsers}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap border border-slate-700"
                  >
                    {selectedUserIds.length === users.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* User Checkbox list */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No matching employees found.</p>
                  ) : (
                    filteredUsers.map((u) => {
                      const isChecked = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleUser(u.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500/50 text-white'
                              : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                                isChecked ? 'bg-blue-600 text-white' : 'border border-slate-700'
                              }`}
                            >
                              {isChecked && '✓'}
                            </div>
                            <span className="font-semibold text-white">
                              {u.firstName} {u.lastName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({u.department || 'General'} • {u.role})
                            </span>
                          </div>
                          {isChecked && (
                            <span className="text-[10px] text-blue-400 font-semibold uppercase">Selected</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Audience Summary Banner */}
            <div className="flex items-center justify-between pt-1.5 text-xs">
              <span className="text-slate-400">Total Target Recipients:</span>
              <span className="font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                {resolvedCount} Employee{resolvedCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* MODE 1: MULTI-CATEGORY QUOTA PACKAGE */}
          {mode === 'set_quota' && (
            <div className="space-y-4">
              {/* Presets Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-blue-400" />
                  <span>2. Annual Leave Quota Package</span>
                </label>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('STANDARD')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] font-semibold border border-slate-700 transition"
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('EXECUTIVE')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold border border-slate-700 transition"
                  >
                    Executive
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('INTERN')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold border border-slate-700 transition"
                  >
                    Intern
                  </button>
                </div>
              </div>

              {/* Multi-Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {quotas.map((q) => {
                  const Icon = q.icon;
                  return (
                    <div
                      key={q.type}
                      className={`p-3.5 rounded-2xl border transition ${
                        q.enabled
                          ? 'bg-slate-950/80 border-slate-800 shadow-md'
                          : 'bg-slate-950/30 border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-1.5 rounded-xl border ${q.iconBg} ${q.iconColor}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{q.label}</p>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">{q.code}</span>
                          </div>
                        </div>

                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.enabled}
                            onChange={(e) => handleQuotaChange(q.type, 'enabled', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-600"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">Enable</span>
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="365"
                          disabled={!q.enabled}
                          value={q.days}
                          onChange={(e) => handleQuotaChange(q.type, 'days', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500 disabled:opacity-40"
                        />
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Days / Yr</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reason / Audit Note */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300">
                  HR Policy / Audit Note (Optional)
                </label>
                <input
                  type="text"
                  value={quotaNote}
                  onChange={(e) => setQuotaNote(e.target.value)}
                  placeholder="e.g. Annual HR Policy 2026 Reset, Special Contract Package"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* MODE 2: CREDIT EXTRA DAYS */}
          {mode === 'credit_days' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award size={14} className="text-amber-400" />
                <span>2. Grant Extra Leave Days</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Leave Category</label>
                  <select
                    value={creditType}
                    onChange={(e) => setCreditType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="COMPENSATORY">Compensatory Off (Comp-Off)</option>
                    <option value="EARNED">Earned / Privilege Leave</option>
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick Leave</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Days to Credit</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="30"
                      value={creditDays}
                      onChange={(e) => setCreditDays(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex gap-1">
                      {['0.5', '1', '2'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setCreditDays(d)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-bold rounded-lg border border-slate-700"
                        >
                          +{d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Reason for Credit <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. Worked on Sunday for Client Go-Live, Hackathon reward"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ← Cancel & Return
          </button>

          <Button
            type="submit"
            form="quota-allocator-form"
            disabled={submitting || resolvedCount === 0}
            className={
              mode === 'set_quota'
                ? 'bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-blue-500/20'
                : 'bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-amber-500/20'
            }
          >
            {submitting ? (
              <span>Processing...</span>
            ) : mode === 'set_quota' ? (
              <>
                <Sparkles size={14} />
                <span>Apply Package to {resolvedCount} Employee{resolvedCount === 1 ? '' : 's'}</span>
              </>
            ) : (
              <>
                <Award size={14} />
                <span>Credit +{creditDays} Days to {resolvedCount} Staff</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
