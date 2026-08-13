'use client';

import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';

export function TeamAttendancePanel() {
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [targetRecord, setTargetRecord] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [allRes, summaryRes] = await Promise.all([
        api.get('/api/attendance/all'),
        api.get('/api/attendance/today-summary'),
      ]);
      setAllAttendance(allRes.data.records || []);
      setSummary(summaryRes.data);
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

  const pendingApprovals = allAttendance.filter((r) => r.status === 'PENDING');

  const filteredRecords = allAttendance.filter((r) => {
    const matchesSearch =
      r.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.department?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Team Active</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{summary?.totalUsers || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Total Registered Users</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Checked In Today</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{summary?.totalCheckedIn || 0}</h3>
              <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">Active Shift</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Late Entries</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{summary?.totalLate || 0}</h3>
              <p className="text-[10px] text-amber-400 mt-0.5 font-semibold">Shift Grace Exceeded</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending Approvals</p>
              <h3 className="text-2xl font-extrabold text-purple-400 mt-1">{pendingApprovals.length}</h3>
              <p className="text-[10px] text-purple-400 mt-0.5 font-semibold">Requires Supervisor Action</p>
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
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0">
                      {rec.user?.firstName?.charAt(0) || 'E'}
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

      {/* Main Team Roster Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck size={20} className="text-blue-400" />
                <span>Team Attendance Roster</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Real-time daily check-in log across all team members.
              </CardDescription>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee..."
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading team roster...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No matching records found.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5">Punctuality</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {rec.user?.firstName?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {rec.user?.firstName} {rec.user?.lastName}
                            </p>
                            <span className="text-[10px] text-slate-400">{rec.user?.department || 'General'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">{formatDateTime(rec.checkInTime)}</td>
                      <td className="p-3.5">{rec.checkOutTime ? formatDateTime(rec.checkOutTime) : '-'}</td>
                      <td className="p-3.5">
                        {rec.isLate ? (
                          <Badge variant="warning">+{rec.lateMinutes}m Late</Badge>
                        ) : (
                          <Badge variant="success">On Time</Badge>
                        )}
                      </td>
                      <td className="p-3.5">
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
                      </td>
                      <td className="p-3.5 text-right">
                        {rec.status === 'PENDING' ? (
                          <div className="flex items-center justify-end space-x-1">
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
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Reviewed</span>
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

      {/* Approval Confirmation Dialog */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title={`Review Attendance • ${targetRecord?.user?.firstName} ${targetRecord?.user?.lastName}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-3 text-xs text-slate-300 py-2">
          <p>
            You are setting the status to{' '}
            <strong className={actionStatus === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}>
              {actionStatus}
            </strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Supervisor Review Note (Optional)
            </label>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Remote check-in approved for field duty."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={actionStatus === 'APPROVED' ? 'success' : 'destructive'}
            onClick={handleApprovalSubmit}
            disabled={submittingAction}
          >
            {submittingAction ? 'Updating...' : `Confirm ${actionStatus}`}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
