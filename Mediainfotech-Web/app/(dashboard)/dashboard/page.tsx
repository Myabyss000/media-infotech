'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Clock,
  Building2,
  UsersRound,
  CheckCircle2,
  Ticket,
  Sparkles,
  Package,
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Plus,
  Barcode,
  FileEdit,
  Truck,
  Phone,
  ArrowRight,
  User,
} from 'lucide-react';

import { AttendanceCheckWidget } from '@/components/attendance/AttendanceCheckWidget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, hasRole, hasPermission } = useAuth();
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Media Infotech';

  // Check if privileged role (Admin, Manager, HR)
  const isPrivileged = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('attendance', 'approve');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetchDashboardOverview();
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardOverview = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/api/dashboard/overview');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Fetch dashboard overview error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Privileged company-wide metrics
  const attendance = dashboardData?.attendance || {
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
  };

  const tickets = dashboardData?.tickets || {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    activeTickets: 0,
    urgentTickets: 0,
    urgentList: [],
  };

  const inventory = dashboardData?.inventory || {
    totalItems: 0,
    inStockItems: 0,
    assignedInField: 0,
    mustReturnCount: 0,
  };

  const clients = dashboardData?.clients || {
    totalClients: 0,
    activeClients: 0,
    monitoredSites: 0,
  };

  const vehicles = dashboardData?.vehicles || {
    totalVehicles: 0,
    assignedVehicles: 0,
  };

  const pendingApprovals = dashboardData?.pendingApprovals || {
    totalPending: 0,
    pendingAttendanceCount: 0,
    pendingRegularizationsCount: 0,
    pendingLeavesCount: 0,
  };

  // Employee personal metrics
  const personalOverview = dashboardData?.personalOverview || {
    checkedIn: false,
    checkInTime: null,
    checkOutTime: null,
    isLate: false,
    totalBreaksCount: 0,
    activeTicketsCount: 0,
    urgentTicketsCount: 0,
    custodyEquipmentCount: 0,
    groupEquipmentCount: 0,
    totalAssignedProductsCount: 0,
  };

  const myHub = dashboardData?.myDailyHub || {
    myTodayAttendance: null,
    myAssignedTickets: [],
    myGroups: [],
    myCustodyEquipment: [],
  };

  const myPrimaryGroup = myHub.myGroups && myHub.myGroups.length > 0 ? myHub.myGroups[0] : null;

  const formatClockTime = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-7 text-slate-100 font-sans pb-12">
      {/* 1. Hero Welcome & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Sparkles size={13} className="text-blue-400" />
                <span>{isPrivileged ? 'Operations Command Center' : 'Field Technician Workspace'}</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-mono">
                <Clock size={12} className="text-emerald-400" />
                <span>{currentTime || 'Live Clock'}</span>
              </span>
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                {user?.role || 'Staff Member'}
              </Badge>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hello, {user?.firstName} {user?.lastName}! 👋
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isPrivileged
                ? `Welcome to ${companyName} Operations Hub. Real-time workforce roll call, active support tickets, hardware inventory, and fleet coordination at your fingertips.`
                : `Welcome to ${companyName} Portal. Verify your daily attendance, view your assigned field jobs, access group service vans, and inspect products in your custody.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardOverview}
              disabled={refreshing}
              className="text-xs border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </Button>

            <Link
              href="/attendance"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition flex items-center space-x-1.5"
            >
              <Clock size={14} />
              <span>My Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Primary Daily Clock-In / Break Widget */}
      <AttendanceCheckWidget />

      {/* 3. Role-Based Overview Cards */}
      {isPrivileged ? (
        /* ===== ADMIN / MANAGER / HR COMPANY-WIDE KPI PULSE ===== */
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Live Company Operations Pulse</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Executive Mode</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Attendance Roll Call */}
            <Link
              href="/attendance"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Today's Workforce</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {attendance.presentToday} <span className="text-xs text-slate-400 font-normal">/ {attendance.totalStaff} Present</span>
                </h3>
                <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center justify-between">
                  <span>{attendance.attendanceRate}% On-Duty</span>
                  {attendance.lateToday > 0 && <span className="text-amber-400 font-normal">{attendance.lateToday} Late</span>}
                </p>
              </div>
            </Link>

            {/* Card 2: Support Tickets */}
            <Link
              href="/tickets"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Active Tickets</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Ticket size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {tickets.activeTickets} <span className="text-xs text-slate-400 font-normal">Active Jobs</span>
                </h3>
                <p className="text-[11px] mt-1 font-semibold flex items-center justify-between">
                  <span className="text-amber-400">{tickets.openTickets} Open • {tickets.inProgressTickets} In Progress</span>
                  {tickets.urgentTickets > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      {tickets.urgentTickets} Urgent
                    </span>
                  )}
                </p>
              </div>
            </Link>

            {/* Card 3: Inventory & Hardware */}
            <Link
              href="/inventory"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Hardware Assets</span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Package size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {inventory.totalItems} <span className="text-xs text-slate-400 font-normal">Total Units</span>
                </h3>
                <p className="text-[11px] text-blue-400 mt-1 font-semibold flex items-center justify-between">
                  <span>{inventory.assignedInField} In Field Custody</span>
                  {inventory.mustReturnCount > 0 && (
                    <span className="text-rose-400 font-normal">{inventory.mustReturnCount} Return Req.</span>
                  )}
                </p>
              </div>
            </Link>

            {/* Card 4: Clients & Sites */}
            <Link
              href="/clients"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Clients & Sites</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Building2 size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {clients.activeClients} <span className="text-xs text-slate-400 font-normal">/ {clients.totalClients} Accounts</span>
                </h3>
                <p className="text-[11px] text-purple-400 mt-1 font-semibold">
                  {clients.monitoredSites} CCTV Installation Sites
                </p>
              </div>
            </Link>

            {/* Card 5: Service Fleet */}
            <Link
              href="/hr/vehicles"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Service Fleet</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Truck size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {vehicles.assignedVehicles} <span className="text-xs text-slate-400 font-normal">/ {vehicles.totalVehicles} Vans</span>
                </h3>
                <p className="text-[11px] text-cyan-400 mt-1 font-semibold">
                  {vehicles.assignedVehicles > 0 ? 'Vehicles Deployed On-Road' : 'All Fleet in Yard'}
                </p>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        /* ===== REGULAR EMPLOYEE / TECHNICIAN PERSONAL WORKSPACE OVERVIEW ===== */
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>My Daily Work Overview</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Personal Roster</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: My Shift Status */}
            <Link
              href="/attendance"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">My Today's Shift</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Clock size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-xl font-extrabold text-white">
                  {personalOverview.checkedIn
                    ? formatClockTime(personalOverview.checkInTime)
                    : 'Not Clocked In'}
                </h3>
                <p className="text-[11px] mt-1 font-semibold flex items-center justify-between">
                  <span className={personalOverview.checkedIn ? 'text-emerald-400' : 'text-slate-400'}>
                    {personalOverview.checkedIn
                      ? personalOverview.isLate
                        ? 'Clocked In (Late)'
                        : 'On-Time • Active Shift'
                      : 'Clock In Above'}
                  </span>
                  {personalOverview.totalBreaksCount > 0 && (
                    <span className="text-amber-400 text-[10px]">{personalOverview.totalBreaksCount} Breaks</span>
                  )}
                </p>
              </div>
            </Link>

            {/* Card 2: My Assigned Tickets */}
            <Link
              href="/tickets"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">My Assigned Jobs</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Ticket size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {personalOverview.activeTicketsCount} <span className="text-xs text-slate-400 font-normal">Active Tickets</span>
                </h3>
                <p className="text-[11px] text-amber-400 mt-1 font-semibold flex items-center justify-between">
                  <span>Assigned to Me & Group</span>
                  {personalOverview.urgentTicketsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      {personalOverview.urgentTicketsCount} Urgent
                    </span>
                  )}
                </p>
              </div>
            </Link>

            {/* Card 3: Products Assigned to Me & Group */}
            <Link
              href="/groups"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Assigned Products</span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Package size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-extrabold text-white">
                  {personalOverview.totalAssignedProductsCount} <span className="text-xs text-slate-400 font-normal">Assigned Units</span>
                </h3>
                <p className="text-[11px] text-blue-400 mt-1 font-semibold">
                  {personalOverview.custodyEquipmentCount} in Toolbag • {personalOverview.groupEquipmentCount} in Group Van
                </p>
              </div>
            </Link>

            {/* Card 4: My Field Group & Service Van */}
            <Link
              href="/groups"
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition shadow-xl group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">My Field Team & Van</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <UsersRound size={18} />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-lg font-extrabold text-white truncate">
                  {myPrimaryGroup ? myPrimaryGroup.name : 'Individual Staff'}
                </h3>
                <p className="text-[11px] text-indigo-400 mt-1 font-semibold truncate">
                  {myPrimaryGroup?.vehicle ? `🚐 ${myPrimaryGroup.vehicle.registrationNo}` : 'No Vehicle Assigned'}
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Quick Actions (Role-Tailored) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} className="text-blue-400" />
            <span>Quick Actions</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {isPrivileged ? (
            <>
              <Link
                href="/tickets"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Plus size={14} />
                </div>
                <span>Raise Ticket</span>
              </Link>

              <Link
                href="/inventory"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Barcode size={14} />
                </div>
                <span>Scan & Dispatch</span>
              </Link>

              <Link
                href="/attendance"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                  <FileEdit size={14} />
                </div>
                <span>Review Approvals</span>
              </Link>

              <Link
                href="/groups"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                  <UsersRound size={14} />
                </div>
                <span>Field Team Hub</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/attendance"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Clock size={14} />
                </div>
                <span>My Attendance Log</span>
              </Link>

              <Link
                href="/attendance"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                  <FileEdit size={14} />
                </div>
                <span>Time Correction</span>
              </Link>

              <Link
                href="/groups"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                  <UsersRound size={14} />
                </div>
                <span>My Group & Van Hub</span>
              </Link>

              <Link
                href="/chat"
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/40 transition flex items-center space-x-2.5 text-xs font-semibold text-white group"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                  <MessageSquare size={14} />
                </div>
                <span>Team Chat</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 5. Admin / Manager Priority Command Center */}
      {isPrivileged && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority Support Tickets Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400" />
                <span>Priority Service Tickets & Dispatch Queue</span>
              </h3>
              <Link href="/tickets" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                <span>View all tickets</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {tickets.urgentList && tickets.urgentList.length > 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
                {tickets.urgentList.map((t: any) => (
                  <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{t.ticketNumber}</span>
                        <Badge
                          variant={t.priority === 'URGENT' ? 'destructive' : 'warning'}
                          className="text-[10px]"
                        >
                          {t.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-slate-300">
                          {t.status}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-white text-sm">{t.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Client: <strong className="text-slate-300">{t.client?.companyName || t.client?.name || 'N/A'}</strong></span>
                        {t.assignedGroup && <span>• Team: <strong className="text-blue-400">{t.assignedGroup.name}</strong></span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/tickets`}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-slate-500 text-xs">
                🎉 No critical or urgent tickets requiring immediate supervisor action.
              </div>
            )}
          </div>

          {/* Pending Approvals & Hardware Warnings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-purple-400" />
                <span>Pending Approvals ({pendingApprovals.totalPending})</span>
              </h3>
              <Link href="/attendance" className="text-xs text-purple-400 hover:underline">
                Review all
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Attendance Regularizations</span>
                  <Badge variant={pendingApprovals.pendingRegularizationsCount > 0 ? 'warning' : 'outline'}>
                    {pendingApprovals.pendingRegularizationsCount} Pending
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Missed punch requests and time correction disputes from field staff.
                </p>
                <Link
                  href="/attendance"
                  className="block text-right text-xs text-blue-400 hover:underline font-semibold pt-1"
                >
                  Go to Approvals →
                </Link>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Leave Applications</span>
                  <Badge variant={pendingApprovals.pendingLeavesCount > 0 ? 'warning' : 'outline'}>
                    {pendingApprovals.pendingLeavesCount} Pending
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Vacation, medical, and casual leave applications awaiting HR decision.
                </p>
                <Link
                  href="/hr"
                  className="block text-right text-xs text-blue-400 hover:underline font-semibold pt-1"
                >
                  Review Leaves →
                </Link>
              </div>

              {inventory.mustReturnCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-400" />
                      <span>Hardware Returns Warning</span>
                    </span>
                    <Badge variant="destructive">{inventory.mustReturnCount} Units</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {inventory.mustReturnCount} items marked defective or decommissioned must be checked into central warehouse.
                  </p>
                  <Link
                    href="/inventory"
                    className="block text-right text-xs text-rose-400 hover:underline font-semibold"
                  >
                    Process Batch Return →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Active Assignments, Group & Assigned Products */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UsersRound size={16} className="text-indigo-400" />
            <span>{isPrivileged ? 'Field Roster & Active Assignments' : 'My Active Assignments & Assigned Equipment'}</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Live Roster</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Assigned Tickets */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Ticket size={14} className="text-amber-400" />
                  <span>My Assigned Tickets ({myHub.myAssignedTickets?.length || 0})</span>
                </span>
                <Link href="/tickets" className="text-xs text-blue-400 hover:underline">
                  View all
                </Link>
              </div>

              {myHub.myAssignedTickets && myHub.myAssignedTickets.length > 0 ? (
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {myHub.myAssignedTickets.map((t: any, idx: number) => (
                    <div key={`my-ticket-${t.id}-${idx}`} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-indigo-400 font-bold">{t.ticketNumber}</span>
                        <Badge variant="outline" className="text-[9px] py-0">{t.status}</Badge>
                      </div>
                      <p className="font-semibold text-white truncate">{t.title}</p>
                      {t.client && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                          <span className="truncate">{t.client.companyName || t.client.name}</span>
                          {t.client.phone && (
                            <a href={`tel:${t.client.phone}`} className="text-emerald-400 font-semibold hover:underline flex items-center gap-0.5">
                              <Phone size={10} /> Call
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-4 italic">No tickets currently assigned to you or your group.</p>
              )}
            </div>
          </div>

          {/* Card 2: Assigned Group & Service Vehicle */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UsersRound size={14} className="text-blue-400" />
                  <span>My Group & Service Van</span>
                </span>
                <Link href="/groups" className="text-xs text-blue-400 hover:underline">
                  Workspace
                </Link>
              </div>

              {myHub.myGroups && myHub.myGroups.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {myHub.myGroups.slice(0, 2).map((g: any, idx: number) => (
                    <div key={`my-group-${g.id}-${idx}`} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{g.name}</span>
                        <span className="text-[10px] text-slate-400">{g.members?.length || 0} Members</span>
                      </div>
                      {g.vehicle ? (
                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold flex items-center justify-between">
                          <span>🚐 {g.vehicle.registrationNo}</span>
                          <span className="text-[10px] text-slate-400">{g.vehicle.make} {g.vehicle.model}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 block">No service vehicle assigned</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-4 italic">You are not linked to an active field group.</p>
              )}
            </div>
          </div>

          {/* Card 3: Products Assigned to Me & My Group */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-emerald-400" />
                  <span>Assigned Hardware & Toolbag</span>
                </span>
                <Link href="/groups" className="text-xs text-blue-400 hover:underline">
                  Group Assets
                </Link>
              </div>

              {(() => {
                const custodyItems = myHub.myCustodyEquipment || [];
                const groupItems = myPrimaryGroup?.inventoryItems || [];
                
                // Deduplicate items by unique ID
                const seenIds = new Set<string>();
                const allMyItems: any[] = [];
                for (const item of [...custodyItems, ...groupItems]) {
                  if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    allMyItems.push(item);
                  }
                }

                if (allMyItems.length === 0) {
                  return <p className="text-xs text-slate-500 mt-4 italic">No equipment currently assigned to your toolbag or group.</p>;
                }

                return (
                  <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {allMyItems.slice(0, 6).map((item: any, idx: number) => (
                      <div key={`assigned-item-${item.id}-${idx}`} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                        <div className="truncate max-w-[150px]">
                          <span className="font-semibold text-white block truncate">{item.deviceName}</span>
                          <span className="text-[10px] text-slate-500">{item.category || 'Hardware'}</span>
                        </div>
                        <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          {item.barcode}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
