'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Clock,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LocateFixed,
  ShieldCheck,
  Zap,
  Info,
  LogOut,
  Send,
  Coffee,
  Play,
  Pause,
  Timer,
  Sparkles,
  ChevronDown,
  FileEdit,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';

function calculateDistanceMeters(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number | null {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === 0 && lon1 === 0) return null;
  if (lat2 === 0 && lon2 === 0) return null;

  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function AttendanceCheckWidget({ onRecordUpdated, onOpenRegularization }: { onRecordUpdated?: () => void; onOpenRegularization?: () => void }) {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live Ticking Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // GPS Location State
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Camera Modal & Capture State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Note State & Check-In Action Mode
  const [actionType, setActionType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [note, setNote] = useState('');

  // Break dropdown menu state
  const [breakMenuOpen, setBreakMenuOpen] = useState(false);
  const [breakSubmitting, setBreakSubmitting] = useState(false);

  useEffect(() => {
    fetchTodayData();
    getGPSLocation();
  }, []);

  // Stable effect to bind stream to the video element
  useEffect(() => {
    if (!cameraActive || !stream) return;

    const rafId = requestAnimationFrame(() => {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.log('Video play error:', err));
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [cameraActive, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracksOnly();
    };
  }, []);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        api.get('/api/attendance/today'),
        api.get('/api/attendance/settings'),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value?.data) {
        setTodayRecord(results[0].value.data.record || null);
        setActiveBreak(results[0].value.data.activeBreak || null);
      }

      if (results[1].status === 'fulfilled' && results[1].value?.data) {
        setSettings(results[1].value.data);
      }
    } catch (e) {
      console.error('Fetch today attendance error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGPSLocation = () => {
    setLocLoading(true);
    setLocError(null);

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      const fallbackLat = settings?.officeLat || 22.6533;
      const fallbackLng = settings?.officeLng || 88.3478;
      setLocation({ lat: fallbackLat, lng: fallbackLng });
      setLocError('Geolocation not supported. Using fallback location.');
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocError(null);
        setLocLoading(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        const fallbackLat = settings?.officeLat || 22.6533;
        const fallbackLng = settings?.officeLng || 88.3478;
        setLocation({
          lat: fallbackLat,
          lng: fallbackLng,
        });
        setLocError(
          err.code === 1
            ? 'GPS blocked (requires HTTPS or localhost). Using office location fallback.'
            : `GPS unavailable. Using office location fallback.`
        );
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const startCamera = async () => {
    setError(null);
    setPhotoPreview(null);
    setPhotoBlob(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Live camera access is not supported. Please use the Upload File button.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError(`Camera error: ${err.message || 'Could not access device camera'}. You can upload a photo file below.`);
      setCameraActive(false);
    }
  };

  const stopTracksOnly = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const stopCamera = () => {
    stopTracksOnly();
    setCameraModalOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setPhotoPreview(URL.createObjectURL(blob));
          stopTracksOnly();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoBlob(file);
    setPhotoPreview(URL.createObjectURL(file));
    stopTracksOnly();
  };

  const handleOpenCheckInModal = () => {
    setActionType('CHECK_IN');
    setCameraModalOpen(true);
    startCamera();
  };

  const handleOpenCheckOutModal = () => {
    setActionType('CHECK_OUT');
    setCameraModalOpen(true);
    startCamera();
  };

  const handleStartBreak = async (type: string) => {
    try {
      setBreakSubmitting(true);
      setError(null);
      setBreakMenuOpen(false);
      const res = await api.post('/api/attendance/break/start', { type });
      setSuccess(res.data.message || `${type} break started`);
      await fetchTodayData();
      onRecordUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start break');
    } finally {
      setBreakSubmitting(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setBreakSubmitting(true);
      setError(null);
      const res = await api.post('/api/attendance/break/end');
      setSuccess(res.data.message || 'Break ended. Work resumed!');
      await fetchTodayData();
      onRecordUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to end break');
    } finally {
      setBreakSubmitting(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!location) {
      setError('GPS coordinates are required. Please enable location services.');
      return;
    }

    if (settings?.requirePhoto && !photoBlob && !photoPreview) {
      setError('Verification photo is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('latitude', location.lat.toString());
    formData.append('longitude', location.lng.toString());
    if (note) formData.append('note', note);

    if (photoBlob) {
      formData.append('photo', photoBlob, 'attendance-photo.jpg');
    }

    try {
      const endpoint = actionType === 'CHECK_IN' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      const method = actionType === 'CHECK_IN' ? 'post' : 'put';

      const res = await api[method](endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(res.data.message || `${actionType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} successful!`);
      setPhotoBlob(null);
      setPhotoPreview(null);
      setNote('');
      stopCamera();

      await fetchTodayData();
      onRecordUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const distance = settings
    ? calculateDistanceMeters(location?.lat, location?.lng, settings.officeLat, settings.officeLng)
    : null;

  const isWithinGeofence = settings && distance !== null ? distance <= settings.geofenceRadius : true;

  const getWorkDuration = () => {
    if (!todayRecord?.checkInTime) return null;
    const start = new Date(todayRecord.checkInTime).getTime();
    const end = todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime).getTime() : currentTime.getTime();
    const diffMs = Math.max(0, end - start);
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getActiveBreakDuration = () => {
    if (!activeBreak?.startTime) return null;
    const start = new Date(activeBreak.startTime).getTime();
    const diffMs = Math.max(0, currentTime.getTime() - start);
    const mins = Math.floor(diffMs / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getProductiveDuration = () => {
    if (!todayRecord?.checkInTime) return null;
    const start = new Date(todayRecord.checkInTime).getTime();
    const end = todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime).getTime() : currentTime.getTime();
    let totalMs = Math.max(0, end - start);

    // Deduct completed breaks
    const completedBreaksMins = todayRecord.totalBreakMinutes || 0;
    let breakMs = completedBreaksMins * 60 * 1000;

    // Deduct currently active break elapsed time
    if (activeBreak?.startTime) {
      breakMs += Math.max(0, currentTime.getTime() - new Date(activeBreak.startTime).getTime());
    }

    const prodMs = Math.max(0, totalMs - breakMs);
    const hrs = Math.floor(prodMs / (1000 * 60 * 60));
    const mins = Math.floor((prodMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

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
    <>
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-800/80 bg-slate-950/40 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Attendance & Live Time Verification</span>
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                    GPS + Photo
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                </CardDescription>
              </div>
            </div>

            {/* Live Clock Display & Quick Regularization Action */}
            <div className="flex items-center space-x-2.5">
              {onOpenRegularization && (
                <Button
                  onClick={onOpenRegularization}
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 px-3 rounded-xl border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 gap-1.5"
                >
                  <FileEdit size={14} className="text-amber-400" />
                  <span className="hidden sm:inline">Regularize Past Day</span>
                </Button>
              )}

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                <div className="font-mono text-sm font-extrabold text-white tracking-widest">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Live Time</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-5">
          {/* Alerts */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* GPS Verification Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <MapPin size={16} className="text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-400 font-medium mr-1.5">GPS Location:</span>
                {locLoading ? (
                  <span className="text-amber-400 animate-pulse font-semibold">Fetching location...</span>
                ) : location ? (
                  <span className="text-white font-mono font-semibold">
                    {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                    {locError && <span className="text-[10px] text-amber-400 font-sans ml-2">({locError.includes('fallback') ? 'Fallback Mode' : locError})</span>}
                  </span>
                ) : locError ? (
                  <span className="text-rose-400 font-semibold">{locError}</span>
                ) : (
                  <span className="text-slate-500">Location inactive</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {distance !== null && (
                <Badge variant={isWithinGeofence ? 'success' : 'warning'}>
                  {isWithinGeofence ? 'In Office' : 'Out of Geofence'} ({distance}m)
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={getGPSLocation}
                disabled={locLoading}
                className="h-8 px-2 text-slate-400 hover:text-white"
                title="Refresh GPS Location"
              >
                <RefreshCw size={14} className={locLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Main Action Content */}
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <RefreshCw size={16} className="animate-spin text-blue-400" />
              <span>Checking attendance status...</span>
            </div>
          ) : !todayRecord ? (
            /* STATE 1: NOT CHECKED IN YET */
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-blue-500/20 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-xl">
                <Zap size={30} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Ready for Today&apos;s Shift</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click below to record your daily check-in with live GPS coordinates and photo snapshot.
                </p>
              </div>
              <Button
                variant="default"
                size="lg"
                onClick={handleOpenCheckInModal}
                className="w-full sm:w-auto px-8 font-bold shadow-xl shadow-blue-600/30"
              >
                <Camera size={18} className="mr-2" />
                <span>Check In Now</span>
              </Button>
            </div>
          ) : (
            /* STATE 2 OR 3: CHECKED IN OR CHECKED OUT */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Check-In Details Card */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Check-In</span>
                    </span>
                    <Badge variant={getStatusBadgeVariant(todayRecord.status)}>
                      {todayRecord.status}
                    </Badge>
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {formatDateTime(todayRecord.checkInTime)}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>Shift Clock Time:</span>
                    <span className="font-mono text-emerald-400 font-bold">{getWorkDuration()}</span>
                  </div>
                </div>

                {/* Net Productive Hours & Break Stats Card */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <Zap size={14} className="text-cyan-400" />
                      <span>Net Productive</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                      {todayRecord.totalBreakMinutes || 0}m break logged
                    </Badge>
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
                    {getProductiveDuration()}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>Active Status:</span>
                    <span className={activeBreak ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                      {activeBreak ? `${activeBreak.type} Break` : todayRecord.checkOutTime ? 'Completed' : 'Working'}
                    </span>
                  </div>
                </div>

                {/* Check-Out / Completed Card */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <LogOut size={14} className="text-amber-400" />
                      <span>Check-Out</span>
                    </span>
                    {todayRecord.checkOutTime && <Badge variant="info">Completed</Badge>}
                  </div>

                  {todayRecord.checkOutTime ? (
                    <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      {formatDateTime(todayRecord.checkOutTime)}
                    </div>
                  ) : (
                    <div className="pt-1">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleOpenCheckOutModal}
                        disabled={Boolean(activeBreak)}
                        className="w-full font-bold shadow-lg h-9"
                      >
                        <LogOut size={15} className="mr-1.5" />
                        <span>Check Out for Day</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* BREAK MANAGEMENT TOOLBAR (Only when checked in and not checked out) */}
              {!todayRecord.checkOutTime && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950/90 via-slate-900 to-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeBreak ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                      <Coffee size={18} />
                    </div>
                    <div>
                      {activeBreak ? (
                        <div>
                          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>{activeBreak.type} Break in Progress</span>
                            <span className="font-mono text-amber-200 font-extrabold ml-1">
                              ({getActiveBreakDuration()})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Started at {new Date(activeBreak.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-slate-200">Work Shift in Progress</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Take a break whenever you step away for lunch, tea, or a meeting.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Break Action Buttons */}
                  <div className="flex items-center gap-2">
                    {activeBreak ? (
                      <Button
                        onClick={handleEndBreak}
                        disabled={breakSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 rounded-xl font-bold shadow-lg shadow-emerald-600/30 gap-1.5"
                      >
                        <Play size={14} />
                        <span>Resume Work</span>
                      </Button>
                    ) : (
                      <div className="relative">
                        <Button
                          onClick={() => setBreakMenuOpen(!breakMenuOpen)}
                          disabled={breakSubmitting}
                          variant="outline"
                          className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs h-9 px-3.5 rounded-xl font-semibold gap-1.5"
                        >
                          <Pause size={14} />
                          <span>Take Break</span>
                          <ChevronDown size={14} />
                        </Button>

                        {breakMenuOpen && (
                          <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl space-y-1">
                            <div className="text-[10px] font-semibold text-slate-400 px-2.5 py-1 uppercase tracking-wider border-b border-slate-800">
                              Select Break Type
                            </div>
                            {[
                              { label: '🥪 Lunch Break', type: 'LUNCH' },
                              { label: '☕ Tea / Coffee', type: 'TEA' },
                              { label: '🤝 Client Meeting', type: 'MEETING' },
                              { label: '🏃 Personal Break', type: 'PERSONAL' },
                              { label: '📌 Other Break', type: 'OTHER' },
                            ].map((item) => (
                              <button
                                key={item.type}
                                onClick={() => handleStartBreak(item.type)}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-200 hover:bg-purple-500/20 hover:text-purple-200 transition font-medium flex items-center justify-between"
                              >
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera & Verification Modal */}
      <Modal
        isOpen={cameraModalOpen}
        onClose={stopCamera}
        title={`${actionType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} Verification`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 py-2">
          {/* Camera Viewfinder / Photo Preview */}
          <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
            {cameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform -scale-x-100"
                autoPlay
                playsInline
                muted
              />
            ) : photoPreview ? (
              <div className="relative w-full h-full">
                <img src={photoPreview} alt="Captured preview" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center space-x-1">
                  <CheckCircle2 size={12} />
                  <span>Photo Ready</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs space-y-2 p-4">
                <Camera size={36} className="mx-auto opacity-40" />
                <span>Live camera inactive or access restricted.</span>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            {cameraActive && (
              <Button
                variant="default"
                size="sm"
                onClick={capturePhoto}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-md shadow-xl"
              >
                <Camera size={14} className="mr-1.5" />
                <span>Snap Verification Photo</span>
              </Button>
            )}
          </div>

          {/* Action options: Retake or Upload File */}
          <div className="flex items-center justify-between text-xs pt-1">
            {photoPreview ? (
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              >
                <Camera size={14} className="mr-1.5" />
                <span>Retake Photo</span>
              </Button>
            ) : !cameraActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              >
                <Camera size={14} className="mr-1.5" />
                <span>Start Live Camera</span>
              </Button>
            ) : <div />}

            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs transition"
            >
              <span>📁 Upload Photo File</span>
            </button>
          </div>

          {/* Verification Meta */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Location:</span>
              <span className="font-mono text-blue-400">
                {location ? `${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°` : 'Pending GPS'}
              </span>
            </div>
            {distance !== null && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Distance to Office:</span>
                <span className={isWithinGeofence ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {distance}m ({isWithinGeofence ? 'Geofence Passed' : 'Remote Justification Required'})
                </span>
              </div>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Work Note / Off-Site Justification (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Working from Client Office / Field Duty"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={stopCamera}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleFormSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : `Submit ${actionType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}`}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
