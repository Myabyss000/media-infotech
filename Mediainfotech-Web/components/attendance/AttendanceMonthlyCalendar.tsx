'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Zap,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Building,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatDate } from '@/lib/utils';

interface AttendanceMonthlyCalendarProps {
  userId?: string;
  onOpenRegularizeForDate?: (date: string) => void;
}

export function AttendanceMonthlyCalendar({ userId, onOpenRegularizeForDate }: AttendanceMonthlyCalendarProps) {
  const { user: authUser } = useAuth();
  const targetUserId = userId || authUser?.id;

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  useEffect(() => {
    if (targetUserId) {
      fetchMonthlyMatrix();
    }
  }, [targetUserId, currentMonth, currentYear]);

  const fetchMonthlyMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/attendance/monthly-matrix?userId=${targetUserId}&month=${currentMonth}&year=${currentYear}`);
      setMatrixData(res.data);
    } catch (e) {
      console.error('Fetch monthly matrix error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const summary = matrixData?.summary;
  const matrix = matrixData?.matrix || [];

  // Calculate day offset for Sunday start
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sunday

  const handleDayClick = (dayItem: any) => {
    setSelectedDay(dayItem);
    setDayModalOpen(true);
  };

  const getStatusTileStyle = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20';
      case 'LATE':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25';
      case 'ABSENT':
        return 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25';
      case 'HOLIDAY':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25';
      case 'LEAVE':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25';
      case 'WEEKEND':
        return 'bg-slate-950/60 border-slate-800 text-slate-500 hover:bg-slate-800/40';
      default:
        return 'bg-slate-900/40 border-slate-800/60 text-slate-500 hover:bg-slate-800/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Navigator & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{monthNames[currentMonth - 1]} {currentYear}</span>
              <span className="text-xs text-slate-400 font-normal">Monthly Muster Grid</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click on any day to view timestamps, breaks, overtime, and punch logs.
            </p>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleJumpToToday}
            variant="outline"
            size="sm"
            className="text-xs h-8 px-3 rounded-xl border-slate-700 bg-slate-800/80 text-slate-300"
          >
            Today
          </Button>
          <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Working Days</span>
            <div className="text-lg font-bold text-white mt-0.5">{summary.totalWorkingDays}</div>
          </div>
          <div className="bg-slate-900/80 border border-emerald-500/20 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 block">Days Present</span>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">{summary.presentCount}</div>
          </div>
          <div className="bg-slate-900/80 border border-amber-500/20 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-400 block">Late Arrivals</span>
            <div className="text-lg font-bold text-amber-300 mt-0.5">{summary.lateCount}</div>
          </div>
          <div className="bg-slate-900/80 border border-rose-500/20 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-400 block">Days Absent</span>
            <div className="text-lg font-bold text-rose-300 mt-0.5">{summary.absentCount}</div>
          </div>
          <div className="bg-slate-900/80 border border-blue-500/20 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-400 block">Approved Leaves</span>
            <div className="text-lg font-bold text-blue-300 mt-0.5">{summary.leaveCount}</div>
          </div>
          <div className="bg-slate-900/80 border border-cyan-500/20 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400 block">Overtime Total</span>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">{summary.totalOvertimeHours}h</div>
          </div>
          <div className="bg-slate-900/80 border border-indigo-500/20 p-3 rounded-xl">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400 block">Attendance Rate</span>
            <div className="text-lg font-bold text-indigo-300 mt-0.5">{summary.attendancePercentage}%</div>
          </div>
        </div>
      )}

      {/* Visual Color Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <span className="text-slate-400 font-medium mr-1">Legend:</span>
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Late Entry</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-400 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-400 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Leave</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
          <span>Weekend Off</span>
        </div>
      </div>

      {/* 7-Day Matrix Grid */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
        <CardContent className="p-3 sm:p-5">
          {loading ? (
            <div className="h-80 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading monthly calendar matrix...</span>
            </div>
          ) : (
            <div>
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Tiles */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {/* Empty offset tiles for start of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-xl bg-slate-950/20 border border-slate-900/40 opacity-40 pointer-events-none" />
                ))}

                {matrix.map((dayItem: any) => {
                  const isToday =
                    dayItem.day === now.getDate() &&
                    currentMonth === now.getMonth() + 1 &&
                    currentYear === now.getFullYear();

                  return (
                    <button
                      key={dayItem.date}
                      onClick={() => handleDayClick(dayItem)}
                      className={`aspect-square sm:aspect-auto sm:min-h-[84px] p-2 rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between text-left group relative cursor-pointer ${getStatusTileStyle(dayItem.status)} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 font-bold' : ''}`}
                    >
                      {/* Top Header: Day number + Today Tag */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs sm:text-sm font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>
                          {dayItem.day}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white hidden sm:inline">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Middle Badge / Label (for Desktop view) */}
                      <div className="hidden sm:block my-1">
                        <span className="text-[11px] font-semibold block truncate">
                          {dayItem.status === 'PRESENT'
                            ? 'Present'
                            : dayItem.status === 'LATE'
                            ? 'Late Entry'
                            : dayItem.status === 'HOLIDAY'
                            ? (dayItem.details?.holidayName || 'Holiday')
                            : dayItem.status === 'LEAVE'
                            ? (dayItem.details?.leaveType || 'Leave')
                            : dayItem.status === 'ABSENT'
                            ? 'Absent'
                            : dayItem.status === 'WEEKEND'
                            ? 'Off-Day'
                            : '-'}
                        </span>
                        {dayItem.details?.productiveHours ? (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {dayItem.details.productiveHours}h clocked
                          </span>
                        ) : null}
                      </div>

                      {/* Bottom Status Dot indicator (for Mobile view) */}
                      <div className="sm:hidden flex items-center justify-center">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            dayItem.status === 'PRESENT'
                              ? 'bg-emerald-400'
                              : dayItem.status === 'LATE'
                              ? 'bg-amber-400'
                              : dayItem.status === 'ABSENT'
                              ? 'bg-rose-400'
                              : dayItem.status === 'LEAVE'
                              ? 'bg-blue-400'
                              : dayItem.status === 'HOLIDAY'
                              ? 'bg-cyan-400'
                              : 'bg-slate-700'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Details Inspection Modal */}
      <Modal
        isOpen={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={`Attendance Details • ${selectedDay?.date || ''}`}
        maxWidth="max-w-md"
      >
        {selectedDay && (
          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-sm font-bold text-white block">
                  {selectedDay.fullDayName}, {selectedDay.date}
                </span>
                <span className="text-slate-400 text-xs">
                  {selectedDay.isWorkingDay ? 'Scheduled Workday' : 'Scheduled Off / Weekend'}
                </span>
              </div>
              <Badge
                className={
                  selectedDay.status === 'PRESENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : selectedDay.status === 'LATE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : selectedDay.status === 'HOLIDAY'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : selectedDay.status === 'LEAVE'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }
              >
                {selectedDay.status}
              </Badge>
            </div>

            {/* Attendance Punch Timestamps */}
            {selectedDay.details ? (
              <div className="space-y-3">
                {selectedDay.details.checkIn && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Clock In:</span>
                      <span className="font-bold text-white text-sm">
                        {new Date(selectedDay.details.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Clock Out:</span>
                      <span className="font-bold text-white text-sm">
                        {selectedDay.details.checkOut
                          ? new Date(selectedDay.details.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'In Progress'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hours Breakdown */}
                {selectedDay.details.productiveHours !== undefined && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Clocked Time:</span>
                      <span className="font-mono font-semibold">{selectedDay.details.totalHours || 0} hrs</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Net Productive Work:</span>
                      <span className="font-mono">{selectedDay.details.productiveHours || 0} hrs</span>
                    </div>
                    {selectedDay.details.overtimeHours > 0 && (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Extra Overtime (+OT):</span>
                        <span className="font-mono">+{selectedDay.details.overtimeHours} hrs</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Late & Punctuality Notes */}
                {selectedDay.details.isLate && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-400 shrink-0" />
                    <span>Late Arrival (+{selectedDay.details.lateMinutes} mins after scheduled start)</span>
                  </div>
                )}

                {/* Holiday / Leave Details */}
                {selectedDay.details.holidayName && (
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                    <span className="font-bold block">Company Holiday:</span>
                    <span>{selectedDay.details.holidayName}</span>
                  </div>
                )}
                {selectedDay.details.leaveType && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                    <span className="font-bold block">Approved {selectedDay.details.leaveType} Leave:</span>
                    <span className="text-slate-300">{selectedDay.details.reason}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400">
                {selectedDay.status === 'ABSENT' ? (
                  <div className="space-y-2">
                    <p className="text-rose-400 font-semibold">Marked Absent for this date.</p>
                    <p className="text-slate-400 text-[11px]">
                      Did you work or attend off-site duty on this day? You can apply for attendance regularization.
                    </p>
                    {onOpenRegularizeForDate && (
                      <Button
                        onClick={() => {
                          setDayModalOpen(false);
                          onOpenRegularizeForDate(selectedDay.date);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 mt-1"
                      >
                        <Sparkles size={12} className="mr-1.5" />
                        <span>Apply for Regularization</span>
                      </Button>
                    )}
                  </div>
                ) : selectedDay.status === 'WEEKEND' ? (
                  <p>Scheduled weekly off / non-working day.</p>
                ) : (
                  <p>Upcoming calendar date.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
