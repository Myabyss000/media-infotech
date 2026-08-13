'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  ShieldCheck,
  Settings as SettingsIcon,
  Sliders,
  Target,
  LocateFixed,
  Shield,
  Users,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Modal, ModalFooter } from '@/components/ui/Modal';

// Haversine distance calculator in meters
function calculateDistanceMeters(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number | null {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === 0 && lon1 === 0) return null;
  if (lat2 === 0 && lon2 === 0) return null;

  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // GPS Location State
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Note State
  const [note, setNote] = useState('');

  // Admin Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
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
    fetchData();
    getGPSLocation();
  }, []);

  const fetchData = async () => {
    try {
      const [todayRes, settingsRes] = await Promise.all([
        api.get('/api/attendance/today'),
        api.get('/api/attendance/settings'),
      ]);
      setTodayRecord(todayRes.data.record);
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getGPSLocation = () => {
    setLocLoading(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocLoading(false);
      },
      (err) => {
        setLocError('Could not fetch location. Please enable location services.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }, [cameraActive, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      setError('Failed to access camera. Please allow camera access.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoPreview(dataUrl);

      canvas.toBlob(
        (blob) => {
          if (blob) setPhotoBlob(blob);
        },
        'image/jpeg',
        0.85
      );
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const resetCamera = () => {
    setPhotoPreview(null);
    setPhotoBlob(null);
    startCamera();
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!location) {
      setError('GPS location is required for check-in verification.');
      return;
    }

    if (settings?.requirePhoto && !photoBlob && !photoPreview) {
      setError('Please capture a photo to verify your identity.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('note', note);
      if (photoBlob) {
        formData.append('photo', photoBlob, 'checkin-photo.jpg');
      }

      const res = await api.post('/api/attendance/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(res.data.message || 'Check-in recorded successfully!');
      setTodayRecord(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!location) {
      setError('GPS location is required for check-out verification.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('note', note);
      if (photoBlob) {
        formData.append('photo', photoBlob, 'checkout-photo.jpg');
      }

      const res = await api.put('/api/attendance/check-out', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(res.data.message || 'Check-out recorded successfully!');
      setTodayRecord(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit check-out');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.put('/api/attendance/settings', settingsForm);
      setSettings(res.data.settings);
      setSettingsModalOpen(false);
      setSuccess('Attendance & Geofencing settings updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const captureAdminCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setSettingsForm((prev) => ({
        ...prev,
        officeLat: pos.coords.latitude.toFixed(6),
        officeLng: pos.coords.longitude.toFixed(6),
      }));
    });
  };

  // Compute live distance
  const currentDistanceMeters =
    location && settings && (settings.officeLat !== 0 || settings.officeLng !== 0)
      ? calculateDistanceMeters(location.lat, location.lng, settings.officeLat, settings.officeLng)
      : null;

  const geofenceRadius = settings?.geofenceRadius || 50;
  const isWithinRadius = currentDistanceMeters !== null ? currentDistanceMeters <= geofenceRadius : null;

  const canSeeGeofenceRadar =
    hasPermission('attendance', 'update') ||
    hasPermission('attendance', 'approve') ||
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'HR';

  if (loading) {
    return <div className="text-slate-400 text-xs p-6">Loading attendance verification panel...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <span>Attendance Verification</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Photo verification & GPS location radius enforcement ({geofenceRadius}m limit).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Link to Today's Attendees & Master Roster */}
          {hasPermission('attendance', 'read') && (
            <Link
              href="/attendance/all"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-md shadow-blue-500/20"
            >
              <Users size={16} />
              <span>All Records</span>
            </Link>
          )}

          {/* Admin Location Settings Button - Restricted to ADMIN */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center space-x-2 transition shadow-md"
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </button>
          )}

          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Clock size={14} className="text-blue-400" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Geofence Radar Status Card - Only visible to authorized management users */}
      {canSeeGeofenceRadar && settings && (settings.officeLat !== 0 || settings.officeLng !== 0) && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="text-blue-400" size={18} />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Geofence Radar Status ({geofenceRadius}m Radius)
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  settings.geofenceMode === 'AUTO'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                Mode: {settings.geofenceMode === 'AUTO' ? 'AUTO (Strict Enforce)' : 'MANUAL (Advisory)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Office Coordinates</p>
              <p className="font-mono text-white font-bold text-xs mt-0.5">
                {settings.officeLat.toFixed(4)}, {settings.officeLng.toFixed(4)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Current Distance</p>
              <p className="font-mono text-white font-bold text-xs mt-0.5">
                {currentDistanceMeters !== null ? `${currentDistanceMeters} meters away` : 'Calculating GPS...'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Range Status</p>
              {isWithinRadius !== null ? (
                isWithinRadius ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1 mt-0.5">
                    <CheckCircle2 size={14} />
                    <span>Within {geofenceRadius}m Range</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center space-x-1 mt-0.5">
                    <AlertCircle size={14} />
                    <span>Outside {geofenceRadius}m Range</span>
                  </span>
                )
              ) : (
                <span className="text-slate-400 font-mono mt-0.5">Acquiring GPS...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Status Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Status</p>
            <p className="text-lg font-extrabold text-white mt-0.5">
              {todayRecord ? (
                todayRecord.checkOutTime ? (
                  <span className="text-blue-400">Shift Completed</span>
                ) : (
                  <span className="text-emerald-400">Checked In</span>
                )
              ) : (
                <span className="text-slate-400">Not Checked In</span>
              )}
            </p>
          </div>

          {todayRecord && (
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${
                  todayRecord.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : todayRecord.status === 'REJECTED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {todayRecord.status}
              </span>
            </div>
          )}
        </div>

        {/* Verification & Submission Form */}
        <form onSubmit={todayRecord ? handleCheckOut : handleCheckIn} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: GPS Location Verification */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <MapPin size={18} className="text-blue-400" />
                  <span>GPS Location Verification</span>
                </h3>
                <button
                  type="button"
                  onClick={getGPSLocation}
                  className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center space-x-1"
                >
                  <RefreshCw size={12} className={locLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {location ? (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-xs">
                  <p className="text-slate-300 font-bold">
                    Lat: <span className="text-emerald-400">{location.lat.toFixed(6)}</span> | Lng:{' '}
                    <span className="text-emerald-400">{location.lng.toFixed(6)}</span>
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline inline-block"
                  >
                    View location on Google Maps →
                  </a>
                </div>
              ) : locError ? (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
                  {locError}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
                  Acquiring current GPS coordinates...
                </div>
              )}
            </div>

            {/* Step 2: Camera Identity Verification */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Camera size={18} className="text-blue-400" />
                <span>Identity Photo Snapshot</span>
              </h3>

              <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Snapshot Preview" className="w-full h-full object-cover" />
                ) : cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <Camera size={32} className="mx-auto text-slate-600" />
                    <p className="text-xs text-slate-400">Live Camera Verification Required</p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex items-center space-x-2">
                {!cameraActive && !photoPreview && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
                  >
                    Start Camera
                  </button>
                )}

                {cameraActive && (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold transition shadow-md"
                  >
                    Capture Photo
                  </button>
                )}

                {photoPreview && (
                  <button
                    type="button"
                    onClick={resetCamera}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Retake Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Justification & Note Section */}
          <div className="space-y-3 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <FileText size={18} className="text-blue-400" />
              <span>Justification & Note</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Check {!todayRecord ? 'In' : 'Out'} Note / Work Location
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Working from Client site at Sector 62 / Office premises"
                rows={3}
                className="w-full p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white">Geofence Compliance Rules:</p>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-slate-400">
                <li>Check-ins are validated against designated office location ({geofenceRadius}m radius limit).</li>
                <li>In AUTO mode, off-site check-ins require a remote justification note.</li>
              </ul>
            </div>

            {!todayRecord ? (
              <button
                type="submit"
                disabled={submitting || !location}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition"
              >
                {submitting ? 'Verifying...' : 'Submit Check-In'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !location}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-amber-500/30 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 transition"
              >
                {submitting ? 'Recording...' : 'Submit Check-Out'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Admin Geofence & Location Settings Modal */}
      {user?.role === 'ADMIN' && (
        <Modal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          title="Attendance & Geofencing Settings"
          icon={<Shield className="text-blue-400" size={20} />}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-slate-300 text-[11px]">
              <span className="font-semibold text-white">Admin Privileges Enforced:</span> Only users with the{' '}
              <span className="text-blue-400 font-mono font-bold">ADMIN</span> role can modify office GPS coordinates, geofence radius, and AUTO/MANUAL enforcement modes.
            </div>

            {/* Office Coordinates Section */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white uppercase text-[11px] flex items-center space-x-1.5">
                  <MapPin size={14} className="text-blue-400" />
                  <span>Office Target Coordinates</span>
                </label>
                <button
                  type="button"
                  onClick={captureAdminCurrentLocation}
                  className="text-blue-400 hover:text-blue-300 transition text-[11px] font-semibold flex items-center space-x-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg"
                >
                  <LocateFixed size={12} />
                  <span>Capture My Current Location</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={settingsForm.officeLat}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeLat: e.target.value })}
                    placeholder="e.g. 28.6139"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={settingsForm.officeLng}
                    onChange={(e) => setSettingsForm({ ...settingsForm, officeLng: e.target.value })}
                    placeholder="e.g. 77.2090"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Geofence Radius Input */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <label className="font-bold text-white uppercase text-[11px] flex items-center space-x-1.5">
                <Sliders size={14} className="text-blue-400" />
                <span>Allowed Radius Limit (Meters)</span>
              </label>
              <input
                type="number"
                value={settingsForm.geofenceRadius}
                onChange={(e) => setSettingsForm({ ...settingsForm, geofenceRadius: e.target.value })}
                placeholder="e.g. 50"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-[10px] text-slate-500">
                Default: 50 meters radius. Employees further than this distance will be flagged or blocked based on enforcement mode.
              </p>
            </div>

            {/* Enforcement Mode Selector */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <label className="font-bold text-white uppercase text-[11px]">Geofence Enforcement Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, geofenceMode: 'AUTO' })}
                  className={`p-3 rounded-2xl border text-left transition ${
                    settingsForm.geofenceMode === 'AUTO'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-bold text-xs">AUTO (Strict)</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Blocks check-in if &gt; {settingsForm.geofenceRadius}m away unless remote note is provided.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, geofenceMode: 'MANUAL' })}
                  className={`p-3 rounded-2xl border text-left transition ${
                    settingsForm.geofenceMode === 'MANUAL'
                      ? 'bg-amber-600/20 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-bold text-xs">MANUAL (Advisory)</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Allows check-in from any distance; flags out-of-bounds check-ins for review.
                  </p>
                </button>
              </div>
            </div>

            {/* Toggles & Verification Rules */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-xs">Auto-Approve Check-ins within Geofence</p>
                  <p className="text-[10px] text-slate-400">Automatically approve check-in status when within target radius limit</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoApproveWithinGeofence}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoApproveWithinGeofence: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <p className="font-semibold text-white text-xs">Require Live Photo Capture</p>
                  <p className="text-[10px] text-slate-400">Users must capture live camera image during check-in</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.requirePhoto}
                  onChange={(e) => setSettingsForm({ ...settingsForm, requirePhoto: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div>
                  <p className="font-semibold text-white text-xs">Allow Remote / Out-of-Office Requests</p>
                  <p className="text-[10px] text-slate-400">Permit out-of-bounds check-ins with mandatory note</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.allowRemoteCheckIn}
                  onChange={(e) => setSettingsForm({ ...settingsForm, allowRemoteCheckIn: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            <ModalFooter
              onClose={() => setSettingsModalOpen(false)}
              submitLabel="Save Geofence Settings"
              submitting={savingSettings}
              variant="blue"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
