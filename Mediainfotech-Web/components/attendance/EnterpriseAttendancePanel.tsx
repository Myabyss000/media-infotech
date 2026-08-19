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
  Crosshair,
  LocateFixed,
  Compass,
  Globe,
  Minus,
  Plus,
  ExternalLink,
  Sparkles,
  Radio,
  Copy,
  Check,
  Sliders,
  Layers,
  HelpCircle,
  RefreshCw,
  Navigation,
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
  
  // Auto GPS Detection State
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsDetectSuccess, setGpsDetectSuccess] = useState<string | null>(null);
  const [gpsDetectError, setGpsDetectError] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

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

  // Auto-Detect Office GPS using Browser Geolocation
  const handleAutoDetectGPS = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsDetectError('Geolocation is not supported by your browser.');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setGpsDetectError('Browser blocked GPS: Geolocation requires HTTPS or localhost. Switch to localhost or enable Chrome insecure origin flag.');
      return;
    }
    setDetectingGPS(true);
    setGpsDetectError(null);
    setGpsDetectSuccess(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        setSettingsForm((prev) => ({
          ...prev,
          officeLat: lat.toString(),
          officeLng: lng.toString(),
        }));
        setGpsAccuracy(accuracy);
        setGpsDetectSuccess(`Office GPS locked: ${lat}, ${lng} (±${accuracy}m accuracy)`);
        setDetectingGPS(false);
      },
      (err) => {
        console.warn('Auto GPS detection error:', err);
        if (err.code === 1) {
          setGpsDetectError('Location permission denied. Please allow location access in your browser settings.');
        } else if (err.code === 2) {
          setGpsDetectError('Location unavailable. Please check your device GPS / Network connection.');
        } else if (err.code === 3) {
          setGpsDetectError('Location request timed out. Please retry.');
        } else {
          setGpsDetectError('Unable to detect GPS location. Please check your device location services.');
        }
        setDetectingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Smart Coordinate Nudge Steppers (+- 0.0001 deg ~ 11 meters)
  const adjustCoordinate = (field: 'officeLat' | 'officeLng', delta: number) => {
    setSettingsForm((prev) => {
      const current = parseFloat(prev[field]) || 0;
      const updated = (current + delta).toFixed(6);
      return { ...prev, [field]: updated };
    });
  };

  // Smart Stepper for Radius / Late Minutes
  const adjustNumberField = (
    field: 'geofenceRadius' | 'lateThresholdMinutes',
    delta: number,
    min = 0,
    max = 5000
  ) => {
    setSettingsForm((prev) => {
      const current = parseInt(prev[field], 10) || 0;
      const nextVal = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [field]: nextVal.toString() };
    });
  };

  const handleCopyCoords = () => {
    if (settingsForm.officeLat && settingsForm.officeLng) {
      navigator.clipboard.writeText(`${settingsForm.officeLat}, ${settingsForm.officeLng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const calculateShiftDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight shift
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hours}h ${mins > 0 ? `${mins}m` : '00m'}`;
    } catch {
      return '';
    }
  };

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
      setAllAttendance(allRes.data.records || allRes.data.data || []);
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
        icon={<MapPin className="text-blue-400" size={20} />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 text-xs text-slate-300 py-1">
          {/* Success Notification */}
          {settingsSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2.5 shadow-lg shadow-emerald-500/5 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span className="font-medium">{settingsSuccess}</span>
            </div>
          )}

          {/* =========================================================================
             SECTION 1: AUTO GEOLOCATION ADD / LOCK SYSTEM
             ========================================================================= */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                  {detectingGPS ? (
                    <RefreshCw size={20} className="animate-spin text-blue-400" />
                  ) : (
                    <LocateFixed size={20} className="text-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Auto-Detect Current Office GPS</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Live Precision
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Auto-locks your current device coordinates and populates Latitude & Longitude.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoDetectGPS}
                disabled={detectingGPS}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 shrink-0 cursor-pointer active:scale-95"
              >
                {detectingGPS ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Acquiring Lock...</span>
                  </>
                ) : (
                  <>
                    <Crosshair size={14} />
                    <span>Auto-Lock Current GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* GPS Detection Feedback Alert */}
            {gpsDetectSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span className="text-[11px] font-medium">{gpsDetectSuccess}</span>
                </div>
                {settingsForm.officeLat && settingsForm.officeLng && (
                  <a
                    href={`https://www.google.com/maps?q=${settingsForm.officeLat},${settingsForm.officeLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1 shrink-0"
                  >
                    <span>View on Map</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}

            {gpsDetectError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2 animate-in fade-in">
                <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">{gpsDetectError}</span>
              </div>
            )}
          </div>

          {/* =========================================================================
             SECTION 2: OFFICE COORDINATES (SMART MICRO-STEPPERS)
             ========================================================================= */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Compass size={15} className="text-blue-400" />
                <span>Office GPS Coordinates</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition flex items-center space-x-1"
                  title="Copy Latitude, Longitude"
                >
                  {copiedCoords ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                {settingsForm.officeLat && settingsForm.officeLng && (
                  <a
                    href={`https://www.google.com/maps?q=${settingsForm.officeLat},${settingsForm.officeLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-blue-400 font-medium transition flex items-center space-x-1"
                  >
                    <span>Maps</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Latitude Smart Stepper */}
              <div>
                <label className="block font-semibold text-slate-400 text-[11px] mb-1.5 flex items-center justify-between">
                  <span>Office Latitude (°N/S)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Micro-Nudge ±0.0001°</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition">
                  <button
                    type="button"
                    onClick={() => adjustCoordinate('officeLat', -0.0001)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-r border-slate-800 text-sm"
                    title="Nudge -0.0001°"
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 22.646213"
                    value={settingsForm.officeLat}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeLat: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent text-white text-xs font-mono text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustCoordinate('officeLat', 0.0001)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-l border-slate-800 text-sm"
                    title="Nudge +0.0001°"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Longitude Smart Stepper */}
              <div>
                <label className="block font-semibold text-slate-400 text-[11px] mb-1.5 flex items-center justify-between">
                  <span>Office Longitude (°E/W)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Micro-Nudge ±0.0001°</span>
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition">
                  <button
                    type="button"
                    onClick={() => adjustCoordinate('officeLng', -0.0001)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-r border-slate-800 text-sm"
                    title="Nudge -0.0001°"
                  >
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 88.341766"
                    value={settingsForm.officeLng}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeLng: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent text-white text-xs font-mono text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustCoordinate('officeLng', 0.0001)}
                    className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-l border-slate-800 text-sm"
                    title="Nudge +0.0001°"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
             SECTION 3: GEOFENCE RADIUS & LATE GRACE (SMART SPINNERS & PRESETS)
             ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Smart Geofence Radius Stepper & Presets */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5">
                  <Radio size={14} className="text-blue-400" />
                  <span>Geofence Radius</span>
                </label>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/30">
                  {settingsForm.geofenceRadius || '0'} meters
                </span>
              </div>

              {/* Stepper Control */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500 transition">
                <button
                  type="button"
                  onClick={() => adjustNumberField('geofenceRadius', -10, 5, 2000)}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-r border-slate-800 text-xs flex items-center gap-1"
                >
                  <Minus size={13} />
                  <span className="text-[10px]">10m</span>
                </button>
                <input
                  type="number"
                  min="5"
                  max="2000"
                  value={settingsForm.geofenceRadius}
                  onChange={(e) => setSettingsForm({ ...settingsForm, geofenceRadius: e.target.value })}
                  className="w-full px-2 py-2 bg-transparent text-white text-xs font-mono text-center font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustNumberField('geofenceRadius', 10, 5, 2000)}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-l border-slate-800 text-xs flex items-center gap-1"
                >
                  <span className="text-[10px]">10m</span>
                  <Plus size={13} />
                </button>
              </div>

              {/* Visual Slider */}
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={Number(settingsForm.geofenceRadius) || 50}
                onChange={(e) => setSettingsForm({ ...settingsForm, geofenceRadius: e.target.value })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '30m', title: 'Strict' },
                  { label: '50m', title: 'Standard' },
                  { label: '100m', title: 'Office' },
                  { label: '250m', title: 'Campus' },
                  { label: '500m', title: 'Zone' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, geofenceRadius: preset.label.replace('m', '') })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition border ${
                      settingsForm.geofenceRadius === preset.label.replace('m', '')
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    {preset.label} ({preset.title})
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Late Grace Minutes Stepper & Presets */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  <span>Late Arrival Grace</span>
                </label>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                  {settingsForm.lateThresholdMinutes || '0'} mins
                </span>
              </div>

              {/* Stepper Control */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500 transition">
                <button
                  type="button"
                  onClick={() => adjustNumberField('lateThresholdMinutes', -5, 0, 180)}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-r border-slate-800 text-xs flex items-center gap-1"
                >
                  <Minus size={13} />
                  <span className="text-[10px]">5m</span>
                </button>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={settingsForm.lateThresholdMinutes}
                  onChange={(e) => setSettingsForm({ ...settingsForm, lateThresholdMinutes: e.target.value })}
                  className="w-full px-2 py-2 bg-transparent text-white text-xs font-mono text-center font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustNumberField('lateThresholdMinutes', 5, 0, 180)}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition active:bg-slate-700 font-bold border-l border-slate-800 text-xs flex items-center gap-1"
                >
                  <span className="text-[10px]">5m</span>
                  <Plus size={13} />
                </button>
              </div>

              {/* Visual Slider */}
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={Number(settingsForm.lateThresholdMinutes) || 15}
                onChange={(e) => setSettingsForm({ ...settingsForm, lateThresholdMinutes: e.target.value })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '0 min', val: '0' },
                  { label: '10 min', val: '10' },
                  { label: '15 min', val: '15' },
                  { label: '30 min', val: '30' },
                  { label: '45 min', val: '45' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, lateThresholdMinutes: preset.val })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition border ${
                      settingsForm.lateThresholdMinutes === preset.val
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-500/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* =========================================================================
             SECTION 4: WORK SHIFT SCHEDULE
             ========================================================================= */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-400" />
                <span>Work Shift Schedule</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30">
                {calculateShiftDuration(settingsForm.officeStartTime, settingsForm.officeEndTime)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-400 text-[11px] mb-1">Shift Start Time</label>
                <input
                  type="time"
                  value={settingsForm.officeStartTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, officeStartTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 text-[11px] mb-1">Shift End Time</label>
                <input
                  type="time"
                  value={settingsForm.officeEndTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, officeEndTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-medium focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
             SECTION 5: VERIFICATION & POLICY TOGGLES
             ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="block text-[11px] font-bold text-white">Auto-Approve Inside</span>
                <span className="block text-[10px] text-slate-400">Within geofence</span>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.autoApproveWithinGeofence}
                onChange={(e) => setSettingsForm({ ...settingsForm, autoApproveWithinGeofence: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="block text-[11px] font-bold text-white">Require Selfie</span>
                <span className="block text-[10px] text-slate-400">Live camera proof</span>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.requirePhoto}
                onChange={(e) => setSettingsForm({ ...settingsForm, requirePhoto: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="pr-2">
                <span className="block text-[11px] font-bold text-white">Allow Remote</span>
                <span className="block text-[10px] text-slate-400">Outside office</span>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.allowRemoteCheckIn}
                onChange={(e) => setSettingsForm({ ...settingsForm, allowRemoteCheckIn: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold shadow-lg shadow-blue-500/20"
          >
            <Save size={14} className="mr-1.5" />
            {savingSettings ? 'Saving Parameters...' : 'Save Parameters'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
