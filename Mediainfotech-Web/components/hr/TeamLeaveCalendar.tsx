'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  HeartPulse,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export function TeamLeaveCalendar() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  useEffect(() => {
    fetchCalendarLeaves();
  }, [currentMonth, currentYear]);

  const fetchCalendarLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/api/leave/team-calendar?month=${currentMonth}&year=${currentYear}`
      );
      setLeaves(res.data.data || []);
    } catch (e) {
      console.error(e);
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

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday

  // Helper to find leaves active on a specific day
  const getLeavesForDay = (day: number) => {
    const checkDate = new Date(currentYear, currentMonth - 1, day);
    checkDate.setHours(0, 0, 0, 0);

    return leaves.filter((l) => {
      const start = new Date(l.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(l.endDate);
      end.setHours(23, 59, 59, 999);
      return checkDate >= start && checkDate <= end;
    });
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'CASUAL':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'SICK':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'EARNED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'COMPENSATORY':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {monthNames[currentMonth - 1]} {currentYear}
            </h3>
            <p className="text-xs text-slate-400">
              Team Out-of-Office schedule & planned leaves
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] mr-3">
            <span className="flex items-center gap-1 text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Casual
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Sick
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Earned
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Comp Off
            </span>
          </div>

          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                setCurrentMonth(today.getMonth() + 1);
                setCurrentYear(today.getFullYear());
              }}
              className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-950/80 border-b border-slate-800 text-center py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-950/40">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[100px] p-2 bg-slate-950/20 border-b border-r border-slate-800/60" />
          ))}

          {/* Days in current month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNumber = idx + 1;
            const dayLeaves = getLeavesForDay(dayNumber);
            const isToday =
              dayNumber === today.getDate() &&
              currentMonth === today.getMonth() + 1 &&
              currentYear === today.getFullYear();

            return (
              <div
                key={`day-${dayNumber}`}
                className={`min-h-[110px] p-2 border-b border-r border-slate-800/60 transition flex flex-col justify-between ${
                  isToday ? 'bg-blue-600/5' : 'hover:bg-slate-850/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white font-mono shadow-md shadow-blue-600/30'
                        : 'text-slate-400'
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {dayLeaves.length > 0 && (
                    <span className="text-[10px] text-amber-400 font-bold font-mono">
                      {dayLeaves.length} away
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1.5 overflow-y-auto max-h-24">
                  {dayLeaves.map((l) => (
                    <div
                      key={l.id}
                      className={`p-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 truncate ${getBadgeStyle(
                        l.type
                      )}`}
                      title={`${l.user.firstName} ${l.user.lastName} on ${l.type} leave (${l.reason})`}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {l.user.firstName?.[0]}
                      </div>
                      <span className="truncate">
                        {l.user.firstName} {l.user.lastName?.[0]}.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
