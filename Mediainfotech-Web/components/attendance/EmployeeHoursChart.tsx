'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Clock,
  TrendingUp,
  Zap,
  Coffee,
  Calendar,
  Download,
  Search,
  Filter,
  UserCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Timer,
  BarChart3,
  Layers,
  ArrowUpRight,
  User as UserIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
} from 'recharts';

interface EmployeeHoursChartProps {
  initialUserId?: string;
  showUserSelector?: boolean;
  title?: string;
  subtitle?: string;
}

export function EmployeeHoursChart({
  initialUserId,
  showUserSelector = false,
  title = 'Work Hours vs. Extra Hours Breakdown',
  subtitle = 'Granular analysis of standard shift hours, extra overtime hours, breaks, and productive time.',
}: EmployeeHoursChartProps) {
  const { user: authUser, hasRole } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || authUser?.id || '');
  const [userList, setUserList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Preset / Date Filter State
  const [preset, setPreset] = useState<'7D' | '14D' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Data & Loading States
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const canSelectUsers = showUserSelector && (hasRole('ADMIN', 'HR', 'MANAGER') || authUser?.role === 'ADMIN');

  useEffect(() => {
    if (canSelectUsers) {
      fetchUsers();
    }
  }, [canSelectUsers]);

  useEffect(() => {
    if (selectedUserId) {
      fetchHoursAnalytics();
    }
  }, [selectedUserId, preset, customStart, customEnd]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      const list = res.data.users || res.data.data || res.data || [];
      setUserList(list);
    } catch (e) {
      console.error('Failed to fetch users list:', e);
    }
  };

  const fetchHoursAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/attendance/employee-hours?userId=${selectedUserId}&preset=${preset}`;
      if (preset === 'CUSTOM' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const res = await api.get(url);
      setAnalyticsData(res.data);
    } catch (e: any) {
      console.error('Fetch employee hours error:', e);
      setError(e.response?.data?.error || 'Failed to load employee hours data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = userList.filter((u) => {
    if (departmentFilter !== 'ALL' && u.department !== departmentFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      return matchName || matchEmail || matchDept;
    }
    return true;
  });

  const departments = Array.from(new Set(userList.map((u) => u.department).filter(Boolean)));

  const handleExportCsv = () => {
    if (!analyticsData?.dailyData || analyticsData.dailyData.length === 0) return;
    const emp = analyticsData.user;
    const headers = [
      'Date',
      'Day',
      'Status',
      'Check In',
      'Check Out',
      'Regular Hours',
      'Extra (OT) Hours',
      'Break Hours',
      'Net Productive Hours',
      'Clocked Hours',
      'Late (mins)',
      'Early Exit (mins)',
      'Notes',
    ];

    const rows = analyticsData.dailyData.map((d: any) => [
      `"${d.date}"`,
      `"${d.fullDayName}"`,
      `"${d.status}"`,
      `"${d.checkInTime || '-'}"`,
      `"${d.checkOutTime || '-'}"`,
      `"${d.regularHours}"`,
      `"${d.extraHours}"`,
      `"${d.breakHours}"`,
      `"${d.productiveHours}"`,
      `"${d.clockedHours}"`,
      `"${d.lateMinutes || 0}"`,
      `"${d.earlyExitMinutes || 0}"`,
      `"${(d.note || '').replace(/"/g, '""')}"`,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `work_hours_${emp?.firstName}_${emp?.lastName}_${preset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analyticsData?.summary;
  const targetUser = analyticsData?.user;

  // Custom Chart Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-sm">
              {data.fullDayName}, {data.date}
            </span>
            <Badge
              className={
                data.status === 'PRESENT'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : data.status === 'LATE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : data.status === 'HOLIDAY'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : data.status === 'LEAVE'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }
            >
              {data.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
            <div>
              <span className="text-slate-400 block">Check In:</span>
              <span className="font-semibold text-white">{data.checkInTime || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Check Out:</span>
              <span className="font-semibold text-white">{data.checkOutTime || '-'}</span>
            </div>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-blue-400">
              <span>Standard Shift Hours:</span>
              <span className="font-bold">{data.regularHours}h</span>
            </div>
            <div className="flex justify-between items-center text-amber-400">
              <span>Extra / Overtime Hours:</span>
              <span className="font-bold">{data.extraHours > 0 ? `+${data.extraHours}h` : '0h'}</span>
            </div>
            <div className="flex justify-between items-center text-purple-400">
              <span>Break Duration:</span>
              <span className="font-bold">{data.breakHours}h</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-extrabold border-t border-slate-800 pt-1">
              <span>Net Productive Time:</span>
              <span>{data.productiveHours}h</span>
            </div>
          </div>

          {data.isLate && (
            <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-1 bg-amber-500/10 px-2 py-0.5 rounded">
              <AlertCircle size={12} />
              <span>Late Entry: +{data.lateMinutes} mins</span>
            </div>
          )}
          {data.isEarlyExit && (
            <div className="text-[11px] text-orange-400 flex items-center gap-1 mt-1 bg-orange-500/10 px-2 py-0.5 rounded">
              <Clock size={12} />
              <span>Early Exit: -{data.earlyExitMinutes} mins</span>
            </div>
          )}
          {data.isRegularized && (
            <div className="text-[11px] text-blue-400 flex items-center gap-1 mt-1 bg-blue-500/10 px-2 py-0.5 rounded">
              <Sparkles size={12} />
              <span>Regularized / Dispute Approved</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with Employee Selector & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-500/20 border border-blue-500/30 text-blue-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          {targetUser && (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300 text-xs overflow-hidden">
                {targetUser.avatar ? (
                  <img src={targetUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${targetUser.firstName?.[0] || ''}${targetUser.lastName?.[0] || ''}`
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-200 text-sm">
                  {targetUser.firstName} {targetUser.lastName}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  • {targetUser.designation || 'Staff'} ({targetUser.department || 'General'})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Employee Selector for Managers/HR */}
          {canSelectUsers && (
            <div className="relative min-w-[200px]">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-medium cursor-pointer"
              >
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.department || 'General'})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          )}

          {/* Time Preset Buttons */}
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {(['7D', '14D', 'THIS_MONTH', 'LAST_MONTH'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  preset === p
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {p === '7D' ? '7 Days' : p === '14D' ? '14 Days' : p === 'THIS_MONTH' ? 'This Month' : 'Last Month'}
              </button>
            ))}
          </div>

          <Button
            onClick={handleExportCsv}
            disabled={!analyticsData?.dailyData?.length}
            variant="outline"
            className="text-xs h-8 px-3 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          >
            <Download size={14} className="mr-1.5 text-blue-400" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Regular Shift Hours */}
          <div className="bg-slate-900/70 border border-blue-500/20 rounded-2xl p-4 relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -mr-2 -mt-2 pointer-events-none" />
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-1">
              <Clock size={14} />
              <span>Regular Shift</span>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {summary.totalRegularHours}
              <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Standard Shift Target</span>
            </div>
          </div>

          {/* Card 2: Extra / Overtime Hours */}
          <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-lg shadow-amber-500/5">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full -mr-2 -mt-2 pointer-events-none" />
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
              <TrendingUp size={14} />
              <span>Extra / Overtime</span>
            </div>
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              +{summary.totalExtraHours}
              <span className="text-xs font-normal text-amber-400/80 ml-1">hrs</span>
            </div>
            <div className="text-[11px] text-amber-400/70 mt-1 flex items-center gap-1">
              <span>{summary.overtimePercentage}% of productive work</span>
            </div>
          </div>

          {/* Card 3: Net Productive Hours */}
          <div className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -mr-2 -mt-2 pointer-events-none" />
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
              <Zap size={14} />
              <span>Net Productive</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 tracking-tight">
              {summary.totalProductiveHours}
              <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>Clocked minus breaks</span>
            </div>
          </div>

          {/* Card 4: Break Duration */}
          <div className="bg-slate-900/70 border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full -mr-2 -mt-2 pointer-events-none" />
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-1">
              <Coffee size={14} />
              <span>Total Breaks</span>
            </div>
            <div className="text-2xl font-black text-purple-300 tracking-tight">
              {summary.totalBreakHours}
              <span className="text-xs font-normal text-slate-400 ml-1">hrs</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>Lunch & tea logs</span>
            </div>
          </div>

          {/* Card 5: Avg Daily Hours */}
          <div className="bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-4 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-bl-full -mr-2 -mt-2 pointer-events-none" />
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold mb-1">
              <Timer size={14} />
              <span>Daily Average</span>
            </div>
            <div className="text-2xl font-black text-cyan-300 tracking-tight">
              {summary.averageDailyHours}
              <span className="text-xs font-normal text-slate-400 ml-1">hrs/day</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>Across {summary.daysPresent} present days</span>
            </div>
          </div>

          {/* Card 6: Attendance % */}
          <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-4 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full -mr-2 -mt-2 pointer-events-none" />
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold mb-1">
              <CheckCircle2 size={14} />
              <span>Attendance Rate</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 tracking-tight">
              {summary.attendancePercentage}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>{summary.daysPresent} / {summary.totalWorkingDays} working days</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Chart Card */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <span>Daily Work Hours & Extra Hours Visual Matrix</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Stacked visualization showing standard shift hours vs extra overtime hours worked past the benchmark.
              </CardDescription>
            </div>

            {/* Legend indicator badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Regular Shift Hours</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Extra / Overtime Hours</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-300">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>Break Hours</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-300">
                <div className="w-4 h-0.5 bg-cyan-400 border-dashed" />
                <span>Shift Target (8h)</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="h-80 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading work hours & overtime analytics...</span>
            </div>
          ) : error ? (
            <div className="h-80 flex flex-col items-center justify-center text-center space-y-2 p-4">
              <AlertCircle size={32} className="text-rose-400" />
              <p className="text-sm font-semibold text-rose-300">{error}</p>
              <Button onClick={fetchHoursAnalytics} variant="outline" className="text-xs mt-2">
                Retry
              </Button>
            </div>
          ) : analyticsData?.dailyData?.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-center text-slate-400">
              <Calendar size={32} className="text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No attendance records found for this date range.</p>
            </div>
          ) : (
            <div className="w-full h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={analyticsData.dailyData}
                  margin={{ top: 20, right: 20, bottom: 25, left: -10 }}
                >
                  <defs>
                    <linearGradient id="regHoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="extraHoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="breakHoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="dayNumber"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val: any, idx: number) => {
                      const item = analyticsData.dailyData[idx];
                      return item ? `${item.dayName} ${val}` : val;
                    }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    unit="h"
                    domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax + 2))]}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Benchmark Standard Shift Reference Line at 8.0h */}
                  <ReferenceLine
                    y={summary?.targetShiftHours || 8.0}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: `Target: ${summary?.targetShiftHours || 8}h`,
                      fill: '#06b6d4',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />

                  {/* Stacked Bars: Regular Hours + Extra Overtime Hours */}
                  <Bar
                    dataKey="regularHours"
                    name="Regular Shift Hours"
                    stackId="hours"
                    fill="url(#regHoursGradient)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="extraHours"
                    name="Extra / Overtime Hours"
                    stackId="hours"
                    fill="url(#extraHoursGradient)"
                    radius={[4, 4, 0, 0]}
                  />

                  {/* Line overlay for Break Hours */}
                  <Line
                    type="monotone"
                    dataKey="breakHours"
                    name="Break Duration"
                    stroke="#c084fc"
                    strokeWidth={2.5}
                    dot={{ fill: '#a855f7', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Toggle Daily Breakdown Table Button */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing daily breakdown for {analyticsData?.dailyData?.length || 0} dates
            </span>
            <Button
              onClick={() => setShowTable(!showTable)}
              variant="ghost"
              className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-3 rounded-xl gap-1"
            >
              <span>{showTable ? 'Hide Detailed Table' : 'Show Detailed Daily Table'}</span>
              {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>

          {/* Detailed Daily Breakdown Table */}
          {showTable && analyticsData?.dailyData && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Check-In</th>
                    <th className="p-3">Check-Out</th>
                    <th className="p-3 text-right">Regular Hrs</th>
                    <th className="p-3 text-right text-amber-400">Extra (OT)</th>
                    <th className="p-3 text-right text-purple-400">Break Hrs</th>
                    <th className="p-3 text-right font-bold text-emerald-400">Net Productive</th>
                    <th className="p-3">Punctuality / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {analyticsData.dailyData.map((row: any) => (
                    <tr key={row.date} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-medium text-white">
                        {row.date} <span className="text-slate-400 font-normal">({row.dayName})</span>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            row.status === 'PRESENT'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : row.status === 'LATE'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : row.status === 'HOLIDAY'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : row.status === 'LEAVE'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-300">{row.checkInTime || '-'}</td>
                      <td className="p-3 text-slate-300">{row.checkOutTime || '-'}</td>
                      <td className="p-3 text-right font-semibold text-blue-300">{row.regularHours}h</td>
                      <td className="p-3 text-right font-bold text-amber-400">
                        {row.extraHours > 0 ? `+${row.extraHours}h` : '-'}
                      </td>
                      <td className="p-3 text-right text-purple-300">{row.breakHours > 0 ? `${row.breakHours}h` : '-'}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-300">{row.productiveHours}h</td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {row.isLate && <span className="text-amber-400 font-medium">Late (+{row.lateMinutes}m) </span>}
                        {row.isEarlyExit && <span className="text-orange-400 font-medium">Early Exit (-{row.earlyExitMinutes}m) </span>}
                        {row.isRegularized && <span className="text-blue-400 font-medium">[Regularized] </span>}
                        {row.note && <span className="italic text-slate-400">{row.note}</span>}
                        {!row.isLate && !row.isEarlyExit && !row.isRegularized && !row.note && '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
