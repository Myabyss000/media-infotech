'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { X, DollarSign, Calculator, Percent, Sparkles, Building, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SalaryStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialUserId?: string;
}

export function SalaryStructureModal({
  isOpen,
  onClose,
  onSuccess,
  initialUserId,
}: SalaryStructureModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    monthlyCtc: '',
    basicPay: '',
    hra: '',
    specialAllowance: '',
    conveyanceAllowance: '',
    medicalAllowance: '',
    pfEmployee: '',
    pfEmployer: '',
    professionalTax: '200',
    tds: '0',
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (initialUserId) {
        setSelectedUserId(initialUserId);
        fetchStructureForUser(initialUserId);
      }
    }
  }, [isOpen, initialUserId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users?limit=150');
      setUsers(res.data.data || []);
      if (!selectedUserId && res.data.data?.length > 0) {
        setSelectedUserId(res.data.data[0].id);
        fetchStructureForUser(res.data.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStructureForUser = async (userId: string) => {
    try {
      const res = await api.get(`/api/payslips/salary-structure?userId=${userId}`);
      const st = res.data.data;
      if (st) {
        setForm({
          monthlyCtc: st.monthlyCtc?.toString() || '',
          basicPay: st.basicPay?.toString() || '',
          hra: st.hra?.toString() || '',
          specialAllowance: st.specialAllowance?.toString() || '',
          conveyanceAllowance: st.conveyanceAllowance?.toString() || '',
          medicalAllowance: st.medicalAllowance?.toString() || '',
          pfEmployee: st.pfEmployee?.toString() || '',
          pfEmployer: st.pfEmployer?.toString() || '',
          professionalTax: st.professionalTax?.toString() || '200',
          tds: st.tds?.toString() || '0',
        });
      } else {
        setForm({
          monthlyCtc: '',
          basicPay: '',
          hra: '',
          specialAllowance: '',
          conveyanceAllowance: '',
          medicalAllowance: '',
          pfEmployee: '',
          pfEmployer: '',
          professionalTax: '200',
          tds: '0',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-calculate components from Monthly CTC (Standard 50% Basic, 20% HRA, etc.)
  const handleAutoCompute = (ctcStr: string) => {
    const ctc = parseFloat(ctcStr) || 0;
    if (ctc <= 0) return;

    const basic = Math.round(ctc * 0.5); // 50% Basic
    const hra = Math.round(basic * 0.4); // 40% of Basic HRA
    const conveyance = 1600;
    const medical = 1250;
    const pfEmp = Math.min(1800, Math.round(basic * 0.12)); // 12% PF capped/standard
    const pfEmplr = pfEmp;
    const pt = 200;

    const currentTotalAllocated = basic + hra + conveyance + medical;
    const special = Math.max(0, ctc - currentTotalAllocated);

    setForm({
      monthlyCtc: ctcStr,
      basicPay: basic.toString(),
      hra: hra.toString(),
      specialAllowance: special.toString(),
      conveyanceAllowance: conveyance.toString(),
      medicalAllowance: medical.toString(),
      pfEmployee: pfEmp.toString(),
      pfEmployer: pfEmplr.toString(),
      professionalTax: pt.toString(),
      tds: form.tds || '0',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      setSubmitting(true);
      await api.post('/api/payslips/salary-structure', {
        userId: selectedUserId,
        ...form,
      });
      alert('Salary structure saved successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save salary structure');
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

  const totalGross =
    (parseFloat(form.basicPay) || 0) +
    (parseFloat(form.hra) || 0) +
    (parseFloat(form.specialAllowance) || 0) +
    (parseFloat(form.conveyanceAllowance) || 0) +
    (parseFloat(form.medicalAllowance) || 0);

  const totalDeductions =
    (parseFloat(form.pfEmployee) || 0) +
    (parseFloat(form.professionalTax) || 0) +
    (parseFloat(form.tds) || 0);

  const estimatedNet = Math.max(0, totalGross - totalDeductions);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl my-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Employee Compensation & CTC Structure</h3>
              <p className="text-xs text-slate-400">Define salary components, statutory deductions, and tax withholdings.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Employee Selection */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Target Employee</label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                fetchStructureForUser(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.employeeCode || u.designation || u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Monthly CTC & Auto Calculator */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold text-xs uppercase tracking-wider text-emerald-400">
                Monthly Cost-to-Company (CTC)
              </label>
              <button
                type="button"
                onClick={() => handleAutoCompute(form.monthlyCtc)}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Calculator size={13} />
                <span>Auto-Calculate Breakdown</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-bold">₹</span>
              <input
                type="number"
                value={form.monthlyCtc}
                onChange={(e) => {
                  setForm({ ...form, monthlyCtc: e.target.value });
                  handleAutoCompute(e.target.value);
                }}
                className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm"
                placeholder="e.g. 50000"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Annual Package: ₹{(parseFloat(form.monthlyCtc || '0') * 12).toLocaleString('en-IN')} / year
            </p>
          </div>

          {/* Earnings Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Earnings & Allowances</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Basic Pay (₹)</label>
                <input
                  type="number"
                  value={form.basicPay}
                  onChange={(e) => setForm({ ...form, basicPay: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">House Rent (HRA) (₹)</label>
                <input
                  type="number"
                  value={form.hra}
                  onChange={(e) => setForm({ ...form, hra: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Special Allowance (₹)</label>
                <input
                  type="number"
                  value={form.specialAllowance}
                  onChange={(e) => setForm({ ...form, specialAllowance: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Conveyance (₹)</label>
                <input
                  type="number"
                  value={form.conveyanceAllowance}
                  onChange={(e) => setForm({ ...form, conveyanceAllowance: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Medical Allowance (₹)</label>
                <input
                  type="number"
                  value={form.medicalAllowance}
                  onChange={(e) => setForm({ ...form, medicalAllowance: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Statutory Deductions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Statutory Deductions & Taxes</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">PF Employee (₹)</label>
                <input
                  type="number"
                  value={form.pfEmployee}
                  onChange={(e) => setForm({ ...form, pfEmployee: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PF Employer (₹)</label>
                <input
                  type="number"
                  value={form.pfEmployer}
                  onChange={(e) => setForm({ ...form, pfEmployer: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Prof. Tax (PT) (₹)</label>
                <input
                  type="number"
                  value={form.professionalTax}
                  onChange={(e) => setForm({ ...form, professionalTax: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">TDS / Income Tax (₹)</label>
                <input
                  type="number"
                  value={form.tds}
                  onChange={(e) => setForm({ ...form, tds: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Summary Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-400 font-semibold">Calculated Take-Home Pay</p>
              <p className="text-lg font-mono font-extrabold text-white">
                ₹{estimatedNet.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">/ month</span>
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              <p>Gross: ₹{totalGross.toLocaleString('en-IN')}</p>
              <p>Deductions: ₹{totalDeductions.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
              {submitting ? 'Saving...' : 'Save CTC Structure'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
