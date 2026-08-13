'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatDate } from '@/lib/utils';

export function PersonalAttendanceHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
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
    if (filterStatus === 'ALL') return true;
    return rec.status === filterStatus;
  });

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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} className="text-blue-400" />
                <span>My Attendance History</span>
              </CardTitle>
              <CardDescription className="mt-1">
                View your complete personal check-in/out records, location verification, and shift notes.
              </CardDescription>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending Approval</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading attendance history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No attendance records found.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check-In Time</th>
                    <th className="p-3.5">Check-Out Time</th>
                    <th className="p-3.5">Late Entry</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-semibold text-white">{formatDate(rec.date)}</td>
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
                        <Badge variant={getStatusBadgeVariant(rec.status)}>{rec.status}</Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedRecord(rec)}
                          title="View Details"
                        >
                          <Eye size={16} />
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

      {/* Record Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title={`Attendance Details • ${formatDate(selectedRecord.date)}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs text-slate-300 py-2">
            {/* Photo preview */}
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
                <span className="text-slate-400">Check-In:</span>
                <span className="font-semibold text-white">{formatDateTime(selectedRecord.checkInTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Check-Out:</span>
                <span className="font-semibold text-white">
                  {selectedRecord.checkOutTime ? formatDateTime(selectedRecord.checkOutTime) : 'Not recorded'}
                </span>
              </div>
              {selectedRecord.checkInLat && selectedRecord.checkInLng && (
                <div className="flex justify-between">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <span className="font-mono text-blue-400">
                    {selectedRecord.checkInLat.toFixed(4)}°, {selectedRecord.checkInLng.toFixed(4)}°
                  </span>
                </div>
              )}
              {selectedRecord.checkInNote && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1">Note:</span>
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
