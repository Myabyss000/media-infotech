'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Building2,
  Users,
  Calendar,
  Car,
  FileText,
  ArrowUpRight,
  Sparkles,
  Layers,
  DollarSign,
  BookOpen,
  Receipt,
  PartyPopper,
  ShieldCheck,
  Clock,
  Briefcase,
  ChevronRight,
  User,
  Phone,
  Mail,
  BadgeCheck,
  Gift,
  Cake,
  Trophy,
  Rocket,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function HRPage() {
  const { hasPermission, hasRole, user } = useAuth();
  const isPrivileged = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('employees', 'read');

  const [stats, setStats] = useState({
    activeEmployees: 0,
    onLeaveToday: 0,
    pendingLeaves: 0,
    pendingExpenses: 0,
    policiesCount: 0,
    myLeaveBalance: 0,
    myPendingLeaves: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      if (isPrivileged) {
        const [usersRes, leavesRes, policiesRes, expensesRes] = await Promise.allSettled([
          api.get('/api/users?limit=100'),
          api.get('/api/leave/team-calendar'),
          api.get('/api/policies'),
          api.get('/api/expenses/all?status=PENDING'),
        ]);

        const usersList = usersRes.status === 'fulfilled' ? usersRes.value.data.data || [] : [];
        const onLeaveTodayList = leavesRes.status === 'fulfilled' ? leavesRes.value.data.data || [] : [];
        const policiesList = policiesRes.status === 'fulfilled' ? policiesRes.value.data.data || [] : [];
        const pendingExpensesList = expensesRes.status === 'fulfilled' ? expensesRes.value.data.data || [] : [];

        setStats({
          activeEmployees: usersList.filter((u: any) => u.isActive).length,
          onLeaveToday: onLeaveTodayList.length,
          pendingLeaves: 0,
          pendingExpenses: pendingExpensesList.length,
          policiesCount: policiesList.length,
          myLeaveBalance: 0,
          myPendingLeaves: 0,
        });
      } else {
        // Employee personal HR stats
        const [myLeavesRes, policiesRes] = await Promise.allSettled([
          api.get('/api/leave/my-balances'),
          api.get('/api/policies'),
        ]);

        const myBalances = myLeavesRes.status === 'fulfilled' ? myLeavesRes.value.data.data || [] : [];
        const policiesList = policiesRes.status === 'fulfilled' ? policiesRes.value.data.data || [] : [];

        const totalAvailableDays = myBalances.reduce((acc: number, b: any) => acc + (b.remainingDays || b.quota || 0), 0);

        setStats({
          activeEmployees: 0,
          onLeaveToday: 0,
          pendingLeaves: 0,
          pendingExpenses: 0,
          policiesCount: policiesList.length,
          myLeaveBalance: totalAvailableDays,
          myPendingLeaves: 0,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles size={14} />
              <span>{isPrivileged ? 'Enterprise Human Resources Center' : 'Employee Self-Service Portal'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              {isPrivileged ? `Welcome to HR & People Operations, ${user?.firstName}` : `My Personal HR Portal, ${user?.firstName}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {isPrivileged
                ? 'Unified workplace hub for 360° employee profiles, organizational hierarchy, leave balance wallets, automated attendance-to-payroll calculations, and corporate policies.'
                : 'Manage your leave balance wallets, apply for time-off, view monthly salary slips, check upcoming company holidays, and read company policies.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isPrivileged ? (
              <>
                <Link
                  href="/hr/org-chart"
                  className="px-4 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center gap-2 transition shadow-lg"
                >
                  <Layers size={16} className="text-indigo-400" />
                  <span>Org Tree</span>
                </Link>
                <Link
                  href="/hr/directory"
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-2 transition shadow-lg shadow-indigo-600/30"
                >
                  <Users size={16} />
                  <span>Employee Directory</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/hr/leave"
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                >
                  <Calendar size={16} />
                  <span>Apply for Leave</span>
                </Link>
                <Link
                  href="/hr/payslips"
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-2 transition shadow-lg shadow-indigo-600/30"
                >
                  <DollarSign size={16} />
                  <span>My Payslips</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Quick Vital Stats Strip */}
      {isPrivileged ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              {loading ? '...' : stats.activeEmployees}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">● Active Company Members</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Out of Office</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Calendar size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              {loading ? '...' : stats.onLeaveToday}
            </p>
            <p className="text-[11px] text-amber-400 mt-1">Approved leaves this month</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Claims</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Receipt size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              {loading ? '...' : stats.pendingExpenses}
            </p>
            <p className="text-[11px] text-rose-400 mt-1">Awaiting reimbursement approval</p>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Policies</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              {loading ? '...' : stats.policiesCount}
            </p>
            <p className="text-[11px] text-indigo-400 mt-1">Company handbook & guidelines</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/hr/leave" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl hover:border-emerald-500/40 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Leave Quota</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                <Calendar size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              {loading ? '...' : `${stats.myLeaveBalance} Days`}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">Available for Application</p>
          </Link>

          <Link href="/hr/payslips" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl hover:border-indigo-500/40 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Salary Slips</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white mt-2">Monthly Slips</p>
            <p className="text-[11px] text-indigo-400 mt-1">View & Download PDF</p>
          </Link>

          <Link href="/hr/holidays" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl hover:border-amber-500/40 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Holidays</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                <Sparkles size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white mt-2">Calendar</p>
            <p className="text-[11px] text-amber-400 mt-1">Gazetted Days Off</p>
          </Link>

          <Link href="/hr/policies" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl hover:border-purple-500/40 transition group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Company Policies</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-white mt-2">
              {loading ? '...' : stats.policiesCount}
            </p>
            <p className="text-[11px] text-purple-400 mt-1">Official Guidelines</p>
          </Link>
        </div>
      )}

      {/* 3. Primary HR Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          {isPrivileged ? 'Core HR & Workforce Operations' : 'My Personal Services'}
        </h2>

        {isPrivileged ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Employee Directory & 360 Profiles */}
            <Link
              href="/hr/employees"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition">
                    <Users size={22} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-indigo-400">
                    360° Dossiers
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition flex items-center justify-between">
                  <span>Employee Directory</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Emergency contacts, bank accounts, statutory PAN/Aadhaar details, document vaults, and onboarding checklists.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <span>Explore Directory</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* 2. Interactive Org Hierarchy */}
            <Link
              href="/hr/org-chart"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition">
                    <Layers size={22} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-blue-400">
                    Visual Tree
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                  <span>Org Hierarchy Tree</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-blue-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Interactive company structure mapping leadership to managers and direct reports with collapsible nodes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold flex items-center gap-1">
                <span>View Org Chart</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* 3. Leave Desk & Balance Wallets */}
            <Link
              href="/hr/leave"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
                    <Calendar size={22} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-emerald-400">
                    Quota Wallets
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition flex items-center justify-between">
                  <span>Leave Desk & Quotas</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-emerald-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Casual, Sick, Earned, and Comp Off balances, half-day leaves, team Out-of-Office timeline, and manager approvals.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>Open Leave Desk</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* 4. Automated Payroll & Payslips */}
            <Link
              href="/hr/payslips"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-teal-500/60 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center group-hover:scale-105 transition">
                    <DollarSign size={22} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-teal-400">
                    1-Click Payroll
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition flex items-center justify-between">
                  <span>Payroll & Payslip Engine</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-teal-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Attendance-to-salary automated calculations, overtime bonuses, PF/PT deductions, and printable official slips.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-teal-400 font-semibold flex items-center gap-1">
                <span>Manage Payroll</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* 5. Company Policies & Handbook */}
            <Link
              href="/hr/policies"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/60 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition">
                    <BookOpen size={22} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-purple-400">
                    Compliance
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition flex items-center justify-between">
                  <span>Handbook & Policies</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-purple-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Code of conduct, remote work, IT security protocols, versioned guidelines, and digital employee sign-offs.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-purple-400 font-semibold flex items-center gap-1">
                <span>View Policies</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* 6. Vehicle Fleet */}
            <Link
              href="/hr/vehicles"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition">
                    <Car size={22} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-amber-400">
                    Logistics
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition flex items-center justify-between">
                  <span>Vehicle Fleet</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-amber-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Company vehicle fleet registration, assignment, insurance tracker, and maintenance schedules.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-amber-400 font-semibold flex items-center gap-1">
                <span>Fleet Operations</span>
                <ChevronRight size={14} />
              </div>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Leave Desk */}
            <Link
              href="/hr/leave"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  <Calendar size={22} />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition flex items-center justify-between">
                  <span>Leave Applications</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-emerald-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Submit time-off requests, check leave balances, and track approval status.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>Open Leave Desk</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* Card 2: My Payslips */}
            <Link
              href="/hr/payslips"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  <DollarSign size={22} />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition flex items-center justify-between">
                  <span>My Monthly Payslips</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  View and download official monthly salary slips with tax breakdowns.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <span>View Payslips</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* Card 3: Holidays Calendar */}
            <Link
              href="/hr/holidays"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 transition flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  <Sparkles size={22} />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition flex items-center justify-between">
                  <span>Holiday Calendar</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-amber-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Official list of company holidays and public days off for the year.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-amber-400 font-semibold flex items-center gap-1">
                <span>View Holidays</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* Card 4: Policies */}
            <Link
              href="/hr/policies"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/60 transition flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  <BookOpen size={22} />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition flex items-center justify-between">
                  <span>Company Handbook</span>
                  <ArrowUpRight size={18} className="text-slate-500 group-hover:text-purple-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Review company code of conduct, safety policies, and employee guidelines.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-purple-400 font-semibold flex items-center gap-1">
                <span>Read Policies</span>
                <ChevronRight size={14} />
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* 4. Employee Employment Record Card (For non-privileged users) */}
      {!isPrivileged && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">My Employment Record</h3>
                <p className="text-xs text-slate-400">Your official company details registered in HR records.</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
              Active Employee
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Employee Name</span>
              <span className="text-white font-bold">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Designation / Role</span>
              <span className="text-white font-bold">{user?.designation || user?.role || 'Field Engineer'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Department</span>
              <span className="text-white font-bold">{user?.department || 'Operations'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Official Email</span>
              <span className="text-white font-mono truncate block">{user?.email || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
