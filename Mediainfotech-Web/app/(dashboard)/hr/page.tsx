'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  Building2,
  Users,
  Calendar,
  Car,
  FileText,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function HRPage() {
  const { hasPermission, user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles size={14} />
            <span>Human Resources Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">HR & Employee Roster</h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Manage employee profiles, submit & approve leave requests, manage vehicle fleet, and generate monthly payslips.
          </p>
        </div>
      </div>

      {/* HR Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Employees Module */}
        {hasPermission('users', 'read') && (
          <Link
            href="/hr/employees"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition flex items-center justify-between">
                <span>Employee Directory</span>
                <ArrowUpRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                View all company employees, roles, designations, and permissions matrix.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-indigo-400 font-semibold">
              Manage Directory →
            </div>
          </Link>
        )}

        {/* Leave Management */}
        <Link
          href="/hr/leave"
          className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition flex flex-col justify-between shadow-xl"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4">
              <Calendar size={24} />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
              <span>Leave Management</span>
              <ArrowUpRight size={18} className="text-slate-500 group-hover:text-blue-400 transition" />
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Apply for Casual, Sick, or Earned leaves and review leave balances.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold">
            Open Leave Desk →
          </div>
        </Link>

        {/* Vehicle Management */}
        {hasPermission('vehicles', 'read') && (
          <Link
            href="/hr/vehicles"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Car size={24} />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition flex items-center justify-between">
                <span>Vehicle Fleet</span>
                <ArrowUpRight size={18} className="text-slate-500 group-hover:text-emerald-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Company vehicle fleet assignment, registration details, and maintenance.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-emerald-400 font-semibold">
              Manage Fleet →
            </div>
          </Link>
        )}

        {/* Payslip Management */}
        <Link
          href="/hr/payslips"
          className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition flex flex-col justify-between shadow-xl"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition flex items-center justify-between">
              <span>Payslips & Payroll</span>
              <ArrowUpRight size={18} className="text-slate-500 group-hover:text-purple-400 transition" />
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Download monthly payslips and view salary breakdown statements.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-purple-400 font-semibold">
            View Payslips →
          </div>
        </Link>
      </div>
    </div>
  );
}
