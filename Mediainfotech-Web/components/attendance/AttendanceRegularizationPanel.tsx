'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  FileEdit,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  UserCheck,
  Sparkles,
  Calendar,
  Send,
  Trash2,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatDateTime, formatDate } from '@/lib/utils';

interface RegularizationPanelProps {
  initialApplyDate?: string | null;
}

export function AttendanceRegularizationPanel({ initialApplyDate }: RegularizationPanelProps) {
  const { user, hasRole, hasPermission } = useAuth();
  const canReview = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('attendance', 'approve');

  const [activeTab, setActiveTab] = useState<'my_requests' | 'review_requests'>('my_requests');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal State
  const [applyModalOpen, setApplyModalOpen] = useState(Boolean(initialApplyDate));
  const [applyForm, setApplyForm] = useState({
    date: initialApplyDate || new Date().toISOString().split('T')[0],
    requestedCheckIn: '09:30',
    requestedCheckOut: '18:30',
    reasonType: 'MISSED_CHECK_IN',
    reason: '',
  });
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Filter States for Review tab
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  useEffect(() => {
    if (initialApplyDate) {
      setApplyForm((prev) => ({ ...prev, date: initialApplyDate }));
      setApplyModalOpen(true);
    }
  }, [initialApplyDate]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      if (activeTab === 'my_requests') {
        const res = await api.get('/api/attendance/regularization/my-requests');
        setMyRequests(res.data.data || []);
      } else if (canReview) {
        const res = await api.get('/api/attendance/regularization/all');
        setAllRequests(res.data.data || []);
      }
    } catch (e) {
      console.error('Fetch regularization requests error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    setApplySuccess(null);

    if (!applyForm.date || !applyForm.reason) {
      setApplyError('Please fill in the date and justification reason.');
      return;
    }

    try {
      setSubmittingApply(true);

      // Create full ISO timestamps for checkIn and checkOut
      const inDate = new Date(`${applyForm.date}T${applyForm.requestedCheckIn}:00`);
      const outDate = new Date(`${applyForm.date}T${applyForm.requestedCheckOut}:00`);

      const res = await api.post('/api/attendance/regularization/apply', {
        date: applyForm.date,
        requestedCheckIn: inDate.toISOString(),
        requestedCheckOut: outDate.toISOString(),
        reasonType: applyForm.reasonType,
        reason: applyForm.reason,
      });

      setApplySuccess(res.data.message || 'Regularization request submitted successfully.');
      setApplyForm({
        date: new Date().toISOString().split('T')[0],
        requestedCheckIn: '09:30',
        requestedCheckOut: '18:30',
        reasonType: 'MISSED_CHECK_IN',
        reason: '',
      });

      setTimeout(() => {
        setApplyModalOpen(false);
        fetchRequests();
      }, 1000);
    } catch (err: any) {
      setApplyError(err.response?.data?.error || 'Failed to submit regularization request.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleOpenReview = (request: any, status: 'APPROVED' | 'REJECTED') => {
    setTargetRequest(request);
    setReviewStatus(status);
    setReviewNote('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!targetRequest) return;
    try {
      setSubmittingReview(true);
      await api.put(`/api/attendance/regularization/${targetRequest.id}/review`, {
        status: reviewStatus,
        reviewNote,
      });
      setReviewModalOpen(false);
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this regularization request?')) return;
    try {
      await api.delete(`/api/attendance/regularization/${id}`);
      fetchRequests();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to cancel request');
    }
  };

  const getReasonLabel = (type: string) => {
    switch (type) {
      case 'MISSED_CHECK_IN':
        return 'Missed Check-In';
      case 'MISSED_CHECK_OUT':
        return 'Missed Check-Out';
      case 'FULL_DAY_CORRECTION':
        return 'Full-Day Correction';
      case 'CLIENT_VISIT':
        return 'Client / Field Visit';
      case 'TECHNICAL_GLITCH':
        return 'Technical / Biometric Glitch';
      case 'WORK_FROM_HOME':
        return 'Work From Home';
      default:
        return 'Other Correction';
    }
  };

  const filteredAllRequests = allRequests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = `${r.user?.firstName} ${r.user?.lastName}`.toLowerCase().includes(q);
      const matchReason = r.reason?.toLowerCase().includes(q);
      return matchName || matchReason;
    }
    return true;
  });

  const pendingReviewCount = allRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileEdit size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Attendance Regularization & Disputes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit corrections for missed check-ins, client field duties, or technical glitches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('my_requests')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'my_requests'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Requests
            </button>
            {canReview && (
              <button
                onClick={() => setActiveTab('review_requests')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'review_requests'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Manager Approvals</span>
                {pendingReviewCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center">
                    {pendingReviewCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <Button
            onClick={() => setApplyModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs h-9 px-4 rounded-xl font-bold shadow-lg shadow-blue-600/30 gap-1.5"
          >
            <Plus size={15} />
            <span>Apply Regularization</span>
          </Button>
        </div>
      </div>

      {/* TAB 1: MY REQUESTS */}
      {activeTab === 'my_requests' && (
        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-3.5">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" />
              <span>My Attendance Regularization History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading your regularization requests...</span>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <FileEdit size={36} className="text-slate-600" />
                <p className="text-sm font-semibold">No regularization requests found</p>
                <p className="text-xs max-w-sm">
                  If you missed a punch or were on field duty, click &ldquo;Apply Regularization&rdquo; above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Target Date</th>
                      <th className="p-3.5">Correction Reason</th>
                      <th className="p-3.5">Requested Timings</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Reviewer Remarks</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {myRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {formatDate(req.date)}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-blue-300 block">{getReasonLabel(req.reasonType)}</span>
                          <span className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{req.reason}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:30'}
                          {' → '}
                          {req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '18:30'}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={
                              req.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : req.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : req.status === 'CANCELLED'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {req.reviewer ? (
                            <div>
                              <span className="text-slate-300 font-medium block">
                                {req.reviewer.firstName} {req.reviewer.lastName}
                              </span>
                              <span className="text-[11px] text-slate-500">{req.reviewNote || 'Approved without note'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Pending manager review</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {req.status === 'PENDING' && (
                            <Button
                              onClick={() => handleCancelRequest(req.id)}
                              variant="ghost"
                              size="sm"
                              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 px-2"
                            >
                              <Trash2 size={13} className="mr-1" />
                              <span>Cancel</span>
                            </Button>
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

      {/* TAB 2: MANAGER / HR REVIEW REQUESTS */}
      {activeTab === 'review_requests' && canReview && (
        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-slate-800/80 pb-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span>Pending Regularization Approvals</span>
              </CardTitle>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff or reason..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending Only</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading requests...</span>
              </div>
            ) : filteredAllRequests.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <CheckCircle2 size={36} className="text-emerald-500/40" />
                <p className="text-sm font-semibold">No pending requests to review</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Target Date</th>
                      <th className="p-3.5">Correction Reason</th>
                      <th className="p-3.5">Requested Timings</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredAllRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs">
                              {req.user?.firstName?.[0]}
                            </div>
                            <div>
                              <span className="font-bold text-white block">
                                {req.user?.firstName} {req.user?.lastName}
                              </span>
                              <span className="text-[10px] text-slate-400">{req.user?.department || 'General'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-white">{formatDate(req.date)}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-blue-300 block">{getReasonLabel(req.reasonType)}</span>
                          <span className="text-slate-300 text-[11px]">{req.reason}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:30'}
                          {' → '}
                          {req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '18:30'}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={
                              req.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : req.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : req.status === 'CANCELLED'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              <Button
                                onClick={() => handleOpenReview(req, 'APPROVED')}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 font-semibold"
                              >
                                <Check size={13} className="mr-1" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                onClick={() => handleOpenReview(req, 'REJECTED')}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2.5 bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 font-semibold"
                              >
                                <X size={13} className="mr-1" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Reviewed by {req.reviewer?.firstName || 'Admin'}</span>
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

      {/* APPLY REGULARIZATION MODAL */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Apply for Attendance Regularization"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4 py-2 text-xs">
          {applyError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{applyError}</span>
            </div>
          )}

          {applySuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{applySuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Date</label>
            <input
              type="date"
              value={applyForm.date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setApplyForm({ ...applyForm, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Correction Type</label>
            <select
              value={applyForm.reasonType}
              onChange={(e) => setApplyForm({ ...applyForm, reasonType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
            >
              <option value="MISSED_CHECK_IN">Missed Clock-In</option>
              <option value="MISSED_CHECK_OUT">Missed Clock-Out</option>
              <option value="FULL_DAY_CORRECTION">Full-Day Adjustment (Absent Correction)</option>
              <option value="CLIENT_VISIT">Outdoor Client Visit / Field Duty</option>
              <option value="TECHNICAL_GLITCH">Device / GPS / Network Glitch</option>
              <option value="WORK_FROM_HOME">Work From Home Approval</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Requested Clock-In</label>
              <input
                type="time"
                value={applyForm.requestedCheckIn}
                onChange={(e) => setApplyForm({ ...applyForm, requestedCheckIn: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Requested Clock-Out</label>
              <input
                type="time"
                value={applyForm.requestedCheckOut}
                onChange={(e) => setApplyForm({ ...applyForm, requestedCheckOut: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Justification Reason</label>
            <textarea
              rows={3}
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="Explain why the punch was missed or specify client visit details..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500 placeholder-slate-500"
              required
            />
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit" disabled={submittingApply}>
              {submittingApply ? 'Submitting...' : 'Submit Request'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MANAGER REVIEW MODAL */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`${reviewStatus === 'APPROVED' ? 'Approve' : 'Reject'} Regularization`}
        maxWidth="max-w-md"
      >
        {targetRequest && (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee:</span>
                <span className="font-bold text-white">
                  {targetRequest.user?.firstName} {targetRequest.user?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Date:</span>
                <span className="font-semibold text-slate-200">{formatDate(targetRequest.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason:</span>
                <span className="font-semibold text-blue-300">{targetRequest.reason}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Review Remarks (Optional)</label>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="e.g. Verified with client meeting log"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-blue-500"
              />
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={reviewStatus === 'APPROVED' ? 'default' : 'destructive'}
                onClick={handleReviewSubmit}
                disabled={submittingReview}
              >
                {submittingReview ? 'Processing...' : `Confirm ${reviewStatus}`}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
