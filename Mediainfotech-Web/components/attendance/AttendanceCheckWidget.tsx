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

export function AttendanceCheckWidget({ onRecordUpdated }: { onRecordUpdated?: () => void }) {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<any>(null);
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

  // Note State & Check-In Action Mode
  const [actionType, setActionType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchTodayData();
    getGPSLocation();
  }, []);

  // Stable effect to bind stream to the video element
  useEffect(() => {
    if (!cameraActive || !stream) return;

    // Use rAF to wait for the Modal to mount the video element in the DOM
    const rafId = requestAnimationFrame(() => {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.log('Video play error:', err));
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [cameraActive, stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const [todayRes, settingsRes] = await Promise.all([
        api.get('/api/attendance/today'),
        api.get('/api/attendance/settings'),
      ]);
      setTodayRecord(todayRes.data.record);
      setSettings(settingsRes.data);
    } catch (e) {
      console.error('Fetch today attendance error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGPSLocation = () => {
    setLocLoading(true);
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError('Geolocation not supported');
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
        setLocError('GPS Access Denied. Enable location.');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Camera Management
  const stopTracksOnly = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    setStream(null);
    setCameraActive(false);
  };

  const stopCamera = () => {
    stopTracksOnly();
    setCameraModalOpen(false);
  };

  const startCamera = async () => {
    setError(null);
    setPhotoPreview(null);
    setPhotoBlob(null);
    setCameraModalOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Unable to access live camera. You can upload a verification photo instead.');
      setCameraActive(false);
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
      const previewUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoPreview(previewUrl);

      canvas.toBlob(
        (blob) => {
          if (blob) setPhotoBlob(blob);
        },
        'image/jpeg',
        0.85
      );
    }
    stopTracksOnly();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoBlob(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      stopTracksOnly();
    }
  };

  const handleOpenCheckInModal = () => {
    setActionType('CHECK_IN');
    setPhotoPreview(null);
    setPhotoBlob(null);
    if (settings?.requirePhoto !== false) {
      startCamera();
    } else {
      setCameraModalOpen(true);
    }
  };

  const handleOpenCheckOutModal = () => {
    setActionType('CHECK_OUT');
    setPhotoPreview(null);
    setPhotoBlob(null);
    if (settings?.requirePhoto !== false) {
      startCamera();
    } else {
      setCameraModalOpen(true);
    }
  };

  const handleFormSubmit = async () => {
    if (!location) {
      setError('GPS location is required. Click refresh location and try again.');
      return;
    }

    if (settings?.requirePhoto !== false && !photoBlob && !photoPreview) {
      setError('A verification photo is required for attendance.');
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
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/80 bg-slate-950/40 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Attendance Verification</span>
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                    GPS + Photo
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                </CardDescription>
              </div>
            </div>

            {/* Live Clock Display */}
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                <div className="font-mono text-sm font-extrabold text-white tracking-widest">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Live Time</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Notifications */}
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
                <span className="text-slate-400 font-medium">GPS Verification: </span>
                {locLoading ? (
                  <span className="text-amber-400 animate-pulse font-semibold">Fetching location...</span>
                ) : locError ? (
                  <span className="text-rose-400 font-semibold">{locError}</span>
                ) : location ? (
                  <span className="text-white font-mono font-semibold">
                    {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                  </span>
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
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-blue-500/20 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-xl">
                <Zap size={30} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Ready for Today&apos;s Shift</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click below to record your daily attendance with live GPS location and photo verification.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check-In Details Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Check-In Recorded</span>
                  </span>
                  <Badge variant={getStatusBadgeVariant(todayRecord.status)}>
                    {todayRecord.status}
                  </Badge>
                </div>
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  {formatDateTime(todayRecord.checkInTime)}
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Work Shift Timer:</span>
                  <span className="font-mono text-emerald-400 font-bold">{getWorkDuration()}</span>
                </div>
              </div>

              {/* Check-Out / Completed Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <LogOut size={14} className="text-amber-400" />
                    <span>Check-Out Status</span>
                  </span>
                  {todayRecord.checkOutTime && <Badge variant="info">Completed</Badge>}
                </div>

                {todayRecord.checkOutTime ? (
                  <div className="text-2xl font-extrabold text-white tracking-tight">
                    {formatDateTime(todayRecord.checkOutTime)}
                  </div>
                ) : (
                  <div className="pt-2">
                    <Button
                      variant="success"
                      size="default"
                      onClick={handleOpenCheckOutModal}
                      className="w-full font-bold shadow-lg"
                    >
                      <LogOut size={16} className="mr-2" />
                      <span>Check Out Now</span>
                    </Button>
                  </div>
                )}
              </div>
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

            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs transition">
              <input type="file" accept="image/*" capture="user" onChange={handleFileUpload} className="hidden" />
              <span>📁 Upload Photo File</span>
            </label>
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
