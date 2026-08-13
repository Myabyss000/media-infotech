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

  // Inspection Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<any>(null);
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [activeInspectTab, setActiveInspectTab] = useState<'checkin' | 'checkout'>('checkin');

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
      setAllAttendance(allRes.data.records || allRes.data.data || []);
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

  const handleInspect = (record: any) => {
    setInspectedRecord(record);
    setActiveInspectTab('checkin');
    setInspectModalOpen(true);
  };

  const handlePhotoZoom = (url: string) => {
    setZoomedPhoto(url);
    setPhotoZoomOpen(true);
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

  const getMapEmbedUrl = (lat: number, lng: number) => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Team Active</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{summary?.totalUsers ?? summary?.stats?.totalStaff ?? 0}</h3>
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
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{summary?.totalCheckedIn ?? summary?.stats?.totalCheckedInToday ?? 0}</h3>
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
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{summary?.totalLate ?? summary?.stats?.lateToday ?? 0}</h3>
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
                Real-time daily check-in log across all team members. Click <strong>Inspect</strong> to view verification photos and GPS location.
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
                    <th className="p-3.5">Photo</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5">Punctuality</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredRecords.map((rec) => {
                    const photoUrl = getPhotoUrl(rec.checkInPhoto);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition group">
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
                        <td className="p-3.5">
                          {photoUrl ? (
                            <button
                              onClick={() => handlePhotoZoom(photoUrl)}
                              className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all hover:scale-110 cursor-pointer group/photo"
                              title="Click to zoom"
                            >
                              <img src={photoUrl} alt="Check-in" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-600">
                              <Camera size={14} />
                            </div>
                          )}
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
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInspect(rec)}
                              className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 opacity-80 group-hover:opacity-100"
                            >
                              <Eye size={14} className="mr-1" />
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
                  {inspectedRecord.isLate && (
                    <Badge variant="warning">+{inspectedRecord.lateMinutes}m Late</Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  <Calendar size={11} className="inline mr-1" />
                  {inspectedRecord.date ? new Date(inspectedRecord.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Check-in / Check-out Tab Toggle */}
            <div className="flex rounded-xl bg-slate-950/60 border border-slate-800 p-1">
              <button
                onClick={() => setActiveInspectTab('checkin')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                  activeInspectTab === 'checkin'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <CheckCircle2 size={13} className="inline mr-1.5" />
                Check-In Evidence
              </button>
              <button
                onClick={() => setActiveInspectTab('checkout')}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                  activeInspectTab === 'checkout'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                } ${!inspectedRecord.checkOutTime ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!inspectedRecord.checkOutTime}
              >
                <Navigation size={13} className="inline mr-1.5" />
                Check-Out Evidence
                {!inspectedRecord.checkOutTime && <span className="ml-1 text-[9px] opacity-70">(N/A)</span>}
              </button>
            </div>

            {/* Evidence Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Photo Evidence */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Camera size={13} className="text-blue-400" />
                  {activeInspectTab === 'checkin' ? 'Check-In' : 'Check-Out'} Verification Photo
                </h4>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                  {(() => {
                    const photo = activeInspectTab === 'checkin'
                      ? getPhotoUrl(inspectedRecord.checkInPhoto)
                      : getPhotoUrl(inspectedRecord.checkOutPhoto);
                    if (photo) {
                      return (
                        <>
                          <img
                            src={photo}
                            alt={`${activeInspectTab} photo`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => handlePhotoZoom(photo)}
                          />
                          {/* Timestamp overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white/90 font-mono font-semibold">
                                {formatDateTime(
                                  activeInspectTab === 'checkin'
                                    ? inspectedRecord.checkInTime
                                    : inspectedRecord.checkOutTime
                                )}
                              </span>
                              <button
                                onClick={() => handlePhotoZoom(photo)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                              >
                                <ExternalLink size={10} />
                                Full Size
                              </button>
                            </div>
                          </div>
                          {/* Verified badge */}
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Verified
                          </div>
                        </>
                      );
                    }
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                        <ImageIcon size={40} className="opacity-30" />
                        <span className="text-xs">No photo captured</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right: Map + Location Details */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin size={13} className="text-emerald-400" />
                  GPS Location Evidence
                </h4>

                {(() => {
                  const lat = activeInspectTab === 'checkin' ? inspectedRecord.checkInLat : inspectedRecord.checkOutLat;
                  const lng = activeInspectTab === 'checkin' ? inspectedRecord.checkInLng : inspectedRecord.checkOutLng;

                  if (lat && lng) {
                    return (
                      <div className="space-y-3">
                        {/* Map Embed */}
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                          <iframe
                            src={getMapEmbedUrl(lat, lng)}
                            className="w-full h-full border-0"
                            title="Employee location"
                            loading="lazy"
                          />
                          {/* Coordinates overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white/90 font-mono font-semibold">
                                {lat.toFixed(6)}°, {lng.toFixed(6)}°
                              </span>
                              <a
                                href={getGoogleMapsUrl(lat, lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                              >
                                <Globe size={10} />
                                Open in Maps
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Location Data Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Latitude</p>
                            <p className="text-xs font-mono text-white font-bold mt-0.5">{lat.toFixed(6)}°</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Longitude</p>
                            <p className="text-xs font-mono text-white font-bold mt-0.5">{lng.toFixed(6)}°</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-700 flex flex-col items-center justify-center text-slate-600 space-y-2">
                      <MapPin size={40} className="opacity-30" />
                      <span className="text-xs">No GPS data recorded</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Notes & Address */}
            {(() => {
              const note = activeInspectTab === 'checkin' ? inspectedRecord.checkInNote : inspectedRecord.checkOutNote;
              const address = activeInspectTab === 'checkin' ? inspectedRecord.checkInAddress : inspectedRecord.checkOutAddress;
              if (!note && !address) return null;

              return (
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  {address && (
                    <div className="flex items-start space-x-2 text-xs">
                      <Navigation size={13} className="text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-slate-400 font-semibold">Address: </span>
                        <span className="text-slate-200">{address}</span>
                      </div>
                    </div>
                  )}
                  {note && (
                    <div className="flex items-start space-x-2 text-xs">
                      <FileText size={13} className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-slate-400 font-semibold">Note: </span>
                        <span className="text-amber-300 italic">{note}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Timing Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Check-In</p>
                <p className="text-sm font-bold text-white mt-1">{formatDateTime(inspectedRecord.checkInTime)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Check-Out</p>
                <p className="text-sm font-bold text-white mt-1">
                  {inspectedRecord.checkOutTime ? formatDateTime(inspectedRecord.checkOutTime) : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Shift</p>
                <p className="text-sm font-bold text-blue-400 mt-1">
                  {inspectedRecord.user?.shiftStartTime || '09:30'} – {inspectedRecord.user?.shiftEndTime || '18:30'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Work Hours</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  {inspectedRecord.totalHours ? `${inspectedRecord.totalHours.toFixed(1)}h` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
        <ModalFooter>
          {inspectedRecord?.status === 'PENDING' && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  setInspectModalOpen(false);
                  handleOpenReviewModal(inspectedRecord, 'APPROVED');
                }}
              >
                <Check size={14} className="mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setInspectModalOpen(false);
                  handleOpenReviewModal(inspectedRecord, 'REJECTED');
                }}
              >
                <X size={14} className="mr-1" />
                Reject
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setInspectModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* ===== PHOTO ZOOM MODAL ===== */}
      <Modal
        isOpen={photoZoomOpen}
        onClose={() => setPhotoZoomOpen(false)}
        title="Photo Evidence — Full Resolution"
        maxWidth="max-w-4xl"
      >
        {zoomedPhoto && (
          <div className="py-2">
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black">
              <img
                src={zoomedPhoto}
                alt="Full resolution evidence"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setPhotoZoomOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* ===== APPROVAL CONFIRMATION DIALOG ===== */}
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

          {/* Quick Photo & Location Preview in Approval Modal */}
          {targetRecord && (
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              {getPhotoUrl(targetRecord.checkInPhoto) && (
                <img
                  src={getPhotoUrl(targetRecord.checkInPhoto)!}
                  alt="Check-in"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
              )}
              <div>
                <p className="text-[11px] text-slate-300">
                  <Clock size={11} className="inline mr-1" />
                  {formatDateTime(targetRecord.checkInTime)}
                </p>
                {targetRecord.checkInLat && targetRecord.checkInLng && (
                  <p className="text-[11px] text-slate-400">
                    <MapPin size={11} className="inline mr-1" />
                    {targetRecord.checkInLat.toFixed(4)}°, {targetRecord.checkInLng.toFixed(4)}°
                  </p>
                )}
              </div>
            </div>
          )}

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
