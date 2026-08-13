'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Calendar, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';

export default function LeavePage() {
  const { hasPermission } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [type, setType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const endpoint = hasPermission('leave', 'read') ? '/api/leave/all' : '/api/leave/my-requests';
      const res = await api.get(endpoint);
      setLeaves(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/leave', { type, startDate, endDate, reason });
      setModalOpen(false);
      fetchLeaves();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit leave request');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/api/leave/${id}/status`, { status });
      fetchLeaves();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const tableHeaders = hasPermission('leave', 'approve')
    ? ['Applicant', 'Type', 'Dates', 'Reason', 'Status', 'Actions']
    : ['Applicant', 'Type', 'Dates', 'Reason', 'Status'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Apply for leave, track requests, and manage approvals."
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} />
            <span>Apply for Leave</span>
          </button>
        }
      />

      {/* Leave List */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading leave requests...</div>
      ) : (
        <DataTable headers={tableHeaders}>
          {leaves.length === 0 ? (
            <EmptyRow colSpan={tableHeaders.length} message="No leave requests found." />
          ) : (
            leaves.map((l) => (
              <tr key={l.id} className="hover:bg-slate-800/40 transition">
                <td className="p-4 font-semibold text-white">
                  {l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Me'}
                </td>
                <td className="p-4">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {l.type}
                  </span>
                </td>
                <td className="p-4 text-slate-300">
                  {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                </td>
                <td className="p-4 text-slate-400 max-w-xs truncate">{l.reason}</td>
                <td className="p-4">
                  <StatusBadge status={l.status} />
                </td>
                {hasPermission('leave', 'approve') && (
                  <td className="p-4">
                    {l.status === 'PENDING' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(l.id, 'APPROVED')}
                          className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          title="Approve"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(l.id, 'REJECTED')}
                          className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </DataTable>
      )}

      {/* Leave Application Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for Leave"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <FormField label="Leave Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClassName}
            >
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="EARNED">Earned Leave</option>
              <option value="COMPENSATORY">Compensatory Off</option>
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClassName}
                required
              />
            </FormField>
            <FormField label="End Date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <FormField label="Reason for Leave">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={textareaClassName}
              required
            />
          </FormField>

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel="Submit Application"
          />
        </form>
      </Modal>
    </div>
  );
}
