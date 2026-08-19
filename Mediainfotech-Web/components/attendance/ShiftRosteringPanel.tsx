'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Clock,
  Calendar,
  Users,
  Repeat,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ArrowRightLeft,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';

export function ShiftRosteringPanel() {
  const { user, hasRole, hasPermission } = useAuth();
  const isAdminOrHR = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('attendance', 'create');

  const [activeTab, setActiveTab] = useState<'roster' | 'shifts_master' | 'swaps'>('roster');
  const [shifts, setShifts] = useState<any[]>([]);
  const [rosterData, setRosterData] = useState<any>(null);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range for Roster View
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Shift Modal State (Create / Edit)
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    startTime: '09:30',
    endTime: '18:30',
    gracePeriod: '15',
    color: '#3b82f6',
    description: '',
  });

  // Assign Shift Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userIds: [] as string[],
    shiftId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Shift Swap Modal State
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapForm, setSwapForm] = useState({
    targetUserId: '',
    date: new Date().toISOString().split('T')[0],
    fromShiftId: '',
    toShiftId: '',
    reason: '',
  });

  useEffect(() => {
    fetchShifts();
    if (activeTab === 'roster') fetchRoster();
    if (activeTab === 'swaps') fetchSwaps();
  }, [activeTab, startDate, endDate]);

  const fetchShifts = async () => {
    try {
      const res = await api.get('/api/attendance/shifts');
      setShifts(res.data.data || []);
    } catch (e) {
      console.error('Fetch shifts error:', e);
    }
  };

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/attendance/shifts/roster?startDate=${startDate}&endDate=${endDate}`);
      setRosterData(res.data);
    } catch (e) {
      console.error('Fetch roster error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const res = await api.get(isAdminOrHR ? '/api/attendance/shifts/swap/pending' : '/api/attendance/shifts/swap/my-requests');
      setSwaps(res.data.data || []);
    } catch (e) {
      console.error('Fetch swaps error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShift) {
        await api.put(`/api/attendance/shifts/${editingShift.id}`, shiftForm);
      } else {
        await api.post('/api/attendance/shifts', shiftForm);
      }
      setShiftModalOpen(false);
      fetchShifts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save shift');
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.shiftId || assignForm.userIds.length === 0) {
      alert('Please select a shift and at least one user');
      return;
    }

    // Generate date range array
    const dates: string[] = [];
    const cur = new Date(assignForm.startDate);
    const end = new Date(assignForm.endDate);
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    try {
      await api.post('/api/attendance/shifts/assign', {
        userIds: assignForm.userIds,
        shiftId: assignForm.shiftId,
        dates,
      });
      setAssignModalOpen(false);
      fetchRoster();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign shift');
    }
  };

  const handleCreateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/attendance/shifts/swap/request', swapForm);
      setSwapModalOpen(false);
      fetchSwaps();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit shift swap request');
    }
  };

  const handleReviewSwap = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/api/attendance/shifts/swap/${id}/review`, { status });
      fetchSwaps();
      if (activeTab === 'roster') fetchRoster();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to review swap');
    }
  };

  // Generate date columns for roster table
  const getRosterDates = () => {
    const dates: { dateStr: string; dayName: string; dayNum: number }[] = [];
    const cur = new Date(startDate);
    const end = new Date(endDate);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    while (cur <= end) {
      dates.push({
        dateStr: cur.toISOString().split('T')[0],
        dayName: days[cur.getDay()],
        dayNum: cur.getDate(),
      });
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const rosterDates = getRosterDates();

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Shift Rostering & Shift Management
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure rotating shift templates, assign team weekly schedules, and process shift swaps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'roster'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Team Schedule
            </button>
            <button
              onClick={() => setActiveTab('swaps')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'swaps'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Shift Swaps
            </button>
            {isAdminOrHR && (
              <button
                onClick={() => setActiveTab('shifts_master')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'shifts_master'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Shift Templates
              </button>
            )}
          </div>

          {isAdminOrHR && activeTab === 'roster' && (
            <Button
              onClick={() => setAssignModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 px-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/30 gap-1.5"
            >
              <Plus size={15} />
              <span>Assign Shift</span>
            </Button>
          )}

          {activeTab === 'swaps' && (
            <Button
              onClick={() => setSwapModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-9 px-3.5 rounded-xl font-bold shadow-lg shadow-purple-600/30 gap-1.5"
            >
              <ArrowRightLeft size={14} />
              <span>Request Swap</span>
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: TEAM ROSTER SCHEDULE GRID */}
      {activeTab === 'roster' && (
        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                <span>Team Shift Schedule Grid</span>
              </CardTitle>

              {/* Shift Legend Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5"
                    style={{
                      backgroundColor: `${s.color}15`,
                      borderColor: `${s.color}40`,
                      color: s.color,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>
                      {s.name} ({s.startTime} - {s.endTime})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading roster schedule...</span>
              </div>
            ) : !rosterData?.users?.length ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <p className="text-sm font-semibold">No employees found for this roster view.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 sticky left-0 bg-slate-950 z-10 min-w-[180px]">Employee</th>
                      {rosterDates.map((d) => (
                        <th key={d.dateStr} className="p-2.5 text-center min-w-[90px] border-l border-slate-800/80">
                          <div className="text-slate-300 font-bold">{d.dayName}</div>
                          <div className="text-[10px] text-slate-500">{d.dayNum}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {rosterData.users.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 text-[10px] font-bold flex items-center justify-center">
                              {emp.firstName?.[0]}
                            </div>
                            <span className="text-white font-semibold truncate">
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </td>

                        {rosterDates.map((d) => {
                          // Find assigned shift for this user and date
                          const specific = rosterData.schedules?.find(
                            (s: any) => s.userId === emp.id && s.date.startsWith(d.dateStr)
                          );
                          const activeShift = specific?.shift || emp.assignedShift || shifts[0];

                          return (
                            <td key={d.dateStr} className="p-2 text-center border-l border-slate-800/60">
                              {activeShift ? (
                                <div
                                  className="py-1 px-1.5 rounded-lg text-[10px] font-bold border truncate"
                                  style={{
                                    backgroundColor: `${activeShift.color}15`,
                                    borderColor: `${activeShift.color}35`,
                                    color: activeShift.color,
                                  }}
                                  title={`${activeShift.name}: ${activeShift.startTime} - ${activeShift.endTime}`}
                                >
                                  {activeShift.code}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px]">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: SHIFT TEMPLATES MASTER */}
      {activeTab === 'shifts_master' && isAdminOrHR && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configured Shift Templates</h3>
            <Button
              onClick={() => {
                setEditingShift(null);
                setShiftForm({
                  name: '',
                  code: '',
                  startTime: '09:30',
                  endTime: '18:30',
                  gracePeriod: '15',
                  color: '#3b82f6',
                  description: '',
                });
                setShiftModalOpen(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3 rounded-xl gap-1"
            >
              <Plus size={14} />
              <span>Create Shift Template</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shifts.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden group hover:border-slate-700 transition"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: s.color }}
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="font-extrabold text-white text-base">{s.name}</span>
                  <Badge
                    className="font-mono text-xs font-bold"
                    style={{ backgroundColor: `${s.color}20`, color: s.color, borderColor: `${s.color}40` }}
                  >
                    {s.code}
                  </Badge>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timings:</span>
                    <span className="font-mono font-semibold text-white">
                      {s.startTime} → {s.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Late Grace:</span>
                    <span>{s.gracePeriod} mins</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setEditingShift(s);
                      setShiftForm({
                        name: s.name,
                        code: s.code,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        gracePeriod: s.gracePeriod.toString(),
                        color: s.color,
                        description: s.description || '',
                      });
                      setShiftModalOpen(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-slate-400 hover:text-white"
                  >
                    <Edit2 size={13} className="mr-1" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHIFT SWAP REQUESTS */}
      {activeTab === 'swaps' && (
        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-3.5">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-purple-400" />
              <span>Shift Swap Requests & Peer Swaps</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading shift swaps...</span>
              </div>
            ) : swaps.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Repeat size={36} className="text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No shift swap requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Requester</th>
                      <th className="p-3.5">Target Date</th>
                      <th className="p-3.5">From Shift → To Shift</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {swaps.map((sw) => (
                      <tr key={sw.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {sw.requester?.firstName} {sw.requester?.lastName}
                        </td>
                        <td className="p-3.5 text-slate-300">{formatDate(sw.date)}</td>
                        <td className="p-3.5 font-semibold">
                          <span className="text-amber-400">{sw.fromShift?.name}</span>
                          <span className="text-slate-500 mx-1.5">→</span>
                          <span className="text-emerald-400">{sw.toShift?.name}</span>
                        </td>
                        <td className="p-3.5 text-slate-300 text-[11px] max-w-xs">{sw.reason}</td>
                        <td className="p-3.5">
                          <Badge
                            className={
                              sw.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : sw.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }
                          >
                            {sw.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          {sw.status === 'PENDING' && isAdminOrHR && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <Button
                                onClick={() => handleReviewSwap(sw.id, 'APPROVED')}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 font-semibold"
                              >
                                <Check size={13} className="mr-1" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                onClick={() => handleReviewSwap(sw.id, 'REJECTED')}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2.5 bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 font-semibold"
                              >
                                <X size={13} className="mr-1" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          )}
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

      {/* CREATE / EDIT SHIFT TEMPLATE MODAL */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={editingShift ? 'Edit Shift Template' : 'Create New Shift Template'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveShift} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Shift Name</label>
            <input
              type="text"
              value={shiftForm.name}
              onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
              placeholder="e.g. Night Support Shift"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Shift Code (2-4 letters)</label>
              <input
                type="text"
                value={shiftForm.code}
                onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. NGT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Badge Color</label>
              <input
                type="color"
                value={shiftForm.color}
                onChange={(e) => setShiftForm({ ...shiftForm, color: e.target.value })}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">End Time</label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Late Grace Period (minutes)</label>
            <input
              type="number"
              value={shiftForm.gracePeriod}
              onChange={(e) => setShiftForm({ ...shiftForm, gracePeriod: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
              required
            />
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit">
              Save Shift
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ASSIGN SHIFT MODAL */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Shift to Staff"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignShift} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Select Shift Template</label>
            <select
              value={assignForm.shiftId}
              onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
              required
            >
              <option value="">-- Choose Shift --</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime} - {s.endTime})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={assignForm.startDate}
                onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={assignForm.endDate}
                onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Select Staff Members</label>
            <div className="max-h-40 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              {rosterData?.users?.map((u: any) => {
                const isSelected = assignForm.userIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignForm({ ...assignForm, userIds: [...assignForm.userIds, u.id] });
                        } else {
                          setAssignForm({ ...assignForm, userIds: assignForm.userIds.filter((id) => id !== u.id) });
                        }
                      }}
                      className="rounded border-slate-700"
                    />
                    <span className="text-slate-200">
                      {u.firstName} {u.lastName} ({u.department || 'General'})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit">
              Confirm Assignment
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* REQUEST SHIFT SWAP MODAL */}
      <Modal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        title="Request Shift Swap"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSwap} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Date</label>
            <input
              type="date"
              value={swapForm.date}
              onChange={(e) => setSwapForm({ ...swapForm, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">From Shift</label>
              <select
                value={swapForm.fromShiftId}
                onChange={(e) => setSwapForm({ ...swapForm, fromShiftId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              >
                <option value="">-- From Shift --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Requested Shift</label>
              <select
                value={swapForm.toShiftId}
                onChange={(e) => setSwapForm({ ...swapForm, toShiftId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Target Shift --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Reason for Swap Request</label>
            <textarea
              rows={3}
              value={swapForm.reason}
              onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
              placeholder="e.g. Personal emergency in morning, requested evening shift."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 placeholder-slate-500"
              required
            />
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setSwapModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit">
              Submit Swap Request
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
