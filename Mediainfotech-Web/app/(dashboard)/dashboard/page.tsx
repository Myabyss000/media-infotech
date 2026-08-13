'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import {
  Clock,
  Building2,
  UserCheck,
  UsersRound,
  ArrowUpRight,
  CheckCircle2,
  Ticket,
  Sparkles,
  Package,
  MessageSquare,
  FolderGit2,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Media Infotech';

  return (
    <div className="space-y-8 text-slate-100 font-sans pb-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/20 p-6 md:p-8 shadow-2xl">
        {/* Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles size={14} className="text-blue-400" />
              <span>Operations Hub • IMO Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hello, {user?.firstName} {user?.lastName}! 👋
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Welcome to <span className="text-blue-400 font-semibold">{companyName}</span> Operations Hub. Attendance verification, HR services, client accounts, support tickets, and inventory management at your fingertips.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/attendance"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition flex items-center space-x-2"
            >
              <Clock size={16} />
              <span>Verify Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Metrics Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Attendance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Attendance</p>
            <h3 className="text-xl font-extrabold text-white mt-1">Verified</h3>
            <p className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center space-x-1">
              <CheckCircle2 size={12} />
              <span>GPS + Photo Tracking</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* Metric 2: HR Centre */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">HR Centre</p>
            <h3 className="text-xl font-extrabold text-white mt-1">Leave & Roster</h3>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">Employee Directory</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
        </div>

        {/* Metric 3: Client Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Client Accounts</p>
            <h3 className="text-xl font-extrabold text-white mt-1">AMC & Billing</h3>
            <p className="text-[10px] text-purple-400 mt-1 font-semibold">Service History Logs</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
        </div>

        {/* Metric 4: Support Desk */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Support Desk</p>
            <h3 className="text-xl font-extrabold text-amber-400 mt-1">Ticket System</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Group & Vehicle Link</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Ticket size={22} />
          </div>
        </div>
      </div>

      {/* Core Operational Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Core Operational Modules</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Attendance Verification */}
          <Link
            href="/attendance"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-blue-500/5 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Clock size={20} />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                <span>Attendance Verification</span>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                Check in with live camera photo capture and real-time GPS location tracking.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold group-hover:text-blue-300 transition flex items-center justify-between">
              <span>Verify Attendance</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 2: HR Centre & Roster */}
          <Link
            href="/hr"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-blue-500/5 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Building2 size={20} />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                <span>HR Centre & Roster</span>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                Submit leave requests, view employee directory, manage vehicle fleet, and payslips.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold group-hover:text-blue-300 transition flex items-center justify-between">
              <span>Open HR Portal</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 3: Support Ticket System */}
          <Link
            href="/tickets"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-blue-500/5 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
                <Ticket size={20} />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                <span>Support Ticket System</span>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                Raise tickets for groups, link client accounts, assign vehicles, and track progress.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold group-hover:text-blue-300 transition flex items-center justify-between">
              <span>Open Ticket Desk</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 4: Client Accounts */}
          {hasPermission('clients', 'read') && (
            <Link
              href="/clients"
              className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-blue-500/5 transition flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4">
                  <UserCheck size={20} />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                  <span>Client Accounts</span>
                  <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                  Manage clients, service contracts, AMC status, and complete transaction history.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold group-hover:text-blue-300 transition flex items-center justify-between">
                <span>Manage Clients</span>
                <span>→</span>
              </div>
            </Link>
          )}

          {/* Card 5: Inventory Management */}
          <Link
            href="/inventory"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-blue-500/5 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4">
                <Package size={20} />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                <span>Inventory & Equipment</span>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                Track company equipment, serial numbers, barcode scanning, and stock assignments.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold group-hover:text-blue-300 transition flex items-center justify-between">
              <span>View Inventory</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 6: Internal Chat */}
          <Link
            href="/chat"
            className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-blue-500/5 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-4">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition flex items-center justify-between">
                <span>Internal Team Chat</span>
                <ArrowUpRight size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                Real-time team collaboration, department channels, and direct messaging.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-blue-400 font-semibold group-hover:text-blue-300 transition flex items-center justify-between">
              <span>Open Team Chat</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

