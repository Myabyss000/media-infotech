'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  DollarSign,
  FileText,
  Calculator,
  Receipt,
  User,
  Users,
  Search,
  Filter,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  Sparkles,
  TrendingUp,
  CreditCard,
  Building,
  Upload,
  Edit3,
  SlidersHorizontal,
  RefreshCw,
  Printer,
  Trash2,
  BarChart3,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SalaryStructureModal } from '@/components/hr/SalaryStructureModal';
import { PayslipViewerModal } from '@/components/hr/PayslipViewerModal';
import { ExpenseClaimModal } from '@/components/hr/ExpenseClaimModal';
import { ManualPayslipModal } from '@/components/hr/ManualPayslipModal';

export default function PayslipsPage() {
  const { hasRole, hasPermission, user } = useAuth();
  const isFinanceOrHR = hasRole('ADMIN', 'HR', 'ACCOUNTS', 'MANAGER') || hasPermission('payroll', 'read');

  const [activeTab, setActiveTab] = useState<'my_payslips' | 'payroll_register' | 'analytics' | 'expenses'>(
    'my_payslips'
  );

  // Payslips state
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [allPayslips, setAllPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);

  // Month & Year Filter
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Expenses state
  const [myExpenses, setMyExpenses] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [expenseFilter, setExpenseFilter] = useState('ALL');

  // Modals state
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [selectedSalaryUserId, setSelectedSalaryUserId] = useState<string | undefined>(undefined);

  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<any | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [calculatingPayroll, setCalculatingPayroll] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth, selectedYear, deptFilter, expenseFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchMyPayslips(),
        fetchMyExpenses(),
        isFinanceOrHR ? fetchAllPayslips() : Promise.resolve(),
        isFinanceOrHR ? fetchAllExpenses() : Promise.resolve(),
        isFinanceOrHR ? fetchAnalytics() : Promise.resolve(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetchMyPayslips(),
        fetchMyExpenses(),
        isFinanceOrHR ? fetchAllPayslips() : Promise.resolve(),
        isFinanceOrHR ? fetchAllExpenses() : Promise.resolve(),
        isFinanceOrHR ? fetchAnalytics() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMyPayslips = async () => {
    try {
      const res = await api.get('/api/payslips/my-payslips');
      setMyPayslips(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllPayslips = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedMonth !== 'ALL') params.append('month', selectedMonth);
      if (selectedYear !== 'ALL') params.append('year', selectedYear);
      if (deptFilter !== 'ALL') params.append('department', deptFilter);
      const res = await api.get(`/api/payslips/all?${params.toString()}`);
      setAllPayslips(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedMonth !== 'ALL') params.append('month', selectedMonth);
      if (selectedYear !== 'ALL') params.append('year', selectedYear);
      const res = await api.get(`/api/payslips/analytics?${params.toString()}`);
      setAnalyticsData(res.data || null);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyExpenses = async () => {
    try {
      const res = await api.get('/api/expenses/my-claims');
      setMyExpenses(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (expenseFilter !== 'ALL') params.append('status', expenseFilter);
      const res = await api.get(`/api/expenses/all?${params.toString()}`);
      setAllExpenses(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunPayroll = async () => {
    if (
      !confirm(
        `Run smart automated attendance & leave payroll calculations for ${selectedMonth}/${selectedYear}?`
      )
    ) {
      return;
    }
    try {
      setCalculatingPayroll(true);
      const res = await api.post('/api/payslips/calculate', {
        month: parseInt(selectedMonth, 10),
        year: parseInt(selectedYear, 10),
      });
      alert(res.data.message || 'Smart payroll calculated successfully!');
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to compute payroll');
    } finally {
      setCalculatingPayroll(false);
    }
  };

  const handleDeletePayslip = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this payslip record?')) return;
    try {
      await api.delete(`/api/payslips/${id}`);
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete payslip');
    }
  };

  const handleOpenPayslipViewer = (payslip: any) => {
    setSelectedPayslip(payslip);
    setViewerModalOpen(true);
  };

  const handleOpenManualCreate = () => {
    setEditingPayslip(null);
    setManualModalOpen(true);
  };

  const handleOpenManualEdit = (payslip: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPayslip(payslip);
    setManualModalOpen(true);
  };

  const handleOpenSalaryStructure = (userId?: string) => {
    setSelectedSalaryUserId(userId);
    setSalaryModalOpen(true);
  };

  const handleUpdateExpenseStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/expenses/${id}/status`, { status });
      fetchAllExpenses();
      fetchMyExpenses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update claim status');
    }
  };

  const totalDisbursed = allPayslips.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const totalGross = allPayslips.reduce((sum, p) => sum + (p.basicPay || 0) + (p.allowances || 0), 0);
  const totalDeductions = allPayslips.reduce((sum, p) => sum + (p.deductions || 0), 0);
  const pendingExpensesCount = allExpenses.filter((e) => e.status === 'PENDING').length;
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <DollarSign size={16} />
            <span>Smart Compensation & Expense Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Payroll Engine & Smart Payslip Hub
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Automated biometric payroll, printable & downloadable payslips, statutory tax deductions, and expense claims.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 gap-1.5 shadow-md"
            title="Refresh All Payroll Records"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          {isFinanceOrHR && (
            <>
              <Button
                variant="outline"
                onClick={handleOpenManualCreate}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-xs font-semibold text-blue-400 gap-1.5 shadow-md"
              >
                <Edit3 size={14} />
                <span>Manual Entry</span>
              </Button>

              <Button
                onClick={handleRunPayroll}
                disabled={calculatingPayroll}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Calculator size={14} />
                <span>{calculatingPayroll ? 'Calculating...' : 'Run Auto Engine'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOpenSalaryStructure()}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 gap-1.5"
              >
                <Settings size={14} />
                <span>CTC Setup</span>
              </Button>
            </>
          )}

          <Button
            onClick={() => setExpenseModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Receipt size={14} />
            <span>Submit Claim</span>
          </Button>
        </div>
      </div>

      {/* Smart Engine Quick Info Cards (HR / Finance) */}
      {isFinanceOrHR && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-500/30 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Net Disbursed</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              For {monthNames[parseInt(selectedMonth, 10)]} {selectedYear} ({allPayslips.length} Slips)
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900 border border-blue-500/30 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Gross Payout</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <CreditCard size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              ₹{totalGross.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Basic + allowances & overtime</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900 border border-rose-500/30 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Deductions</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldCheck size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              ₹{totalDeductions.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">PF, PT, TDS tax withheld</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Pending Claims</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Receipt size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">{pendingExpensesCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting review & reimbursement</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/60 p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('my_payslips')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'my_payslips'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={14} />
          <span>My Salary Slips ({myPayslips.length})</span>
        </button>

        {isFinanceOrHR && (
          <>
            <button
              onClick={() => setActiveTab('payroll_register')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'payroll_register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator size={14} />
              <span>Master Payroll Register ({allPayslips.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={14} />
              <span>Smart Payroll Analytics</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt size={14} />
          <span>Expense Claims</span>
          {pendingExpensesCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
              {pendingExpensesCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MY PAYSLIPS */}
      {activeTab === 'my_payslips' && (
        <div className="space-y-4">
          <DataTable
            headers={[
              'Payroll Period',
              'Basic (Earned)',
              'Allowances & OT',
              'Deductions (PF/PT)',
              'Net Take-Home',
              'Official Statement',
            ]}
          >
            {myPayslips.length === 0 ? (
              <EmptyRow colSpan={6} message="No salary payslips generated for your profile yet." />
            ) : (
              myPayslips.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-bold text-white text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-400" />
                      <span>
                        {monthNames[p.month]} {p.year}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-mono text-slate-300">
                    ₹{(p.basicPay || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-xs font-mono text-emerald-400 font-semibold">
                    +₹{(p.allowances || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-xs font-mono text-rose-400 font-semibold">
                    -₹{(p.deductions || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-sm font-mono font-black text-white">
                    ₹{(p.netPay || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleOpenPayslipViewer(p)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Printer size={13} />
                      <span>View, Print & Download</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      )}

      {/* TAB 2: MASTER PAYROLL REGISTER */}
      {activeTab === 'payroll_register' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff by name or code..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Month */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                {monthNames.slice(1).map((m, idx) => (
                  <option key={m} value={(idx + 1).toString()}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenManualCreate}
                size="sm"
                variant="outline"
                className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-blue-400 text-xs font-semibold gap-1"
              >
                <Plus size={13} />
                <span>Manual Entry</span>
              </Button>

              <Button
                onClick={handleRunPayroll}
                disabled={calculatingPayroll}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-lg shadow-emerald-600/20"
              >
                <Calculator size={13} />
                <span>Smart Auto-Run</span>
              </Button>
            </div>
          </div>

          <DataTable
            headers={[
              'Employee',
              'Bank / Statutory',
              'Basic (Earned)',
              'Allowances & OT',
              'Deductions (PF/PT)',
              'Net Payable',
              'Actions',
            ]}
          >
            {allPayslips.length === 0 ? (
              <EmptyRow
                colSpan={7}
                message={`No payslips found for ${monthNames[parseInt(selectedMonth, 10)]} ${selectedYear}. Use 'Smart Auto-Run' or 'Manual Entry' to generate.`}
              />
            ) : (
              allPayslips
                .filter((p) => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (
                    p.user?.firstName?.toLowerCase().includes(q) ||
                    p.user?.lastName?.toLowerCase().includes(q) ||
                    p.user?.employeeCode?.toLowerCase().includes(q) ||
                    p.user?.designation?.toLowerCase().includes(q)
                  );
                })
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20">
                          {p.user?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">
                            {p.user?.firstName} {p.user?.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {p.user?.employeeCode || p.user?.designation || 'Staff'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-400">
                      <p>A/C: {p.user?.bankAccountNumber ? `••••${p.user.bankAccountNumber.slice(-4)}` : 'N/A'}</p>
                      <p className="text-[10px] text-slate-500">PAN: {p.user?.panNumber || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-300">
                      ₹{(p.basicPay || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-xs font-mono text-emerald-400 font-semibold">
                      +₹{(p.allowances || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-xs font-mono text-rose-400 font-semibold">
                      -₹{(p.deductions || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-sm font-mono font-black text-white">
                      ₹{(p.netPay || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenPayslipViewer(p)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1"
                          title="Print / Save PDF"
                        >
                          <Printer size={12} />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={(e) => handleOpenManualEdit(p, e)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                          title="Edit / Override Figures"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenSalaryStructure(p.userId)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
                          title="Edit CTC Structure"
                        >
                          <Settings size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePayslip(p.id, e)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition border border-slate-700 hover:border-rose-800"
                          title="Delete Payslip"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </DataTable>
        </div>
      )}

      {/* TAB 3: SMART PAYROLL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Breakdown Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Building size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Departmental Compensation Distribution</h3>
                    <p className="text-[11px] text-slate-400">Monthly net salary spend across teams</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {monthNames[parseInt(selectedMonth, 10)]} {selectedYear}
                </Badge>
              </div>

              {analyticsData?.departmentBreakdown?.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">No departmental records found.</div>
              ) : (
                <div className="space-y-3">
                  {analyticsData?.departmentBreakdown?.map((dept: any) => {
                    const percentage =
                      analyticsData.totalDisbursed > 0
                        ? Math.round((dept.totalNetPay / analyticsData.totalDisbursed) * 100)
                        : 0;
                    return (
                      <div key={dept.department} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-300">
                            {dept.department} ({dept.employeeCount} staff)
                          </span>
                          <span className="font-mono text-white">
                            ₹{dept.totalNetPay.toLocaleString('en-IN')} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Statutory Deductions Summary */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Statutory & Tax Withholdings</h3>
                    <p className="text-[11px] text-slate-400">PF, Professional Tax & TDS summary</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Basic Payout</span>
                  <p className="text-lg font-black font-mono text-white mt-1">
                    ₹{(analyticsData?.totalBasic || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Allowances</span>
                  <p className="text-lg font-black font-mono text-emerald-400 mt-1">
                    ₹{(analyticsData?.totalAllowances || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Deductions</span>
                  <p className="text-lg font-black font-mono text-rose-400 mt-1">
                    ₹{(analyticsData?.totalDeductions || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Average Take-Home</span>
                  <p className="text-lg font-black font-mono text-indigo-400 mt-1">
                    ₹{(analyticsData?.averageNet || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Reimbursement Claims Ledger</h3>
              <p className="text-xs text-slate-400">Review staff expense receipts and approve disbursements.</p>
            </div>
            <Button
              onClick={() => setExpenseModalOpen(true)}
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1"
            >
              <Plus size={13} />
              <span>Submit Claim</span>
            </Button>
          </div>

          <DataTable
            headers={['Claimant', 'Title & Category', 'Date', 'Amount', 'Receipt', 'Status', 'Actions']}
          >
            {(isFinanceOrHR ? allExpenses : myExpenses).length === 0 ? (
              <EmptyRow colSpan={7} message="No expense reimbursement claims recorded." />
            ) : (
              (isFinanceOrHR ? allExpenses : myExpenses).map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 text-xs font-semibold text-white">
                    {e.user ? `${e.user.firstName} ${e.user.lastName}` : 'Me'}
                  </td>
                  <td className="p-4 text-xs">
                    <p className="font-bold text-white">{e.title}</p>
                    <Badge variant="secondary" className="text-[10px] bg-slate-800 text-amber-400 mt-0.5">
                      {e.category}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs text-slate-400">{formatDate(e.date)}</td>
                  <td className="p-4 text-sm font-mono font-bold text-white">
                    ₹{(e.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-xs">
                    {e.receiptUrl ? (
                      <a
                        href={e.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <FileText size={12} />
                        <span>View Bill</span>
                      </a>
                    ) : (
                      <span className="text-slate-500">No Receipt</span>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="p-4">
                    {isFinanceOrHR && e.status === 'PENDING' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateExpenseStatus(e.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateExpenseStatus(e.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">Processed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      )}

      {/* Salary Structure Modal */}
      <SalaryStructureModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        initialUserId={selectedSalaryUserId}
        onSuccess={() => {
          fetchAllData();
        }}
      />

      {/* Payslip Viewer & Print/Download Modal */}
      <PayslipViewerModal
        isOpen={viewerModalOpen}
        onClose={() => setViewerModalOpen(false)}
        payslip={selectedPayslip}
        onRefresh={() => fetchAllData()}
      />

      {/* Manual Payslip Generator & Editor Modal */}
      <ManualPayslipModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        initialData={editingPayslip}
        onSuccess={() => {
          fetchAllData();
        }}
      />

      {/* Expense Claim Modal */}
      <ExpenseClaimModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={() => {
          fetchMyExpenses();
          if (isFinanceOrHR) fetchAllExpenses();
        }}
      />
    </div>
  );
}
