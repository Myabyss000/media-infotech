'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Eye,
  BarChart3,
  CalendarDays,
  ListFilter,
  Download,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatDate } from '@/lib/utils';
import { EmployeeHoursChart } from './EmployeeHoursChart';
import { AttendanceMonthlyCalendar } from './AttendanceMonthlyCalendar';

interface PersonalAttendanceHistoryProps {
  onOpenRegularizationForDate?: (date: string) => void;
}

export function PersonalAttendanceHistory({ onOpenRegularizationForDate }: PersonalAttendanceHistoryProps) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'calendar' | 'table'>('chart');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'PAST_30' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [punctualityFilter, setPunctualityFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/attendance/my-history');
      setHistory(res.data.history || res.data.data || res.data.records || []);
    } catch (e) {
      console.error('Fetch history error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((rec) => {
    if (filterStatus !== 'ALL' && rec.status !== filterStatus) return false;
    if (punctualityFilter === 'ON_TIME' && rec.isLate) return false;
    if (punctualityFilter === 'LATE' && !rec.isLate) return false;
    if (punctualityFilter === 'EARLY_EXIT' && !rec.isEarlyExit) return false;

    if (datePreset !== 'ALL') {
      let recordDateStr = '';
      if (rec.checkInTime) {
        const d = new Date(rec.checkInTime);
        recordDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (rec.date) {
        const str = typeof rec.date === 'string' ? rec.date : new Date(rec.date).toISOString();
        recordDateStr = str.split('T')[0];
      }

      const now = new Date();
      if (datePreset === 'THIS_MONTH') {
        const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        if (recordDateStr < firstDayStr) return false;
      } else if (datePreset === 'PAST_30') {
        const past30 = new Date(now);
        past30.setDate(past30.getDate() - 30);
        const past30Str = `${past30.getFullYear()}-${String(past30.getMonth() + 1).padStart(2, '0')}-${String(past30.getDate()).padStart(2, '0')}`;
        if (recordDateStr < past30Str) return false;
      } else if (datePreset === 'CUSTOM') {
        if (customStartDate && recordDateStr < customStartDate) return false;
        if (customEndDate && recordDateStr > customEndDate) return false;
      }
    }

    return true;
  });

  const handleExportCsv = () => {
    if (filteredHistory.length === 0) {
      alert('No attendance records to export.');
      return;
    }
    const headers = ['Date', 'Check-In', 'Check-Out', 'Total Hours', 'Productive Hours', 'Overtime', 'Punctuality', 'Status', 'Notes'];
    const rows = filteredHistory.map((r) => [
      `"${r.date ? new Date(r.date).toISOString().split('T')[0] : ''}"`,
      `"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : ''}"`,
      `"${r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : 'Active'}"`,
      `"${r.totalHours || 0}"`,
      `"${r.productiveHours || r.totalHours || 0}"`,
      `"${r.overtimeHours || 0}"`,
      `"${r.isLate ? `Late (+${r.lateMinutes || 0}m)` : 'On Time'}"`,
      `"${r.status}"`,
      `"${(r.checkInNote || r.checkOutNote || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `my_attendance_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal View Mode:</span>
        </div>

        <div className="inline-flex bg-slate-950/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('chart')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'chart'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={14} />
            <span>Work Hours vs Extra Hours Chart</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays size={14} />
            <span>Monthly Muster Calendar</span>
          </button>

          <button
            onClick={() => setActiveSubTab('table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'table'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter size={14} />
            <span>Detailed Punch Log</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DEDICATED WORK HOURS VS EXTRA HOURS CHART */}
      {activeSubTab === 'chart' && (
        <EmployeeHoursChart
          initialUserId={user?.id}
          showUserSelector={false}
          title="My Daily Work Hours & Overtime Analytics"
          subtitle="Visualize your standard scheduled hours, extra overtime hours clocked, and break logs."
        />
      )}

      {/* VIEW 2: MONTHLY MUSTER CALENDAR */}
      {activeSubTab === 'calendar' && (
        <AttendanceMonthlyCalendar
          userId={user?.id}
          onOpenRegularizeForDate={onOpenRegularizationForDate}
        />
      )}

      {/* VIEW 3: DETAILED PUNCH LOG TABLE */}
      {activeSubTab === 'table' && (
        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-blue-400" />
                  <span>My Attendance Punch Logs</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Comprehensive history of your daily check-in, check-out, and verification timestamps.
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleExportCsv}
                  disabled={filteredHistory.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 h-8"
                >
                  <Download size={14} className="mr-1.5 text-blue-400" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="PENDING">Pending Review</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={punctualityFilter}
                onChange={(e) => setPunctualityFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Punctuality</option>
                <option value="ON_TIME">On Time Arrivals</option>
                <option value="LATE">Late Arrivals Only</option>
                <option value="EARLY_EXIT">Early Departures Only</option>
              </select>

              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Recorded Dates</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="PAST_30">Past 30 Days</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading punch history...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Calendar size={36} className="text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No attendance records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Check-In</th>
                      <th className="p-3.5">Check-Out</th>
                      <th className="p-3.5 text-right">Productive Hrs</th>
                      <th className="p-3.5 text-right text-amber-400">Extra (OT)</th>
                      <th className="p-3.5">Punctuality</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {formatDate(rec.date)}
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">
                          {rec.checkInTime ? formatDateTime(rec.checkInTime) : '-'}
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono">
                          {rec.checkOutTime ? formatDateTime(rec.checkOutTime) : <span className="text-emerald-400 font-bold">Active</span>}
                        </td>
                        <td className="p-3.5 text-right font-extrabold text-emerald-300">
                          {rec.productiveHours || rec.totalHours || 0}h
                        </td>
                        <td className="p-3.5 text-right font-bold text-amber-400">
                          {rec.overtimeHours > 0 ? `+${rec.overtimeHours}h` : '-'}
                        </td>
                        <td className="p-3.5">
                          {rec.isLate ? (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                              Late (+{rec.lateMinutes}m)
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                              On Time
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5">
                          <Badge variant={getStatusBadgeVariant(rec.status)}>
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            onClick={() => setSelectedRecord(rec)}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Eye size={13} className="mr-1" />
                            <span>View</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={`Attendance Record • ${formatDate(selectedRecord.date)}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-slate-300 py-2">
            {selectedRecord.checkInPhoto && (
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src={
                    selectedRecord.checkInPhoto.startsWith('/')
                      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${selectedRecord.checkInPhoto}`
                      : selectedRecord.checkInPhoto
                  }
                  alt="Check in photo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge variant={getStatusBadgeVariant(selectedRecord.status)}>
                  {selectedRecord.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Check-In Time:</span>
                <span className="font-semibold text-white">{formatDateTime(selectedRecord.checkInTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Check-Out Time:</span>
                <span className="font-semibold text-white">
                  {selectedRecord.checkOutTime ? formatDateTime(selectedRecord.checkOutTime) : 'Active'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Productive Work:</span>
                <span className="font-bold text-emerald-400">{selectedRecord.productiveHours || selectedRecord.totalHours || 0} hrs</span>
              </div>
              {selectedRecord.overtimeHours > 0 && (
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span>Extra Overtime (+OT):</span>
                  <span>+{selectedRecord.overtimeHours} hrs</span>
                </div>
              )}
              {selectedRecord.checkInNote && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1">Notes / Logs:</span>
                  <p className="p-2 rounded-lg bg-slate-900 text-slate-200">{selectedRecord.checkInNote}</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
