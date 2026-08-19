'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Search,
  Filter,
  UserCheck,
  UserX,
  ShieldAlert,
  Eye,
  MapPin,
  Camera,
  Navigation,
  Calendar,
  FileText,
  ExternalLink,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  UserPlus,
  Send,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path;
  return `${API_URL}${path}`;
}

export function TeamAttendancePanel() {
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & Multi-Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [punctualityFilter, setPunctualityFilter] = useState('ALL');
  const [geofenceFilter, setGeofenceFilter] = useState('ALL');
  const [quickTab, setQuickTab] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE' | 'PENDING' | 'ACTIVE'>('ALL');

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [targetRecord, setTargetRecord] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Inspection Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<any>(null);
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [activeInspectTab, setActiveInspectTab] = useState<'checkin' | 'checkout'>('checkin');

  // Manual Punch / Regularization for Absent Employee Modal
  const [manualPunchModalOpen, setManualPunchModalOpen] = useState(false);
  const [manualPunchUser, setManualPunchUser] = useState<any>(null);
  const [manualPunchDate, setManualPunchDate] = useState('');
  const [manualPunchTime, setManualPunchTime] = useState('09:30');
  const [manualPunchReason, setManualPunchReason] = useState('');
  const [manualPunchSubmitting, setManualPunchSubmitting] = useState(false);
  const [manualPunchMsg, setManualPunchMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [allRes, summaryRes, usersRes] = await Promise.all([
        api.get('/api/attendance/all?limit=500'),
        api.get('/api/attendance/today-summary'),
        api.get('/api/users?limit=200').catch(() => ({ data: { data: [] } })),
      ]);
      setAllAttendance(allRes.data.records || allRes.data.data || []);
      setSummary(summaryRes.data);
      const rawUsers = usersRes.data?.data || usersRes.data?.users || usersRes.data || [];
      setUsersList(Array.isArray(rawUsers) ? rawUsers : []);
    } catch (e) {
      console.error('Fetch team attendance error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (record: any, status: 'APPROVED' | 'REJECTED') => {
    setTargetRecord(record);
    setActionStatus(status);
    setReviewNote('');
    setApprovalModalOpen(true);
  };

  const handleApprovalSubmit = async () => {
    if (!targetRecord) return;
    setSubmittingAction(true);
    try {
      await api.put(`/api/attendance/${targetRecord.id}/status`, {
        status: actionStatus,
        reviewNote,
      });
      setApprovalModalOpen(false);
      fetchTeamData();
    } catch (e) {
      console.error('Approval update error:', e);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleInspect = (record: any) => {
    setInspectedRecord(record);
    setActiveInspectTab('checkin');
    setInspectModalOpen(true);
  };

  const handlePhotoZoom = (url: string) => {
    setZoomedPhoto(url);
    setPhotoZoomOpen(true);
  };

  const handleOpenManualPunch = (user: any) => {
    setManualPunchUser(user);
    const now = new Date();
    setManualPunchDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setManualPunchTime('09:30');
    setManualPunchReason('Manager regularized check-in / On-site duty');
    setManualPunchMsg(null);
    setManualPunchModalOpen(true);
  };

  const handleManualPunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPunchUser) return;
    setManualPunchSubmitting(true);
    setManualPunchMsg(null);
    try {
      await api.post('/api/attendance/regularization/apply', {
        date: manualPunchDate,
        requestedCheckIn: manualPunchTime,
        reason: manualPunchReason,
        targetUserId: manualPunchUser.id,
      });
      setManualPunchMsg({ type: 'success', text: `Punch regularization submitted for ${manualPunchUser.firstName}!` });
      setTimeout(() => {
        setManualPunchModalOpen(false);
        fetchTeamData();
      }, 1200);
    } catch (err: any) {
      setManualPunchMsg({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to submit regularization',
      });
    } finally {
      setManualPunchSubmitting(false);
    }
  };

  // Distinct Departments
  const departments = Array.from(
    new Set([
      ...allAttendance.map((r) => r.user?.department).filter(Boolean),
      ...usersList.map((u) => u.department).filter(Boolean),
    ])
  ) as string[];

  // --- UNIFIED DAILY ROLL CALL CALCULATION ---
  const rollCallList = useMemo(() => {
    // 1. Determine selected calendar date string
    let targetDateStr = '';
    const now = new Date();
    if (datePreset === 'TODAY') {
      targetDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else if (datePreset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      targetDateStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    } else if (datePreset === 'CUSTOM' && customStartDate) {
      targetDateStr = customStartDate;
    }

    // 2. Map of attendance records for the selected target date
    const recordByUserId = new Map<string, any>();
    allAttendance.forEach((rec) => {
      let recDateStr = '';
      if (rec.checkInTime) {
        const d = new Date(rec.checkInTime);
        recDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (rec.date) {
        const str = typeof rec.date === 'string' ? rec.date : new Date(rec.date).toISOString();
        recDateStr = str.split('T')[0];
      }

      if (datePreset === 'ALL' || !targetDateStr || recDateStr === targetDateStr) {
        recordByUserId.set(rec.userId, rec);
      }
    });

    // 3. Combine with full users list to show Present + Absent employees
    if (usersList.length > 0) {
      const seenUserIds = new Set<string>();
      const combined: any[] = [];

      usersList.forEach((u) => {
        seenUserIds.add(u.id);
        const rec = recordByUserId.get(u.id);
        if (rec) {
          combined.push({
            id: rec.id,
            userId: u.id,
            user: rec.user || u,
            isPresent: true,
            status: rec.status || 'APPROVED',
            checkInTime: rec.checkInTime,
            checkOutTime: rec.checkOutTime,
            checkInPhoto: rec.checkInPhoto,
            checkOutPhoto: rec.checkOutPhoto,
            isLate: rec.isLate,
            lateMinutes: rec.lateMinutes,
            isWithinGeofence: rec.isWithinGeofence,
            checkInAddress: rec.checkInAddress,
            checkOutAddress: rec.checkOutAddress,
            checkInLat: rec.checkInLat,
            checkInLng: rec.checkInLng,
            checkOutLat: rec.checkOutLat,
            checkOutLng: rec.checkOutLng,
            checkInNote: rec.checkInNote,
            checkOutNote: rec.checkOutNote,
            productiveHours: rec.productiveHours,
            totalHours: rec.totalHours,
            overtimeHours: rec.overtimeHours,
            breaks: rec.breaks || [],
            rawRecord: rec,
          });
        } else {
          combined.push({
            id: `absent-${u.id}`,
            userId: u.id,
            user: u,
            isPresent: false,
            status: 'ABSENT',
            checkInTime: null,
            checkOutTime: null,
            checkInPhoto: null,
            checkOutPhoto: null,
            isLate: false,
            lateMinutes: 0,
            isWithinGeofence: null,
            checkInAddress: null,
            checkOutAddress: null,
            checkInLat: null,
            checkInLng: null,
            checkOutLat: null,
            checkOutLng: null,
            checkInNote: null,
            checkOutNote: null,
            productiveHours: 0,
            totalHours: 0,
            overtimeHours: 0,
            breaks: [],
            rawRecord: null,
          });
        }
      });

      // Add any records whose users were not in usersList
      recordByUserId.forEach((rec, uId) => {
        if (!seenUserIds.has(uId)) {
          combined.push({
            id: rec.id,
            userId: uId,
            user: rec.user || { id: uId, firstName: 'Staff', lastName: 'Member' },
            isPresent: true,
            status: rec.status || 'APPROVED',
            checkInTime: rec.checkInTime,
            checkOutTime: rec.checkOutTime,
            checkInPhoto: rec.checkInPhoto,
            isLate: rec.isLate,
            lateMinutes: rec.lateMinutes,
            isWithinGeofence: rec.isWithinGeofence,
            checkInAddress: rec.checkInAddress,
            productiveHours: rec.productiveHours,
            totalHours: rec.totalHours,
            overtimeHours: rec.overtimeHours,
            rawRecord: rec,
          });
        }
      });

      return combined;
    }

    // Fallback if users list not loaded yet
    return allAttendance.map((rec) => ({
      id: rec.id,
      userId: rec.userId,
      user: rec.user,
      isPresent: true,
      status: rec.status || 'APPROVED',
      checkInTime: rec.checkInTime,
      checkOutTime: rec.checkOutTime,
      checkInPhoto: rec.checkInPhoto,
      isLate: rec.isLate,
      lateMinutes: rec.lateMinutes,
      isWithinGeofence: rec.isWithinGeofence,
      checkInAddress: rec.checkInAddress,
      productiveHours: rec.productiveHours,
      totalHours: rec.totalHours,
      overtimeHours: rec.overtimeHours,
      rawRecord: rec,
    }));
  }, [allAttendance, usersList, datePreset, customStartDate]);

  // Overall Counts
  const totalStaffCount = usersList.length > 0 ? usersList.length : rollCallList.length;
  const presentRecords = rollCallList.filter((r) => r.isPresent);
  const absentRecords = rollCallList.filter((r) => !r.isPresent);
  const lateRecords = rollCallList.filter((r) => r.isPresent && r.isLate);
  const pendingApprovals = rollCallList.filter((r) => r.isPresent && r.status === 'PENDING');
  const activeShiftRecords = rollCallList.filter((r) => r.isPresent && !r.checkOutTime);

  // Filter application
  const filteredRecords = rollCallList.filter((r) => {
    // 1. Quick Tab Filter
    if (quickTab === 'PRESENT' && !r.isPresent) return false;
    if (quickTab === 'ABSENT' && r.isPresent) return false;
    if (quickTab === 'PENDING' && (!r.isPresent || r.status !== 'PENDING')) return false;
    if (quickTab === 'LATE' && (!r.isPresent || !r.isLate)) return false;
    if (quickTab === 'ACTIVE' && (!r.isPresent || Boolean(r.checkOutTime))) return false;

    // 2. Search Text
    const matchesSearch =
      !search ||
      r.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.department?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.designation?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // 3. Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ABSENT' && r.isPresent) return false;
      if (statusFilter !== 'ABSENT' && (!r.isPresent || r.status !== statusFilter)) return false;
    }

    // 4. Department Filter
    if (departmentFilter !== 'ALL' && r.user?.department !== departmentFilter) return false;

    // 5. Geofence Filter
    if (geofenceFilter === 'INSIDE' && (!r.isPresent || !r.isWithinGeofence)) return false;
    if (geofenceFilter === 'OUTSIDE' && (!r.isPresent || r.isWithinGeofence !== false)) return false;

    // 6. Punctuality Filter
    if (punctualityFilter === 'ON_TIME' && (!r.isPresent || r.isLate)) return false;
    if (punctualityFilter === 'LATE' && (!r.isPresent || !r.isLate)) return false;
    if (punctualityFilter === 'EARLY_EXIT' && (!r.isPresent || !r.isEarlyExit)) return false;
    if (punctualityFilter === 'OVERTIME' && (!r.isPresent || !(r.overtimeHours > 0))) return false;
    if (punctualityFilter === 'ACTIVE' && (!r.isPresent || Boolean(r.checkOutTime))) return false;

    return true;
  });

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setDatePreset('TODAY');
    setCustomStartDate('');
    setCustomEndDate('');
    setDepartmentFilter('ALL');
    setPunctualityFilter('ALL');
    setGeofenceFilter('ALL');
    setQuickTab('ALL');
  };

  const handleExportCsv = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Designation',
      'Date Filter',
      'Roll Call Status',
      'Check-In Time',
      'Check-In Address',
      'Check-Out Time',
      'Check-Out Address',
      'Total Hours',
      'Overtime Hours',
      'Punctuality',
      'Geofence Status',
      'Approval Status',
      'Note',
    ];
    const rows = filteredRecords.map((r) => [
      `"${r.user?.id || ''}"`,
      `"${r.user?.firstName || ''} ${r.user?.lastName || ''}"`,
      `"${r.user?.department || 'General'}"`,
      `"${r.user?.designation || r.user?.role || 'Staff'}"`,
      `"${datePreset}"`,
      `"${r.isPresent ? 'PRESENT' : 'ABSENT'}"`,
      `"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : 'Not Clocked In'}"`,
      `"${(r.checkInAddress || '').replace(/"/g, '""')}"`,
      `"${r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : r.isPresent ? 'Active Shift' : '-'}"`,
      `"${(r.checkOutAddress || '').replace(/"/g, '""')}"`,
      `"${r.totalHours || 0}"`,
      `"${r.overtimeHours || 0}"`,
      `"${r.isPresent ? (r.isLate ? `Late (+${r.lateMinutes || 0}m)` : 'On Time') : '-'}"`,
      `"${r.isPresent ? (r.isWithinGeofence ? 'Inside Geofence' : 'Remote / Outside') : '-'}"`,
      `"${r.status}"`,
      `"${(r.checkInNote || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Team_Roll_Call_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMapEmbedUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Headcount Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Staff */}
        <Card className="bg-slate-900/80 border-slate-800 hover:border-slate-700 transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Staff</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{totalStaffCount}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Active Workforce</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Present Today */}
        <Card
          onClick={() => setQuickTab('PRESENT')}
          className={`cursor-pointer transition border ${
            quickTab === 'PRESENT'
              ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
              : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <span>🟢 Present Today</span>
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{presentRecords.length}</h3>
              <p className="text-[10px] text-emerald-400/80 mt-0.5 font-semibold">Clocked In & On Duty</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <UserCheck size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Absent Today */}
        <Card
          onClick={() => setQuickTab('ABSENT')}
          className={`cursor-pointer transition border ${
            quickTab === 'ABSENT'
              ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/40'
              : 'bg-slate-900/80 border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <span>🔴 Absent Today</span>
              </p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{absentRecords.length}</h3>
              <p className="text-[10px] text-rose-400/80 mt-0.5 font-semibold">Not Clocked In</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <UserX size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Late Entries */}
        <Card
          onClick={() => setQuickTab('LATE')}
          className={`cursor-pointer transition border ${
            quickTab === 'LATE'
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
              : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Late Arrivals</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{lateRecords.length}</h3>
              <p className="text-[10px] text-amber-400 mt-0.5 font-semibold">Shift Grace Exceeded</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card
          onClick={() => setQuickTab('PENDING')}
          className={`cursor-pointer transition border ${
            quickTab === 'PENDING'
              ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/40'
              : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/40'
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">Pending Review</p>
              <h3 className="text-2xl font-extrabold text-purple-400 mt-1">{pendingApprovals.length}</h3>
              <p className="text-[10px] text-purple-400 mt-0.5 font-semibold">Needs Approval</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Action Queue (If Any) */}
      {pendingApprovals.length > 0 && (
        <Card className="border-purple-500/30 bg-purple-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-purple-300">
              <ShieldAlert size={18} className="text-purple-400" />
              <span>Pending Attendance Approvals Queue ({pendingApprovals.length})</span>
            </CardTitle>
            <CardDescription>
              Review remote check-ins or out-of-geofence entries submitted by team members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                      {getPhotoUrl(rec.checkInPhoto) ? (
                        <img src={getPhotoUrl(rec.checkInPhoto)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        rec.user?.firstName?.charAt(0) || 'E'
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">
                        {rec.user?.firstName} {rec.user?.lastName} ({rec.user?.department || 'Employee'})
                      </h4>
                      <p className="text-slate-400 text-[11px]">
                        Check-In: <span className="text-slate-200">{formatDateTime(rec.checkInTime)}</span>
                      </p>
                      {rec.checkInNote && (
                        <p className="text-amber-400 text-[11px] mt-0.5 italic">{rec.checkInNote}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleInspect(rec)}
                      className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <Eye size={14} className="mr-1" />
                      Inspect
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleOpenReviewModal(rec, 'APPROVED')}
                    >
                      <Check size={14} className="mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleOpenReviewModal(rec, 'REJECTED')}
                    >
                      <X size={14} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Filter Counter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setQuickTab('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
            quickTab === 'ALL'
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          All Staff ({rollCallList.length})
        </button>
        <button
          onClick={() => setQuickTab('PRESENT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
            quickTab === 'PRESENT'
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <span>🟢 Present ({presentRecords.length})</span>
        </button>
        <button
          onClick={() => setQuickTab('ABSENT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
            quickTab === 'ABSENT'
              ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <span>🔴 Absent / Not Clocked In ({absentRecords.length})</span>
        </button>
        <button
          onClick={() => setQuickTab('LATE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
            quickTab === 'LATE'
              ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <span>⏰ Late Arrivals ({lateRecords.length})</span>
        </button>
        <button
          onClick={() => setQuickTab('ACTIVE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
            quickTab === 'ACTIVE'
              ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <span>🔵 Active On Shift ({activeShiftRecords.length})</span>
        </button>
        <button
          onClick={() => setQuickTab('PENDING')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
            quickTab === 'PENDING'
              ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <span>⏳ Pending Review ({pendingApprovals.length})</span>
        </button>
      </div>

      {/* Main Roster Card */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck size={20} className="text-blue-400" />
                <span>Daily Team Roll Call & Live Attendance</span>
                <span className="text-xs text-slate-400 font-normal">({filteredRecords.length} employees shown)</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Live operational board: Instantly see who is <strong>🟢 Present</strong> on duty and who is <strong>🔴 Absent / Not Clocked In</strong>.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5"
              >
                <span>📥 Export CSV</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-white"
              >
                <span>Reset Filters</span>
              </Button>
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name or dept..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date Preset */}
            <select
              value={datePreset}
              onChange={(e: any) => setDatePreset(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="TODAY">📅 Today</option>
              <option value="YESTERDAY">📅 Yesterday</option>
              <option value="THIS_WEEK">📅 Past 7 Days</option>
              <option value="THIS_MONTH">📅 This Month</option>
              <option value="ALL">📅 All History</option>
              <option value="CUSTOM">📅 Custom Range...</option>
            </select>

            {/* Department */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">🏢 All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Roll Call Attendance Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">🏷️ All Statuses</option>
              <option value="APPROVED">🟢 Present (Approved)</option>
              <option value="PENDING">⏳ Present (Pending Review)</option>
              <option value="ABSENT">🔴 Absent (Not Clocked In)</option>
              <option value="REJECTED">❌ Rejected</option>
            </select>

            {/* Punctuality */}
            <select
              value={punctualityFilter}
              onChange={(e) => setPunctualityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">⏱️ All Punctuality</option>
              <option value="ON_TIME">✅ On-Time Arrivals</option>
              <option value="LATE">🚨 Late Entries</option>
              <option value="ACTIVE">🔵 Active On Shift</option>
              <option value="OVERTIME">⚡ Overtime</option>
            </select>

            {/* Geofence Status */}
            <select
              value={geofenceFilter}
              onChange={(e) => setGeofenceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">📍 All Locations</option>
              <option value="INSIDE">🏢 Inside Office Geofence</option>
              <option value="OUTSIDE">🌐 Remote / Field Duty</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading daily team roll call...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No matching staff records found.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Live Selfie</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5">Punctuality & Shift</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredRecords.map((rec) => {
                    const photoUrl = getPhotoUrl(rec.checkInPhoto);
                    return (
                      <tr
                        key={rec.id}
                        className={`transition group ${
                          rec.isPresent ? 'hover:bg-slate-800/40' : 'bg-rose-950/5 hover:bg-rose-950/15'
                        }`}
                      >
                        {/* 1. Employee Identity */}
                        <td className="p-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden border border-slate-700">
                                {rec.user?.avatar ? (
                                  <img src={getPhotoUrl(rec.user.avatar)!} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  rec.user?.firstName?.charAt(0) || 'E'
                                )}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                                  rec.isPresent ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                title={rec.isPresent ? 'Present' : 'Absent'}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-white flex items-center gap-1.5">
                                <span>
                                  {rec.user?.firstName} {rec.user?.lastName}
                                </span>
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {rec.user?.department || 'General'} • {rec.user?.designation || rec.user?.role || 'Staff'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Photo / Selfie */}
                        <td className="p-3.5">
                          {rec.isPresent ? (
                            photoUrl ? (
                              <button
                                onClick={() => handlePhotoZoom(photoUrl)}
                                className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all hover:scale-110 cursor-pointer group/photo"
                                title="Click to zoom selfie"
                              >
                                <img src={photoUrl} alt="Check-in" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-600">
                                <Camera size={14} />
                              </div>
                            )
                          ) : (
                            <span className="text-slate-600 text-[11px] italic">No punch</span>
                          )}
                        </td>

                        {/* 3. Check-In Time */}
                        <td className="p-3.5">
                          {rec.isPresent ? (
                            <div>
                              <p className="font-semibold text-emerald-400">{formatDateTime(rec.checkInTime)}</p>
                              <span className="text-[10px] text-slate-400">
                                {rec.isWithinGeofence ? '🏢 Inside Geofence' : '🌐 Remote / Field'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-rose-400/80 font-medium">🔴 Not Clocked In</span>
                          )}
                        </td>

                        {/* 4. Check-Out Time */}
                        <td className="p-3.5">
                          {rec.isPresent ? (
                            rec.checkOutTime ? (
                              formatDateTime(rec.checkOutTime)
                            ) : (
                              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 text-[10px]">
                                Active On Shift
                              </Badge>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 5. Punctuality & Shift Hours */}
                        <td className="p-3.5">
                          {rec.isPresent ? (
                            rec.isLate ? (
                              <Badge variant="warning">+{rec.lateMinutes}m Late</Badge>
                            ) : (
                              <Badge variant="success">On Time</Badge>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Shift: {rec.user?.shiftStartTime || '09:30'} - {rec.user?.shiftEndTime || '18:30'}
                            </span>
                          )}
                        </td>

                        {/* 6. Roll Call Status Badge */}
                        <td className="p-3.5">
                          {rec.isPresent ? (
                            <Badge
                              variant={
                                rec.status === 'APPROVED'
                                  ? 'success'
                                  : rec.status === 'PENDING'
                                  ? 'warning'
                                  : 'destructive'
                              }
                            >
                              {rec.status}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-rose-500/20 text-rose-300 border-rose-500/30">
                              ABSENT
                            </Badge>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {rec.isPresent ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInspect(rec)}
                                  className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 opacity-80 group-hover:opacity-100"
                                >
                                  <Eye size={13} className="mr-1" />
                                  Inspect
                                </Button>
                                {rec.status === 'PENDING' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="success"
                                      onClick={() => handleOpenReviewModal(rec, 'APPROVED')}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleOpenReviewModal(rec, 'REJECTED')}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenManualPunch(rec.user)}
                                className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs"
                              >
                                <UserPlus size={13} className="mr-1" />
                                Mark Present
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== MANUAL PUNCH / REGULARIZE MODAL ===== */}
      <Modal
        isOpen={manualPunchModalOpen}
        onClose={() => setManualPunchModalOpen(false)}
        title={`Mark Present • ${manualPunchUser?.firstName || ''} ${manualPunchUser?.lastName || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleManualPunchSubmit} className="space-y-4 py-2">
          {manualPunchMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                manualPunchMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              <AlertCircle size={14} />
              <span>{manualPunchMsg.text}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <p className="font-semibold text-white">
              {manualPunchUser?.firstName} {manualPunchUser?.lastName}
            </p>
            <p className="text-slate-400">
              {manualPunchUser?.department || 'General'} • {manualPunchUser?.designation || manualPunchUser?.role || 'Staff'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Date</label>
            <input
              type="date"
              required
              value={manualPunchDate}
              onChange={(e) => setManualPunchDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Check-In Time</label>
            <input
              type="time"
              required
              value={manualPunchTime}
              onChange={(e) => setManualPunchTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note</label>
            <textarea
              required
              rows={3}
              value={manualPunchReason}
              onChange={(e) => setManualPunchReason(e.target.value)}
              placeholder="e.g. On-site emergency client visit / Forgot to punch"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setManualPunchModalOpen(false)}
              disabled={manualPunchSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={manualPunchSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {manualPunchSubmitting ? 'Recording...' : 'Submit Regularization'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ===== INSPECTION MODAL ===== */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={`Inspection • ${inspectedRecord?.user?.firstName || ''} ${inspectedRecord?.user?.lastName || ''}`}
        maxWidth="max-w-3xl"
      >
        {inspectedRecord && (
          <div className="space-y-5 py-2">
            {/* Employee Identity Header */}
            <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-500/30 shrink-0 bg-slate-800 flex items-center justify-center">
                {getPhotoUrl(inspectedRecord.checkInPhoto) ? (
                  <img src={getPhotoUrl(inspectedRecord.checkInPhoto)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {inspectedRecord.user?.firstName?.charAt(0) || 'E'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-extrabold text-white truncate">
                  {inspectedRecord.user?.firstName} {inspectedRecord.user?.lastName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {inspectedRecord.user?.designation || inspectedRecord.user?.role || 'Employee'}
                  </Badge>
                  {inspectedRecord.user?.department && (
                    <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                      {inspectedRecord.user.department}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      inspectedRecord.status === 'APPROVED'
                        ? 'success'
                        : inspectedRecord.status === 'PENDING'
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {inspectedRecord.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Check-In / Check-Out Switcher */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveInspectTab('checkin')}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
                  activeInspectTab === 'checkin'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                📥 Check-In Verification
              </button>
              <button
                onClick={() => setActiveInspectTab('checkout')}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${
                  activeInspectTab === 'checkout'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                📤 Check-Out Verification
              </button>
            </div>

            {/* Tab: Check-In Details */}
            {activeInspectTab === 'checkin' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo Proof */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Camera size={14} className="text-blue-400" />
                      <span>Check-In Photo Proof</span>
                    </p>
                    <div className="h-56 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                      {getPhotoUrl(inspectedRecord.checkInPhoto) ? (
                        <>
                          <img
                            src={getPhotoUrl(inspectedRecord.checkInPhoto)!}
                            alt="Check-in photo"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handlePhotoZoom(getPhotoUrl(inspectedRecord.checkInPhoto)!)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                          >
                            🔍 Click to Enlarge
                          </button>
                        </>
                      ) : (
                        <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                          <ImageIcon size={32} />
                          <span>No photo recorded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GPS & Map */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-400" />
                      <span>GPS Verification</span>
                    </p>
                    <div className="h-56 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative">
                      {inspectedRecord.checkInLat && inspectedRecord.checkInLng ? (
                        <iframe
                          title="Check-in Location"
                          src={getMapEmbedUrl(inspectedRecord.checkInLat, inspectedRecord.checkInLng)}
                          className="w-full h-full border-0"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                          <span>No GPS coordinates logged</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="font-semibold text-white">{formatDateTime(inspectedRecord.checkInTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Address / Location:</span>
                    <span className="font-semibold text-white text-right max-w-[260px] truncate">
                      {inspectedRecord.checkInAddress || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Geofence Compliance:</span>
                    <span>
                      {inspectedRecord.isWithinGeofence ? (
                        <Badge variant="success">Inside Office Geofence</Badge>
                      ) : (
                        <Badge variant="destructive">Remote / Outside</Badge>
                      )}
                    </span>
                  </div>
                  {inspectedRecord.checkInNote && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">Employee Note:</span>
                      <p className="text-amber-300 mt-0.5 italic">{inspectedRecord.checkInNote}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Check-Out Details */}
            {activeInspectTab === 'checkout' && (
              <div className="space-y-4">
                {inspectedRecord.checkOutTime ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Photo */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                          <Camera size={14} className="text-blue-400" />
                          <span>Check-Out Photo Proof</span>
                        </p>
                        <div className="h-56 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                          {getPhotoUrl(inspectedRecord.checkOutPhoto) ? (
                            <>
                              <img
                                src={getPhotoUrl(inspectedRecord.checkOutPhoto)!}
                                alt="Check-out photo"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => handlePhotoZoom(getPhotoUrl(inspectedRecord.checkOutPhoto)!)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                              >
                                🔍 Click to Enlarge
                              </button>
                            </>
                          ) : (
                            <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                              <ImageIcon size={32} />
                              <span>No check-out photo</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* GPS */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                          <MapPin size={14} className="text-emerald-400" />
                          <span>Check-Out GPS</span>
                        </p>
                        <div className="h-56 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative">
                          {inspectedRecord.checkOutLat && inspectedRecord.checkOutLng ? (
                            <iframe
                              title="Check-out Location"
                              src={getMapEmbedUrl(inspectedRecord.checkOutLat, inspectedRecord.checkOutLng)}
                              className="w-full h-full border-0"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                              <span>No check-out GPS</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Timestamp:</span>
                        <span className="font-semibold text-white">{formatDateTime(inspectedRecord.checkOutTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Work Duration:</span>
                        <span className="font-semibold text-emerald-400">{inspectedRecord.totalHours || 0} Hours</span>
                      </div>
                      {inspectedRecord.overtimeHours > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Overtime Logged:</span>
                          <span className="font-semibold text-amber-400">+{inspectedRecord.overtimeHours} Hours</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    Shift is still active. Employee has not clocked out yet.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ===== PHOTO ZOOM MODAL ===== */}
      <Modal
        isOpen={photoZoomOpen}
        onClose={() => setPhotoZoomOpen(false)}
        title="Verified Photo Snapshot"
        maxWidth="max-w-2xl"
      >
        {zoomedPhoto && (
          <div className="p-2 flex justify-center">
            <img src={zoomedPhoto} alt="Zoomed snapshot" className="max-h-[70vh] rounded-2xl object-contain border border-slate-800" />
          </div>
        )}
      </Modal>

      {/* ===== APPROVAL REVIEW MODAL ===== */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title={`Review Attendance • ${targetRecord?.user?.firstName || ''} ${targetRecord?.user?.lastName || ''}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-400">
            Confirm decision for this check-in entry submitted by{' '}
            <strong className="text-white">{targetRecord?.user?.firstName} {targetRecord?.user?.lastName}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supervisor Review Note</label>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add optional comment or feedback..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setApprovalModalOpen(false)}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={actionStatus === 'APPROVED' ? 'success' : 'destructive'}
              onClick={handleApprovalSubmit}
              disabled={submittingAction}
            >
              {submittingAction ? 'Processing...' : `Confirm ${actionStatus}`}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
