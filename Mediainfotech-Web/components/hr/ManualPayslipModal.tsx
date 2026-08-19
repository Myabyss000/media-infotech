'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { X, Edit3, Calculator, DollarSign, Upload, FileText, Sparkles, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ManualPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any | null; // If editing an existing payslip
}

export function ManualPayslipModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ManualPayslipModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const [basicPay, setBasicPay] = useState('');
  const [allowances, setAllowances] = useState('');
  const [deductions, setDeductions] = useState('');
  const [netPay, setNetPay] = useState('');
  const [notes, setNotes] = useState('');
  const [filePath, setFilePath] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (initialData) {
        setSelectedUserId(initialData.userId || initialData.user?.id || '');
        setMonth(initialData.month?.toString() || (new Date().getMonth() + 1).toString());
        setYear(initialData.year?.toString() || new Date().getFullYear().toString());
        setBasicPay(initialData.basicPay?.toString() || '');
        setAllowances(initialData.allowances?.toString() || '');
        setDeductions(initialData.deductions?.toString() || '');
        setNetPay(initialData.netPay?.toString() || '');
        setNotes(initialData.notes || '');
        setFilePath(initialData.filePath || '');
        setFile(null);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setBasicPay('');
    setAllowances('');
    setDeductions('');
    setNetPay('');
    setNotes('');
    setFilePath('');
    setFile(null);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users?limit=150');
      setUsers(res.data.data || []);
      if (!selectedUserId && !initialData && res.data.data?.length > 0) {
        setSelectedUserId(res.data.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate Net Pay when basic, allowances, or deductions change
  const handleCalculateNet = (bStr: string, aStr: string, dStr: string) => {
    const b = parseFloat(bStr) || 0;
    const a = parseFloat(aStr) || 0;
    const d = parseFloat(dStr) || 0;
    const net = Math.max(0, b + a - d);
    setNetPay(net.toString());
  };

  // Load employee CTC preset defaults
  const handleLoadDefaults = async () => {
    if (!selectedUserId) return;
    try {
      const res = await api.get(`/api/payslips/salary-structure?userId=${selectedUserId}`);
      const st = res.data.data;
      if (st) {
        const b = st.basicPay || 0;
        const a = (st.hra || 0) + (st.specialAllowance || 0) + (st.conveyanceAllowance || 0) + (st.medicalAllowance || 0);
        const d = (st.pfEmployee || 0) + (st.professionalTax || 0) + (st.tds || 0);
        setBasicPay(b.toString());
        setAllowances(a.toString());
        setDeductions(d.toString());
        setNetPay(Math.max(0, b + a - d).toString());
        setNotes('Base CTC structure applied with manual verification.');
      } else {
        alert('No saved CTC structure found for this employee. Please configure their CTC first.');
      }
    } catch (e) {
      alert('Could not load CTC defaults');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !month || !year) {
      alert('Please select an employee, month, and year');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('userId', selectedUserId);
      formData.append('month', month);
      formData.append('year', year);
      if (basicPay) formData.append('basicPay', basicPay);
      if (allowances) formData.append('allowances', allowances);
      if (deductions) formData.append('deductions', deductions);
      if (netPay) formData.append('netPay', netPay);
      if (notes) formData.append('notes', notes);
      if (file) formData.append('payslip', file);

      await api.post('/api/payslips', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Payslip saved successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save manual payslip');
    } finally {
      setSubmitting(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthNames = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl my-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialData ? 'Edit / Override Payslip' : 'Manual Payslip Generator'}
              </h3>
              <p className="text-xs text-slate-400">
                Directly define salary amounts, bonuses, adjustments, or attach an external slip.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Employee & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold block">Target Employee *</label>
                <button
                  type="button"
                  onClick={handleLoadDefaults}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>Load CTC Defaults</span>
                </button>
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                disabled={Boolean(initialData)}
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.employeeCode || u.designation || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Month *</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                disabled={Boolean(initialData)}
              >
                {monthNames.slice(1).map((m, idx) => (
                  <option key={m} value={(idx + 1).toString()}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Year *</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                disabled={Boolean(initialData)}
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          {/* Salary Breakdown Inputs */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Financial Breakdown (INR ₹)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Basic Salary (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={basicPay}
                  onChange={(e) => {
                    setBasicPay(e.target.value);
                    handleCalculateNet(e.target.value, allowances, deductions);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
                  placeholder="30000"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Allowances & OT (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={allowances}
                  onChange={(e) => {
                    setAllowances(e.target.value);
                    handleCalculateNet(basicPay, e.target.value, deductions);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Deductions (PF/PT) (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={deductions}
                  onChange={(e) => {
                    setDeductions(e.target.value);
                    handleCalculateNet(basicPay, allowances, e.target.value);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-rose-400 font-mono font-bold"
                  placeholder="2000"
                />
              </div>
            </div>

            {/* Calculated Net Take-Home */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400">Net Take-Home Salary</span>
                <p className="text-base font-black font-mono text-white mt-0.5">
                  ₹{(parseFloat(netPay) || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-40">
                <label className="text-[10px] text-slate-400 block mb-0.5 text-right">Net Override (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={netPay}
                  onChange={(e) => setNetPay(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs text-right"
                  required
                />
              </div>
            </div>
          </div>

          {/* Remarks & Notes */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">HR / Payroll Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              placeholder="e.g. 26 Payable Days, ₹1,200 Performance Bonus included"
            />
          </div>

          {/* File Upload Attachment */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">
              Upload External PDF / Signed Slip (Optional)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              {submitting ? 'Saving...' : initialData ? 'Save Override' : 'Generate Payslip'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
