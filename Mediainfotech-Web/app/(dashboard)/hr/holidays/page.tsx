'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';

export default function HolidaysPage() {
  const { hasPermission } = useAuth();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month & Year state for interactive calendar grid
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed: 0 = Jan, 11 = Dec

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    date: '',
    type: 'NATIONAL',
    description: '',
    isMandatory: true,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHolidays();
    fetchUpcoming();
  }, [currentYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/holidays?year=${currentYear}`);
      setHolidays(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/api/holidays/upcoming');
      setUpcoming(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Calendar Grid Calculations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  // Create grid cells (42 cells = 6 rows x 7 columns)
  const calendarCells = [];

  // 1. Padding days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  // 2. Days of current month
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const monthFormatted = String(currentMonth + 1).padStart(2, '0');
    const dayFormatted = String(d).padStart(2, '0');
    const dateStr = `${currentYear}-${monthFormatted}-${dayFormatted}`;

    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr,
      isToday:
        d === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear(),
    });
  }

  // 3. Padding days for next month
  const remainingCells = 42 - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  // Map holidays by YYYY-MM-DD string
  const holidaysByDate: Record<string, any[]> = {};
  holidays.forEach((h) => {
    if (h.date) {
      const dStr = new Date(h.date).toISOString().split('T')[0];
      if (!holidaysByDate[dStr]) holidaysByDate[dStr] = [];
      holidaysByDate[dStr].push(h);
    }
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const openAddModalForDate = (dateStr?: string) => {
    setEditingHoliday(null);
    setForm({
      name: '',
      date: dateStr || new Date().toISOString().split('T')[0],
      type: 'COMPANY',
      description: '',
      isMandatory: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (h: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHoliday(h);
    setForm({
      name: h.name || '',
      date: h.date ? new Date(h.date).toISOString().split('T')[0] : '',
      type: h.type || 'NATIONAL',
      description: h.description || '',
      isMandatory: h.isMandatory !== undefined ? h.isMandatory : true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingHoliday) {
        await api.put(`/api/holidays/${editingHoliday.id}`, form);
      } else {
        await api.post('/api/holidays', form);
      }
      setModalOpen(false);
      fetchHolidays();
      fetchUpcoming();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await api.delete(`/api/holidays/${id}`);
      fetchHolidays();
      fetchUpcoming();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete holiday');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-3">
            <CalendarIcon className="text-blue-400" size={28} />
            <span>Holiday Calendar</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Interactive monthly calendar view for national, gazetted, and company holidays.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Today
          </button>

          {hasPermission('holidays', 'create') && (
            <button
              onClick={() => openAddModalForDate()}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Interactive Monthly Calendar Grid */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          {/* Calendar Month Navigation Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-extrabold text-white">
                {monthNames[currentMonth]} <span className="text-blue-400 font-mono">{currentYear}</span>
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                title="Previous Month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
                title="Next Month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-800/60 pb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div
                key={day}
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 7-Column Monthly Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 min-h-[520px]">
            {calendarCells.map((cell, idx) => {
              const dayHolidays = cell.dateStr ? holidaysByDate[cell.dateStr] || [] : [];

              return (
                <div
                  key={idx}
                  onClick={() => cell.isCurrentMonth && openAddModalForDate(cell.dateStr)}
                  className={`min-h-[90px] p-2 rounded-2xl border transition flex flex-col justify-between group ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-950/30 border-slate-900/60 opacity-30 cursor-not-allowed'
                      : cell.isToday
                      ? 'bg-blue-600/10 border-blue-500/50 shadow-inner'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-blue-500/40 cursor-pointer'
                  }`}
                >
                  {/* Date Number Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg ${
                        cell.isToday
                          ? 'bg-blue-600 text-white shadow-md'
                          : cell.isCurrentMonth
                          ? 'text-slate-300 group-hover:text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {cell.isCurrentMonth && hasPermission('holidays', 'create') && (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 font-bold">
                        + Add
                      </span>
                    )}
                  </div>

                  {/* Holiday Badges for Date */}
                  <div className="space-y-1 my-1 overflow-y-auto max-h-[65px]">
                    {dayHolidays.map((h) => {
                      const badgeBg =
                        h.type === 'NATIONAL'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : h.type === 'COMPANY'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : h.type === 'REGIONAL'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <div
                          key={h.id}
                          onClick={(e) => openEditModal(h, e)}
                          className={`p-1.5 rounded-xl border text-[10px] font-semibold leading-tight flex items-center justify-between hover:scale-105 transition shadow-sm ${badgeBg}`}
                          title={`${h.name} (${h.type}) - Click to edit`}
                        >
                          <span className="truncate pr-1">{h.name}</span>
                          {hasPermission('holidays', 'delete') && (
                            <button
                              onClick={(e) => handleDelete(h.id, e)}
                              className="text-slate-400 hover:text-red-400 p-0.5"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Color Legend */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 font-semibold">Calendar Legend:</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1 text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>National Holiday</span>
              </span>
              <span className="flex items-center space-x-1 text-blue-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Company Holiday</span>
              </span>
              <span className="flex items-center space-x-1 text-purple-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Regional Holiday</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Optional Leave</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Upcoming Holidays & Roster Panel */}
        <div className="space-y-5">
          {/* Upcoming Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <h2 className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles size={16} />
              <span>Upcoming Observances</span>
            </h2>

            <div className="space-y-3">
              {upcoming.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 text-center">No upcoming holidays scheduled.</div>
              ) : (
                upcoming.map((u) => {
                  const uDate = new Date(u.date);
                  const dayNum = uDate.getDate();
                  const monthStr = uDate.toLocaleString('default', { month: 'short' });
                  const dayStr = uDate.toLocaleString('default', { weekday: 'short' });

                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/40 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black font-mono text-white">
                          {dayNum} <span className="text-xs font-semibold text-slate-400 uppercase">{monthStr}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase">
                          {dayStr}
                        </span>
                      </div>

                      <p className="font-bold text-white text-xs">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.description || 'Mandatory holiday.'}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-3xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-2 text-slate-300">
            <div className="flex items-center space-x-2 text-blue-400 font-bold">
              <Info size={16} />
              <span>Calendar Info</span>
            </div>
            <p className="leading-relaxed">
              Click on any date box in the monthly calendar grid to add a custom company holiday or edit existing national holidays.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingHoliday ? 'Edit Holiday Details' : 'Add New Holiday'}
        icon={<CalendarIcon size={20} className="text-blue-400" />}
      >
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Holiday Name / Title">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Independence Day / Annual Day"
                  className={inputClassName}
                  required
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Holiday Date">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={inputClassName}
                    required
                  />
                </FormField>

                <FormField label="Holiday Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={inputClassName}
                  >
                    <option value="NATIONAL">National (India)</option>
                    <option value="COMPANY">Company Holiday</option>
                    <option value="REGIONAL">Regional Festival</option>
                    <option value="OPTIONAL">Optional Leave</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Description / Observance Details">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Details regarding holiday..."
                  className={textareaClassName}
                />
              </FormField>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={form.isMandatory}
                  onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="isMandatory" className="text-xs text-slate-300 cursor-pointer">
                  Mandatory Paid Holiday for all employees
                </label>
              </div>

              <ModalFooter
                onClose={() => setModalOpen(false)}
                submitLabel={submitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Save to Calendar'}
                submitting={submitting}
              />
            </form>
      </Modal>
    </div>
  );
}
