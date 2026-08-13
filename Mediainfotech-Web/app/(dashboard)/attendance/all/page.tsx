'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Clock,
  Search,
  MapPin,
  Camera,
  ExternalLink,
  Users,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Target,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function AllAttendanceRecordsPage() {
  const { hasPermission, user } = useAuth();

  // Today Summary State
  const [todayStats, setTodayStats] = useState<{
    totalStaff: number;
    totalCheckedInToday: number;
    notCheckedInToday: number;
    pendingToday: number;
    approvedToday: number;
    rejectedToday: number;
    lateToday: number;
    earlyExitToday: number;
    geofenceFlaggedToday: number;
  }>({
    totalStaff: 0,
    totalCheckedInToday: 0,
    notCheckedInToday: 0,
    pendingToday: 0,
    approvedToday: 0,
    rejectedToday: 0,
    lateToday: 0,
    earlyExitToday: 0,
    geofenceFlaggedToday: 0,
  });

  const [todayAttendees, setTodayAttendees] = useState<any[]>([]);
  const [notCheckedInUsers, setNotCheckedInUsers] = useState<any[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  // Master History Roster State
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Interactivity State
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL'); // 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'LATE' | 'EARLY_EXIT'
  const [filterDate, setFilterDate] = useState('');

  // Default collapsed state as requested by user
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);

  // Photo modal preview
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const canApprove = hasPermission('attendance', 'approve') || hasPermission('attendance', 'update') || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR';

  useEffect(() => {
    fetchTodaySummary();
    fetchRecords();
  }, [search, activeFilter, filterDate]);

  const fetchTodaySummary = async () => {
    setTodayLoading(true);
    try {
      const res = await api.get('/api/attendance/today-summary');
      if (res.data.stats) {
        setTodayStats(res.data.stats);
      }
      setTodayAttendees(res.data.attendees || []);
      setNotCheckedInUsers(res.data.notCheckedInUsers || []);
    } catch (e) {
      console.error('Error fetching today summary:', e);
    } finally {
      setTodayLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = `/api/attendance/all?search=${search}`;
      if (['PENDING', 'APPROVED', 'REJECTED'].includes(activeFilter)) {
        query += `&status=${activeFilter}`;
      }
      if (filterDate) query += `&date=${filterDate}`;

      const res = await api.get(query);
      setRecords(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/api/attendance/${id}/status`, { status });
      fetchTodaySummary();
      fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update attendance status');
    }
  };

  const handleCardClick = (filterKey: string) => {
    setActiveFilter(filterKey);
    setIsAttendeesOpen(true); // Automatically expand when stat card is clicked
  };

  // Filter attendees for today's grid
  const filteredTodayAttendees = todayAttendees.filter((r) => {
    if (activeFilter === 'CHECKED_IN') return true;
    if (activeFilter === 'PENDING') return r.status === 'PENDING';
    if (activeFilter === 'APPROVED') return r.status === 'APPROVED';
    if (activeFilter === 'REJECTED') return r.status === 'REJECTED';
    if (activeFilter === 'LATE') return r.isLate;
    if (activeFilter === 'EARLY_EXIT') return r.isEarlyExit;
    if (activeFilter === 'REMOTE') return r.checkInNote && (r.checkInNote.includes('Remote') || r.checkInNote.includes('Out of'));
    return true;
  });

  // Filter not checked in users
  const filteredNotCheckedIn = notCheckedInUsers.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(term) ||
      u.lastName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <ShieldCheck className="text-blue-400" size={28} />
            <span>Attendance Portal & Master Roster</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time daily attendees overview, scheduled shift timings, late/early flags, and historical records.
          </p>
        </div>

        <button
          onClick={() => {
            fetchTodaySummary();
            fetchRecords();
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading || todayLoading ? 'animate-spin text-blue-400' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* STAT PANEL — 2 ROWS LAYOUT (4 cards per row) */}
      <div className="space-y-3">
        {/* Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Card 1: Total Staff */}
          <div
            onClick={() => handleCardClick('ALL')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'ALL'
                ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Staff</p>
              <p className="text-2xl font-extrabold font-mono text-white mt-1">{todayStats.totalStaff || 0}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
          </div>

          {/* Card 2: Checked In Today */}
          <div
            onClick={() => handleCardClick('CHECKED_IN')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'CHECKED_IN'
                ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Checked In Today</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">{todayStats.totalCheckedInToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
          </div>

          {/* Card 3: Not Checked In */}
          <div
            onClick={() => handleCardClick('NOT_CHECKED_IN')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'NOT_CHECKED_IN'
                ? 'bg-rose-500/20 border-rose-500 ring-2 ring-rose-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Not Checked In</p>
              <p className="text-2xl font-extrabold font-mono text-rose-400 mt-1">{todayStats.notCheckedInToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <UserX size={20} />
            </div>
          </div>

          {/* Card 4: Pending Review */}
          <div
            onClick={() => handleCardClick('PENDING')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'PENDING'
                ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pending Review</p>
              <p className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{todayStats.pendingToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Card 5: Approved Today */}
          <div
            onClick={() => handleCardClick('APPROVED')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'APPROVED'
                ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Approved Today</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">{todayStats.approvedToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>

          {/* Card 6: Rejected Today */}
          <div
            onClick={() => handleCardClick('REJECTED')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'REJECTED'
                ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Rejected Today</p>
              <p className="text-2xl font-extrabold font-mono text-red-400 mt-1">{todayStats.rejectedToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <XCircle size={20} />
            </div>
          </div>

          {/* Card 7: Late Entries */}
          <div
            onClick={() => handleCardClick('LATE')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'LATE'
                ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Late Entries</p>
              <p className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{todayStats.lateToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
          </div>

          {/* Card 8: Early Exit / Remote */}
          <div
            onClick={() => handleCardClick('EARLY_EXIT')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between shadow-xl ${activeFilter === 'EARLY_EXIT'
                ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/30'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Early Exits</p>
              <p className="text-2xl font-extrabold font-mono text-orange-400 mt-1">{todayStats.earlyExitToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE ATTENDEES & ROSTER SECTION (COLLAPSED BY DEFAULT, NO SECTION TITLES) */}
      <div className="pt-2 border-t border-slate-800/80 space-y-4">
        {/* Expand / Collapse Control Bar */}
        <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAttendeesOpen(!isAttendeesOpen)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition"
            >
              <span>{isAttendeesOpen ? 'Collapse' : 'Expand'}</span>
              {isAttendeesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {activeFilter !== 'ALL' && (
              <span className="text-xs text-blue-400 font-mono font-semibold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
                <span>Filter: {activeFilter}</span>
                <button onClick={() => setActiveFilter('ALL')} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-mono">
            {todayAttendees.length} Checked In • {todayStats.notCheckedInToday} Pending Check-In
          </p>
        </div>

        {/* Collapsible Container */}
        {isAttendeesOpen && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {todayLoading ? (
              <div className="text-xs text-slate-400">Loading today's attendees roster...</div>
            ) : activeFilter === 'NOT_CHECKED_IN' ? (
              filteredNotCheckedIn.length === 0 ? (
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <UserCheck size={32} className="mx-auto text-emerald-500" />
                  <p className="text-sm font-semibold text-white">All Employees Have Checked In Today!</p>
                  <p className="text-xs text-slate-400">There are no pending or absent employees for today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredNotCheckedIn.map((u) => {
                    const shiftEndTimeStr = u.shiftEndTime || '18:30';
                    const [endH, endM] = shiftEndTimeStr.split(':').map((v: string) => parseInt(v, 10));
                    const now = new Date();
                    const shiftEndToday = new Date(now);
                    shiftEndToday.setHours(isNaN(endH) ? 18 : endH, isNaN(endM) ? 30 : endM, 0, 0);
                    const hasShiftEnded = now.getTime() > shiftEndToday.getTime();

                    return (
                      <div
                        key={u.id}
                        className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Top Row: User Info & Absent Status */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                                {u.firstName?.charAt(0)}
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-white text-sm truncate">
                                  {u.firstName} {u.lastName}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {u.designation || u.role} • <span className="text-slate-500">{u.email}</span>
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border shrink-0 ${
                                hasShiftEnded
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {hasShiftEnded ? 'ABSENT' : 'NOT CHECKED IN'}
                            </span>
                          </div>

                          {/* Shift timing & Notice */}
                          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">Scheduled Shift</p>
                            <p className="font-mono text-white font-bold">
                              {u.shiftStartTime || '09:30'} - {shiftEndTimeStr}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {hasShiftEnded
                                ? `Shift ended at ${shiftEndTimeStr}. Check-in closed.`
                                : `Shift active until ${shiftEndTimeStr}.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredTodayAttendees.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Users size={32} className="mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-white">No Attendees Matched</p>
                <p className="text-xs text-slate-400">Select another filter card above or reset search filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTodayAttendees.map((r) => {
                  const isRemote = r.checkInNote && (r.checkInNote.includes('Remote') || r.checkInNote.includes('Out of'));

                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top Row: User Info & Status */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                              {r.user?.firstName?.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-white text-sm truncate">
                                {r.user?.firstName} {r.user?.lastName}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {r.user?.designation || r.user?.role}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border shrink-0 ${r.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : r.status === 'REJECTED'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}
                          >
                            {r.status}
                          </span>
                        </div>

                        {/* Middle: Photo & Geofence Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {/* Photo Thumbnail */}
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Captured Photo</p>
                            {r.checkInPhoto ? (
                              <div
                                onClick={() => setSelectedPhoto(r.checkInPhoto)}
                                className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:border-blue-500 transition group"
                              >
                                <img src={r.checkInPhoto} alt="Check-in Photo" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                  <Camera size={16} />
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                                No Photo
                              </div>
                            )}
                          </div>

                          {/* Time & GPS Info */}
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Check-In Time</p>
                            <p className="font-mono text-emerald-400 font-bold text-xs">
                              {new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>

                            {/* Late Entry / Early Exit Badges */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {r.isLate && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                                  ⏰ +{r.lateMinutes}m Late
                                </span>
                              )}
                              {r.isEarlyExit && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
                                  🚪 -{r.earlyExitMinutes}m Early
                                </span>
                              )}
                              {isRemote ? (
                                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
                                  Off-Site / Remote
                                </span>
                              ) : (
                                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                                  On-Premises
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Note if present */}
                        {r.checkInNote && (
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300">
                            <span className="text-slate-500 font-semibold">Note:</span> {r.checkInNote}
                          </div>
                        )}
                      </div>

                      {/* Quick Action Buttons for Managers */}
                      {canApprove && (
                        <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                            disabled={r.status === 'APPROVED'}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 disabled:opacity-40 text-xs font-semibold transition flex items-center justify-center space-x-1"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                            disabled={r.status === 'REJECTED'}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 disabled:opacity-40 text-xs font-semibold transition flex items-center justify-center space-x-1"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name, email, designation..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />

              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="ALL">All Records</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="LATE">Late Entries</option>
                <option value="EARLY_EXIT">Early Exits</option>
              </select>

              {(activeFilter !== 'ALL' || filterDate || search) && (
                <button
                  onClick={() => {
                    setActiveFilter('ALL');
                    setFilterDate('');
                    setSearch('');
                  }}
                  className="text-xs text-red-400 font-semibold px-2 py-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Attendance Master Roster Table */}
          {loading ? (
            <div className="text-xs text-slate-400">Loading historical attendance records...</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Captured Photo</th>
                    <th className="p-4">GPS Location</th>
                    <th className="p-4">Total Hours</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No historical attendance records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const statusBadge =
                        r.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : r.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition">
                          {/* Employee */}
                          <td className="p-4">
                            <p className="font-bold text-white text-sm">
                              {r.user?.firstName} {r.user?.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {r.user?.designation || r.user?.role} • <span className="text-slate-500">{r.user?.email}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Shift: {r.user?.shiftStartTime || '09:30'} - {r.user?.shiftEndTime || '18:30'}
                            </p>
                          </td>

                          {/* Date & Time */}
                          <td className="p-4 text-slate-300">
                            <p className="font-mono font-bold text-white">{formatDate(r.date)}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1">
                              <span>In:</span> <span className="text-emerald-400 font-mono">{new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {r.isLate && <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-mono">+{r.lateMinutes}m Late</span>}
                            </p>
                            {r.checkOutTime && (
                              <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                                <span>Out:</span> <span className="text-blue-400 font-mono">{new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {r.isEarlyExit && <span className="text-[9px] px-1 rounded bg-orange-500/20 text-orange-400 font-mono">-{r.earlyExitMinutes}m Early</span>}
                              </p>
                            )}
                          </td>

                          {/* Photo Thumbnail */}
                          <td className="p-4">
                            {r.checkInPhoto ? (
                              <div
                                onClick={() => setSelectedPhoto(r.checkInPhoto)}
                                className="relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:border-blue-500 transition group"
                              >
                                <img
                                  src={r.checkInPhoto}
                                  alt="Check-in Photo"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                  <Camera size={14} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">No Photo</span>
                            )}
                          </td>

                          {/* GPS Location */}
                          <td className="p-4 text-slate-300 max-w-[200px]">
                            <div className="flex items-center space-x-1.5 text-[11px]">
                              <MapPin size={12} className="text-blue-400 shrink-0" />
                              <span className="truncate" title={r.checkInAddress || `${r.checkInLat}, ${r.checkInLng}`}>
                                {r.checkInAddress || `${r.checkInLat.toFixed(4)}, ${r.checkInLng.toFixed(4)}`}
                              </span>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${r.checkInLat},${r.checkInLng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-400 hover:underline flex items-center space-x-1 mt-1 font-mono"
                            >
                              <span>Open Map</span>
                              <ExternalLink size={10} />
                            </a>
                          </td>

                          {/* Total Hours */}
                          <td className="p-4 font-mono text-white">
                            <p className="font-bold">{r.totalHours ? `${r.totalHours} hrs` : 'Working...'}</p>
                            {r.overtimeHours > 0 && (
                              <p className="text-[10px] text-amber-400">+{r.overtimeHours} OT hrs</p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${statusBadge}`}>
                              {r.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            {canApprove ? (
                              <div className="flex items-center justify-end space-x-2">
                                {r.status !== 'APPROVED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                                    className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-semibold transition"
                                  >
                                    Approve
                                  </button>
                                )}
                                {r.status !== 'REJECTED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                                    className="px-3 py-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs font-semibold transition"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Read Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Photo Preview Modal */}
    {selectedPhoto && (
      <div
        onClick={() => setSelectedPhoto(null)}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      >
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-4 max-w-lg w-full overflow-hidden shadow-2xl space-y-3">
          <img src={selectedPhoto} alt="Full Verification Photo" className="w-full h-auto rounded-2xl" />
          <p className="text-center text-xs text-slate-400 font-mono">
            GPS Verified Camera Photo Snapshot
          </p>
        </div>
      </div>
    )}
  </div>
);
}

