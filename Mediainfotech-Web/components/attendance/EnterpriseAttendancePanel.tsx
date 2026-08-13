'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Building2,
  Settings,
  Download,
  Search,
  Filter,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatDateTime, formatDate } from '@/lib/utils';

export function EnterpriseAttendancePanel() {
  const { user } = useAuth();
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Admin Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    officeLat: '',
    officeLng: '',
    geofenceRadius: '50',
    geofenceMode: 'AUTO',
    autoApproveWithinGeofence: true,
    requirePhoto: true,
    allowRemoteCheckIn: true,
    officeStartTime: '09:30',
    officeEndTime: '18:30',
    lateThresholdMinutes: '15',
  });

  useEffect(() => {
    fetchEnterpriseData();
  }, []);

  const fetchEnterpriseData = async () => {
    try {
      setLoading(true);
      const [allRes, settingsRes] = await Promise.all([
        api.get('/api/attendance/all'),
        api.get('/api/attendance/settings'),
      ]);
      setAllAttendance(allRes.data.records || []);
      setSettings(settingsRes.data);
      if (settingsRes.data) {
        setSettingsForm({
          officeLat: settingsRes.data.officeLat?.toString() || '0',
          officeLng: settingsRes.data.officeLng?.toString() || '0',
          geofenceRadius: settingsRes.data.geofenceRadius?.toString() || '50',
          geofenceMode: settingsRes.data.geofenceMode || 'AUTO',
          autoApproveWithinGeofence: settingsRes.data.autoApproveWithinGeofence !== false,
          requirePhoto: settingsRes.data.requirePhoto !== false,
          allowRemoteCheckIn: settingsRes.data.allowRemoteCheckIn !== false,
          officeStartTime: settingsRes.data.officeStartTime || '09:30',
          officeEndTime: settingsRes.data.officeEndTime || '18:30',
          lateThresholdMinutes: settingsRes.data.lateThresholdMinutes?.toString() || '15',
        });
      }
    } catch (e) {
      console.error('Fetch enterprise data error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(null);
    try {
      const res = await api.put('/api/attendance/settings', settingsForm);
      setSettings(res.data.settings);
      setSettingsSuccess('Geofencing & shift parameters updated successfully.');
      setTimeout(() => {
        setSettingsSuccess(null);
        setSettingsModalOpen(false);
      }, 1500);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const exportCSV = () => {
    if (allAttendance.length === 0) return;
    const headers = ['Date', 'Employee Name', 'Username', 'Department', 'CheckIn Time', 'CheckOut Time', 'Status', 'Late Minutes', 'Note'];
    const rows = allAttendance.map((r) => [
      formatDate(r.date),
      `"${r.user?.firstName || ''} ${r.user?.lastName || ''}"`,
      r.user?.username || '',
      r.user?.department || '',
      r.checkInTime ? `"${formatDateTime(r.checkInTime)}"` : '',
      r.checkOutTime ? `"${formatDateTime(r.checkOutTime)}"` : '',
      r.status,
      r.lateMinutes || 0,
      `"${(r.checkInNote || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(new Set(allAttendance.map((r) => r.user?.department).filter(Boolean)));

  const filteredRecords = allAttendance.filter((r) => {
    const matchesSearch =
      r.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.username?.toLowerCase().includes(search.toLowerCase());

    const matchesDept = departmentFilter === 'ALL' || r.user?.department === departmentFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Settings Summary Banner */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Enterprise Geofence & Shift Rules</span>
                <Badge variant="info">{settings?.geofenceMode || 'AUTO'} Mode</Badge>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Office: Lat {settings?.officeLat || 0}°, Lng {settings?.officeLng || 0}° • Radius: {settings?.geofenceRadius || 50}m • Shift: {settings?.officeStartTime || '09:30'} - {settings?.officeEndTime || '18:30'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {user?.role === 'ADMIN' && (
              <Button variant="outline" size="sm" onClick={() => setSettingsModalOpen(true)}>
                <Settings size={14} className="mr-1.5" />
                Configure Geofence Rules
              </Button>
            )}
            <Button variant="indigo" size="sm" onClick={exportCSV}>
              <Download size={14} className="mr-1.5" />
              Export CSV Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Log Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={20} className="text-indigo-400" />
                <span>Enterprise Master Attendance Log</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Complete company-wide attendance tracking, department filters, and history logs.
              </CardDescription>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dept Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d: any) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

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
            <div className="p-8 text-center text-slate-400 text-xs">Loading enterprise records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No attendance records found.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5">Status</th>
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
                            <span className="text-[10px] text-slate-500 font-mono">@{rec.user?.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium">{rec.user?.department || 'General'}</td>
                      <td className="p-3.5 font-medium">{formatDate(rec.date)}</td>
                      <td className="p-3.5">{formatDateTime(rec.checkInTime)}</td>
                      <td className="p-3.5">{rec.checkOutTime ? formatDateTime(rec.checkOutTime) : '-'}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Geofence Settings Modal */}
      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Admin Geofencing & Work Shift Parameters"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-slate-300 py-2">
          {settingsSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 size={16} />
              <span>{settingsSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Office Latitude</label>
              <input
                type="number"
                step="any"
                value={settingsForm.officeLat}
                onChange={(e) => setSettingsForm({ ...settingsForm, officeLat: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Office Longitude</label>
              <input
                type="number"
                step="any"
                value={settingsForm.officeLng}
                onChange={(e) => setSettingsForm({ ...settingsForm, officeLng: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Geofence Radius (meters)</label>
              <input
                type="number"
                value={settingsForm.geofenceRadius}
                onChange={(e) => setSettingsForm({ ...settingsForm, geofenceRadius: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Late Grace (Minutes)</label>
              <input
                type="number"
                value={settingsForm.lateThresholdMinutes}
                onChange={(e) => setSettingsForm({ ...settingsForm, lateThresholdMinutes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Shift Start Time</label>
              <input
                type="time"
                value={settingsForm.officeStartTime}
                onChange={(e) => setSettingsForm({ ...settingsForm, officeStartTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-400 mb-1">Shift End Time</label>
              <input
                type="time"
                value={settingsForm.officeEndTime}
                onChange={(e) => setSettingsForm({ ...settingsForm, officeEndTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
              />
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSaveSettings} disabled={savingSettings}>
            <Save size={14} className="mr-1.5" />
            {savingSettings ? 'Saving Parameters...' : 'Save Settings'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
