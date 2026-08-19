'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  BarChart3,
  TrendingUp,
  Download,
  Search,
  Filter,
  Users,
  Clock,
  Zap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function AttendanceAnalyticsPanel() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [musterData, setMusterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMusterRoll();
  }, [selectedMonth, selectedYear, departmentFilter]);

  const fetchMusterRoll = async () => {
    try {
      setLoading(true);
      let url = `/api/attendance/muster-roll?month=${selectedMonth}&year=${selectedYear}`;
      if (departmentFilter !== 'ALL') url += `&department=${departmentFilter}`;
      const res = await api.get(url);
      setMusterData(res.data);
    } catch (e) {
      console.error('Fetch muster roll error:', e);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const staff = musterData?.staff || [];

  const filteredStaff = staff.filter((s: any) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate High-Level Totals for KPIs
  const totalEmployees = staff.length;
  const totalOvertimeMonth = Math.round(staff.reduce((acc: number, s: any) => acc + (s.totalOvertimeHours || 0), 0) * 10) / 10;
  const totalProductiveHours = Math.round(staff.reduce((acc: number, s: any) => acc + (s.totalProductiveHours || 0), 0) * 10) / 10;
  const avgAttendanceRate = totalEmployees > 0
    ? Math.round((staff.reduce((acc: number, s: any) => acc + (s.attendancePercentage || 0), 0) / totalEmployees) * 10) / 10
    : 0;

  // Department Aggregation for Bar Chart
  const deptMap = new Map<string, { present: number; absent: number; overtime: number; count: number }>();
  staff.forEach((s: any) => {
    const d = s.department || 'General';
    if (!deptMap.has(d)) {
      deptMap.set(d, { present: 0, absent: 0, overtime: 0, count: 0 });
    }
    const item = deptMap.get(d)!;
    item.present += s.presentDays;
    item.absent += s.absentDays;
    item.overtime += s.totalOvertimeHours;
    item.count += 1;
  });

  const departmentChartData = Array.from(deptMap.entries()).map(([dept, val]) => ({
    department: dept,
    presentDays: Math.round(val.present / (val.count || 1)),
    absentDays: Math.round(val.absent / (val.count || 1)),
    avgOvertime: Math.round((val.overtime / (val.count || 1)) * 10) / 10,
  }));

  // Top Overtime Leaderboard (Top 5)
  const topOvertime = [...staff]
    .sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours)
    .filter((s) => s.totalOvertimeHours > 0)
    .slice(0, 5);

  const handleExportCsv = () => {
    if (!filteredStaff.length) return;
    const headers = [
      'Employee Name',
      'Email',
      'Department',
      'Designation',
      'Days In Month',
      'Present Days',
      'Absent Days',
      'Approved Leaves',
      'Late Arrivals',
      'Total Overtime Hours',
      'Net Productive Hours',
      'Total Paid / Payable Days',
      'Attendance %',
    ];

    const rows = filteredStaff.map((s: any) => [
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.department}"`,
      `"${s.designation}"`,
      `"${s.totalDays}"`,
      `"${s.presentDays}"`,
      `"${s.absentDays}"`,
      `"${s.leaveDays}"`,
      `"${s.lateDays}"`,
      `"${s.totalOvertimeHours}"`,
      `"${s.totalProductiveHours}"`,
      `"${s.paidDays}"`,
      `"${s.attendancePercentage}%"`,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const uri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `muster_roll_payroll_${monthNames[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with Month & Department Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Monthly Attendance & Payroll Muster Roll
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Salary-ready attendance summary, departmental punctuality trends, and overtime distribution.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month / Year Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950/90 border border-slate-800 rounded-xl p-1 text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-semibold outline-none px-2 py-1 cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-semibold outline-none px-2 py-1 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleExportCsv}
            disabled={!filteredStaff.length}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-3.5 rounded-xl font-bold shadow-lg shadow-emerald-600/30 gap-1.5"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-slate-700 bg-slate-800/80 text-slate-200 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print Report</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Total Staff Analyzed</span>
          <div className="text-2xl font-black text-white mt-1">{totalEmployees}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active employees</span>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-emerald-400 block">Avg Attendance Rate</span>
          <div className="text-2xl font-black text-emerald-300 mt-1">{avgAttendanceRate}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Across all departments</span>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-amber-400 block">Total Overtime Clocked</span>
          <div className="text-2xl font-black text-amber-300 mt-1">{totalOvertimeMonth}h</div>
          <span className="text-[11px] text-amber-400/70 mt-1 block">Extra payable OT</span>
        </div>

        <div className="bg-slate-900/80 border border-cyan-500/20 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-cyan-400 block">Net Productive Hours</span>
          <div className="text-2xl font-black text-cyan-300 mt-1">{totalProductiveHours}h</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Excluding breaks</span>
        </div>
      </div>

      {/* Visual Charts: Department Comparison & Overtime Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Attendance Comparison Chart */}
        <Card className="lg:col-span-2 bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-400" />
              <span>Departmental Attendance & Overtime Averages</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="presentDays" name="Avg Present Days" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgOvertime" name="Avg OT Hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Overtime Contributors Leaderboard */}
        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={16} className="text-amber-400" />
              <span>Top Overtime Contributors</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {topOvertime.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <span>No overtime clocked for this month</span>
              </div>
            ) : (
              <div className="space-y-3">
                {topOvertime.map((top, idx) => (
                  <div
                    key={top.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">{top.name}</span>
                        <span className="text-[10px] text-slate-400">{top.department}</span>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold text-xs">
                      +{top.totalOvertimeHours}h OT
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SALARY / PAYROLL-READY MUSTER ROLL TABLE */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
        <CardHeader className="border-b border-slate-800/80 pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <span>Monthly Staff Muster Roll Breakdown</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Detailed attendance records, payable days, and net productive hours for payroll calculation.
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter staff by name or dept..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Compiling monthly muster roll...</span>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <p className="text-sm font-semibold">No staff records found for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 sticky left-0 bg-slate-950">Employee</th>
                    <th className="p-3.5">Dept / Designation</th>
                    <th className="p-3.5 text-center">Days</th>
                    <th className="p-3.5 text-center text-emerald-400 font-bold">Present</th>
                    <th className="p-3.5 text-center text-rose-400">Absent</th>
                    <th className="p-3.5 text-center text-blue-400">Leaves</th>
                    <th className="p-3.5 text-center text-amber-400">Late Count</th>
                    <th className="p-3.5 text-right text-amber-300 font-bold">Overtime (+OT)</th>
                    <th className="p-3.5 text-right text-cyan-300">Productive Hrs</th>
                    <th className="p-3.5 text-center font-extrabold text-white bg-slate-800/40">Payable Days</th>
                    <th className="p-3.5 text-right font-bold text-emerald-300">Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredStaff.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-bold text-white sticky left-0 bg-slate-900/90">
                        {s.name}
                        <span className="text-[10px] text-slate-500 block font-normal">{s.email}</span>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <span className="font-semibold">{s.department}</span>
                        <span className="text-[10px] text-slate-500 block">{s.designation}</span>
                      </td>
                      <td className="p-3.5 text-center text-slate-400">{s.totalDays}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400">{s.presentDays}</td>
                      <td className="p-3.5 text-center font-semibold text-rose-400">{s.absentDays}</td>
                      <td className="p-3.5 text-center text-blue-400">{s.leaveDays}</td>
                      <td className="p-3.5 text-center text-amber-400">{s.lateDays > 0 ? s.lateDays : '-'}</td>
                      <td className="p-3.5 text-right font-bold text-amber-400">
                        {s.totalOvertimeHours > 0 ? `+${s.totalOvertimeHours}h` : '-'}
                      </td>
                      <td className="p-3.5 text-right text-cyan-300 font-mono">{s.totalProductiveHours}h</td>
                      <td className="p-3.5 text-center font-extrabold text-white bg-slate-800/40 text-sm">
                        {s.paidDays}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-300">
                        {s.attendancePercentage}%
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
