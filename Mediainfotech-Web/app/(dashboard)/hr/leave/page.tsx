'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  Search,
  Filter,
  Layers,
  Award,
  Sparkles,
  AlertCircle,
  FileText,
  Edit,
  UploadCloud,
  Paperclip,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { LeaveBalanceCards } from '@/components/hr/LeaveBalanceCards';
import { TeamLeaveCalendar } from '@/components/hr/TeamLeaveCalendar';
import { LeaveQuotaAllocatorModal } from '@/components/hr/LeaveQuotaAllocatorModal';

export default function LeavePage() {
  const { hasPermission, hasRole, user } = useAuth();
  const isHRorAdmin = hasRole('ADMIN', 'HR', 'MANAGER');
  const isManagerOrAbove = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('leave', 'approve');

  const [activeTab, setActiveTab] = useState<'my_requests' | 'team_calendar' | 'approvals' | 'quotas'>(
    'my_requests'
  );

  // Leave Balances & Requests
  const [myBalances, setMyBalances] = useState<any[]>([]);
  const [allBalances, setAllBalances] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState('FIRST_HALF');
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittingApply, setSubmittingApply] = useState(false);

  // Handle direct file upload to /api/upload
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document', file);
      formData.append('folder', 'leaves');

      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data.fileUrl || res.data.url || '';
      setDocumentUrl(uploadedUrl);
      setUploadedFileName(file.name);
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(err.response?.data?.error || 'Failed to upload document. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Quota Allocator Modal State
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [selectedQuotaUserId, setSelectedQuotaUserId] = useState<string | undefined>(undefined);

  // Rejection Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Filters for All Leaves / Quotas
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [quotaSearch, setQuotaSearch] = useState('');

  useEffect(() => {
    fetchMyData();
    if (isManagerOrAbove) {
      fetchAllLeaves();
    }
    if (isHRorAdmin) {
      fetchAllBalances();
    }
  }, [statusFilter, deptFilter]);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      const [balRes, reqRes] = await Promise.all([
        api.get('/api/leave/balances'),
        api.get('/api/leave/my-requests'),
      ]);
      setMyBalances(balRes.data.data || []);
      setMyLeaves(reqRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (deptFilter !== 'ALL') params.append('department', deptFilter);
      const res = await api.get(`/api/leave/all?${params.toString()}`);
      setAllLeaves(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllBalances = async () => {
    try {
      const res = await api.get('/api/leave/all-balances');
      setAllBalances(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingApply(true);
      await api.post('/api/leave', {
        type,
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : null,
        reason,
        documentUrl: documentUrl || null,
      });
      setModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setDocumentUrl('');
      setIsHalfDay(false);
      fetchMyData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string, note?: string) => {
    try {
      await api.put(`/api/leave/${id}/status`, { status, rejectionNote: note });
      fetchAllLeaves();
      fetchMyData();
      if (isHRorAdmin) fetchAllBalances();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleOpenReject = (id: string) => {
    setSelectedLeaveId(id);
    setRejectionNote('');
    setRejectionModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedLeaveId) return;
    handleStatusUpdate(selectedLeaveId, 'REJECTED', rejectionNote);
    setRejectionModalOpen(false);
  };

  const handleOpenQuotaForUser = (userId: string) => {
    setSelectedQuotaUserId(userId);
    setQuotaModalOpen(true);
  };

  const pendingApprovalsCount = allLeaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar size={16} />
            <span>Time Off & Attendance Integration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Leave Desk & Balance Wallets
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Apply for annual time-off, track quota balances, view team availability, and manage approval queues.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isManagerOrAbove && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedQuotaUserId(undefined);
                setQuotaModalOpen(true);
              }}
              className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-xs font-semibold text-amber-400 gap-1.5"
            >
              <Award size={15} />
              <span>Bulk Set Quotas / Credit</span>
            </Button>
          )}

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <Plus size={15} />
            <span>Apply for Leave</span>
          </Button>
        </div>
      </div>

      {/* Leave Balance Wallets */}
      <LeaveBalanceCards
        balances={myBalances}
        loading={loading}
        onOpenQuotaModal={() => {
          setSelectedQuotaUserId(undefined);
          setQuotaModalOpen(true);
        }}
        canManageQuotas={isManagerOrAbove}
      />


      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/60 p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('my_requests')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'my_requests'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User size={14} />
          <span>My Leave Requests</span>
        </button>

        <button
          onClick={() => setActiveTab('team_calendar')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'team_calendar'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar size={14} />
          <span>Team Out-of-Office Timeline</span>
        </button>

        {isManagerOrAbove && (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Manager Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        )}

        {isManagerOrAbove && (
          <button
            onClick={() => setActiveTab('quotas')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'quotas'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={14} />
            <span>Company & Team Quotas</span>
          </button>
        )}
      </div>

      {/* TAB 1: MY REQUESTS */}
      {activeTab === 'my_requests' && (
        <div className="space-y-4">
          <DataTable
            headers={['Leave Type', 'Duration & Dates', 'Half-Day Period', 'Reason', 'Status', 'Submitted On']}
          >
            {myLeaves.length === 0 ? (
              <EmptyRow colSpan={6} message="You have not submitted any leave requests yet." />
            ) : (
              myLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs font-bold text-blue-400 border-blue-500/30">
                      {leave.type}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs font-semibold text-white">
                    <div>
                      {formatDate(leave.startDate)} {leave.startDate !== leave.endDate && `— ${formatDate(leave.endDate)}`}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                    </span>
                  </td>
                  <td className="p-4 text-xs">
                    {leave.isHalfDay ? (
                      <Badge variant="secondary" className="text-[10px] bg-slate-800 text-amber-400">
                        {leave.halfDayPeriod?.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-slate-500 text-xs">Full Day</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-300 max-w-xs truncate">{leave.reason}</td>
                  <td className="p-4">
                    <StatusBadge status={leave.status} />
                    {leave.rejectionNote && (
                      <p className="text-[10px] text-rose-400 mt-1 italic truncate">
                        Note: {leave.rejectionNote}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-400">{formatDate(leave.createdAt)}</td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      )}

      {/* TAB 2: TEAM CALENDAR */}
      {activeTab === 'team_calendar' && <TeamLeaveCalendar />}

      {/* TAB 3: MANAGER APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <DataTable
            headers={['Applicant', 'Type & Duration', 'Dates & Half-Day', 'Reason & Documents', 'Status', 'Actions']}
          >
            {allLeaves.length === 0 ? (
              <EmptyRow colSpan={6} message="No leave requests found in the approval queue." />
            ) : (
              allLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                        {leave.user?.firstName?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {leave.user?.designation || leave.user?.department || 'Employee'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <Badge variant="outline" className="text-xs font-bold text-blue-400 border-blue-500/30">
                      {leave.type}
                    </Badge>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">{leave.totalDays} Days</p>
                  </td>
                  <td className="p-4 text-xs font-semibold text-white">
                    <div>
                      {formatDate(leave.startDate)} {leave.startDate !== leave.endDate && `— ${formatDate(leave.endDate)}`}
                    </div>
                    {leave.isHalfDay && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {leave.halfDayPeriod?.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-300 max-w-xs">
                    <p className="truncate">{leave.reason}</p>
                    {leave.documentUrl && (
                      <a
                        href={leave.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <FileText size={11} />
                        <span>View Attachment</span>
                      </a>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={leave.status} />
                  </td>
                  <td className="p-4">
                    {leave.status === 'PENDING' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenReject(leave.id)}
                          className="px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">Processed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      )}

      {/* TAB 4: EMPLOYEE QUOTA ALLOCATOR */}
      {activeTab === 'quotas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Annual Employee Leave Quotas ({new Date().getFullYear()})</h3>
              <p className="text-xs text-slate-400">
                Custom yearly leave allocations (Casual, Sick, Earned, Comp Off) and real-time remaining counters.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={quotaSearch}
                onChange={(e) => setQuotaSearch(e.target.value)}
                placeholder="Filter employee..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <DataTable
            headers={['Employee', 'Casual (CL)', 'Sick (SL)', 'Earned (EL)', 'Comp Off', 'Actions']}
          >
            {allBalances
              .filter((u) => {
                if (!quotaSearch) return true;
                const q = quotaSearch.toLowerCase();
                return (
                  u.firstName?.toLowerCase().includes(q) ||
                  u.lastName?.toLowerCase().includes(q) ||
                  u.designation?.toLowerCase().includes(q)
                );
              })
              .map((u) => {
                const getBal = (type: string) => {
                  const b = u.leaveBalances?.find((item: any) => item.type === type);
                  return b ? `${b.remaining} / ${b.total}d` : '12 / 12d';
                };

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                          {u.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {u.employeeCode || u.designation || 'Staff'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-blue-400 font-semibold">{getBal('CASUAL')}</td>
                    <td className="p-4 text-xs font-mono text-rose-400 font-semibold">{getBal('SICK')}</td>
                    <td className="p-4 text-xs font-mono text-emerald-400 font-semibold">{getBal('EARNED')}</td>
                    <td className="p-4 text-xs font-mono text-amber-400 font-semibold">{getBal('COMPENSATORY')}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleOpenQuotaForUser(u.id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold transition border border-slate-700 flex items-center gap-1"
                      >
                        <Edit size={12} />
                        <span>Adjust Quota</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
          </DataTable>
        </div>
      )}

      {/* Apply For Leave Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Apply for Leave" maxWidth="max-w-md">
        <form onSubmit={handleApply} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Leave Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
            >
              <option value="CASUAL">Casual Leave (CL)</option>
              <option value="SICK">Sick Leave (SL)</option>
              <option value="EARNED">Earned Leave (EL)</option>
              <option value="COMPENSATORY">Compensatory Off</option>
              <option value="UNPAID">Unpaid Leave (Loss of Pay)</option>
              <option value="MATERNITY">Maternity Leave</option>
              <option value="PATERNITY">Paternity Leave</option>
            </select>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <input
              type="checkbox"
              id="halfDayCheck"
              checked={isHalfDay}
              onChange={(e) => setIsHalfDay(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 cursor-pointer"
            />
            <label htmlFor="halfDayCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Half-Day Leave (0.5 Day)
            </label>
          </div>

          {isHalfDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Half-Day Session</label>
                <select
                  value={halfDayPeriod}
                  onChange={(e) => setHalfDayPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="FIRST_HALF">First Half (Morning)</option>
                  <option value="SECOND_HALF">Second Half (Afternoon)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Reason for Leave *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none h-20"
              placeholder="Provide reason for planned or emergency time-off..."
              required
            />
          </div>

          {/* Supporting Document Upload Dropzone */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">
              Supporting Document (Optional)
            </label>

            {documentUrl ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Paperclip size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{uploadedFileName || 'Uploaded Document'}</p>
                    <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 size={10} /> Uploaded & attached
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={documentUrl.startsWith('http') ? documentUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${documentUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Preview uploaded document"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentUrl('');
                      setUploadedFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition"
                    title="Remove attachment"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
                {uploadingFile ? (
                  <div className="flex items-center gap-2 text-xs text-indigo-400 py-1.5">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading supporting document...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <UploadCloud size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Click or drag & drop to upload</p>
                      <p className="text-[10px] text-slate-500">
                        Medical prescription, certificate, or ticket (PDF, PNG, JPG up to 10MB)
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <ModalFooter onClose={() => setModalOpen(false)} submitLabel="Submit Request" />
        </form>
      </Modal>

      {/* Rejection Note Modal */}
      <Modal open={rejectionModalOpen} onClose={() => setRejectionModalOpen(false)} title="Reject Leave Request" maxWidth="max-w-sm">
        <div className="space-y-3 text-xs">
          <p className="text-slate-300">Please provide a reason for rejecting this leave application:</p>
          <textarea
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none h-20"
            placeholder="e.g. Critical project deadline, staffing shortage..."
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectionModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmReject} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold">
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quota & Leave Credit Modal */}
      <LeaveQuotaAllocatorModal
        isOpen={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        onSuccess={() => {
          fetchMyData();
          fetchAllBalances();
        }}
        initialUserId={selectedQuotaUserId}
      />
    </div>
  );
}
