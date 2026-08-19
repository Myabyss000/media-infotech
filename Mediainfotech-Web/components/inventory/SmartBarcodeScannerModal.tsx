'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  X,
  Camera,
  Upload,
  Barcode,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileImage,
  ArrowRight,
  FlipHorizontal,
  Zap,
  ListPlus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SmartBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
  onBatchDetected?: (barcodes: string[]) => void;
  mode?: 'single' | 'continuous';
  initialBatch?: string[];
}

// 1D and 2D barcode formats to support
const SUPPORTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.UPC_EAN_EXTENSION,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX,
];

// Constant empty array to avoid new reference creation on every render
const DEFAULT_EMPTY_BATCH: string[] = [];

export function SmartBarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
  onBatchDetected,
  mode = 'single',
  initialBatch = DEFAULT_EMPTY_BATCH,
}: SmartBarcodeScannerProps) {
  const isContinuous = mode === 'continuous';
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'gun'>('camera');

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mirrorView, setMirrorView] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Video & stream references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isPausedRef = useRef(false);

  // Keep parent callback references stable
  const onDetectedRef = useRef(onDetected);
  const onBatchDetectedRef = useRef(onBatchDetected);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onBatchDetectedRef.current = onBatchDetected;
  }, [onBatchDetected]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Upload state
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadDecoding, setUploadDecoding] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Scanner gun state
  const [manualCode, setManualCode] = useState('');
  const gunInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const snapInputRef = useRef<HTMLInputElement | null>(null);

  // Detection feedback state
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchAlert, setBatchAlert] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Initialize ZXing code reader with hints once
  useEffect(() => {
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    codeReaderRef.current = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 100,
      delayBetweenScanSuccess: 500,
    });

    return () => {
      stopCamera();
    };
  }, []);

  // Track previous isOpen state to only initialize batch queue on open transitions
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setBatchQueue(initialBatch && initialBatch.length > 0 ? [...initialBatch] : []);
      setDetectedCode(null);
      setBatchAlert(null);
      isPausedRef.current = false;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialBatch]);

  // Audio beep feedback
  const playScanBeep = useCallback((isError = false) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isError) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (_) {}
  }, []);

  // Clean stop for camera stream & decoder
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (_) {}
      controlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      const existingStream = videoRef.current.srcObject as MediaStream | null;
      if (existingStream) {
        try {
          existingStream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (_) {}
          });
        } catch (_) {}
      }
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  // Multi-tier camera acquisition helper with driver unlock retry
  const getCameraStream = async (facing: 'user' | 'environment', retryCount = 0): Promise<MediaStream> => {
    // Tier 1: Ideal facingMode and standard resolution
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1: any) {
      // Tier 2: Unconstrained video (bypasses unsupported facingMode/aspect constraints)
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2: any) {
        // Tier 3: Enumerate video input devices directly
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          if (videoDevices.length > 0) {
            return await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: videoDevices[0].deviceId } },
              audio: false,
            });
          }
        } catch (_) {}

        // If NotReadableError on Windows (driver releasing previous handle), wait 250ms and retry once
        const isNotReadable =
          err1?.name === 'NotReadableError' ||
          err2?.name === 'NotReadableError' ||
          err1?.message?.includes('video source') ||
          err2?.message?.includes('video source');

        if (isNotReadable && retryCount === 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          return await getCameraStream(facing, 1);
        }

        throw err2 || err1;
      }
    }
  };

  // Handle barcode detection
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) return;

      if (isContinuous) {
        // Continuous mode: add to batchQueue
        if (isPausedRef.current) return;

        setBatchQueue((prev) => {
          if (prev.includes(trimmed)) {
            playScanBeep(true);
            setBatchAlert({ message: `Duplicate: "${trimmed}" already in batch!`, type: 'warning' });
            setTimeout(() => setBatchAlert(null), 2500);
            return prev;
          }

          playScanBeep(false);
          const next = [...prev, trimmed];
          setBatchAlert({ message: `Scanned #${next.length}: "${trimmed}"`, type: 'success' });
          setTimeout(() => setBatchAlert(null), 2000);
          return next;
        });

        // 1.2s debounce before next scan attempt
        isPausedRef.current = true;
        setTimeout(() => {
          isPausedRef.current = false;
        }, 1200);
      } else {
        // Single mode: trigger onDetected and close
        setDetectedCode(trimmed);
        playScanBeep(false);
        stopCamera();

        setTimeout(() => {
          onDetectedRef.current(trimmed);
          onCloseRef.current();
        }, 600);
      }
    },
    [isContinuous, playScanBeep, stopCamera]
  );

  // Commit batch and close
  const handleCommitBatch = () => {
    if (onBatchDetectedRef.current) {
      onBatchDetectedRef.current(batchQueue);
    }
    stopCamera();
    onCloseRef.current();
  };

  const handleRemoveFromBatch = (indexToRemove: number) => {
    setBatchQueue((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Start live webcam feed & continuous decoder
  const startCamera = useCallback(async () => {
    stopCamera();

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera access is not supported by your browser.');
      return;
    }

    setCameraLoading(true);
    setCameraError(null);
    setCameraActive(false);

    try {
      // Brief pause to allow OS DirectShow / camera driver to complete release
      await new Promise((resolve) => setTimeout(resolve, 80));

      const mediaStream = await getCameraStream(facingMode);
      streamRef.current = mediaStream;

      const video = videoRef.current;
      if (!video) {
        setCameraLoading(false);
        return;
      }

      setCameraActive(true);
      setCameraLoading(false);

      // Attach ZXing continuous decoder to the media stream and video element
      if (codeReaderRef.current) {
        try {
          const controls = await codeReaderRef.current.decodeFromStream(
            mediaStream,
            video,
            (result) => {
              if (result) {
                const text = result.getText();
                if (text) {
                  handleBarcodeScanned(text);
                }
              }
            }
          );
          controlsRef.current = controls;
        } catch (decodeErr) {
          console.warn('Decode stream attach notice:', decodeErr);
        }
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      const isNotReadable =
        err?.name === 'NotReadableError' ||
        err?.message?.includes('NotReadableError') ||
        err?.message?.includes('video source') ||
        err?.name === 'TrackStartError';

      if (isNotReadable) {
        setCameraError(
          'Your webcam is currently locked by another application (or browser tab). Click "Snap Photo" below or close other camera apps.'
        );
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Please allow camera access in your browser address bar.'
        );
      } else {
        setCameraError(
          `Camera could not be started (${err?.name || 'Error'}). Use "Snap Photo" or "Upload Photo" below.`
        );
      }
      setCameraActive(false);
      setCameraLoading(false);
    }
  }, [facingMode, handleBarcodeScanned, stopCamera]);

  // Manage modal open/close & tab changes
  useEffect(() => {
    if (isOpen) {
      setDetectedCode(null);
      setCameraError(null);
      setUploadError(null);

      if (activeTab === 'camera') {
        const timer = setTimeout(() => {
          startCamera();
        }, 80);
        return () => {
          clearTimeout(timer);
          stopCamera();
        };
      } else if (activeTab === 'gun') {
        stopCamera();
        setTimeout(() => gunInputRef.current?.focus(), 150);
      } else if (activeTab === 'upload') {
        stopCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Decode from an uploaded image or camera snapshot file
  const handleImageFile = async (file: File) => {
    setUploadError(null);
    setUploadDecoding(true);

    const imageUrl = URL.createObjectURL(file);
    setUploadedImagePreview(imageUrl);

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      if (!codeReaderRef.current) {
        const hints = new Map<DecodeHintType, any>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
        hints.set(DecodeHintType.TRY_HARDER, true);
        codeReaderRef.current = new BrowserMultiFormatReader(hints);
      }

      const result = await codeReaderRef.current.decodeFromImageElement(img);
      if (result && result.getText()) {
        handleBarcodeScanned(result.getText());
      } else {
        setUploadError('No valid EAN-13, Code 128, UPC, or QR barcode found in this photo.');
      }
    } catch (err: any) {
      console.warn('Image decode error:', err);
      setUploadError('No readable barcode recognized. Please ensure the barcode is clear and well-lit.');
    } finally {
      setUploadDecoding(false);
    }
  };

  // Flip facing mode between front/rear
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden inputs for native camera snap and upload */}
        <input
          ref={snapInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Barcode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  {isContinuous ? 'Continuous Multi-Barcode Scanner' : 'Universal Barcode Scanner'}
                </h2>
                {isContinuous && (
                  <Badge variant="info" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">
                    Queue: {batchQueue.length}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isContinuous
                  ? 'Keep scanning boxes — barcodes append to your batch automatically'
                  : 'EAN-13, Code 128, UPC, Code 39, QR & Hardware Tags'}
              </p>
            </div>
          </div>
          <button
            onClick={isContinuous && batchQueue.length > 0 ? handleCommitBatch : () => { stopCamera(); onCloseRef.current(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-1.5 m-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'camera'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera size={14} />
            <span>Live Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload size={14} />
            <span>Upload Photo</span>
          </button>

          <button
            onClick={() => setActiveTab('gun')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'gun'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Barcode size={14} />
            <span>Scanner Gun</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-0 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: LIVE CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* Standard Video Element (Full Viewfinder) */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${mirrorView ? 'transform -scale-x-100' : ''}`}
                />

                {!cameraActive && !cameraLoading && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-500 text-xs space-y-2 p-6 bg-slate-950">
                    <Camera size={36} className="mx-auto opacity-40 animate-pulse" />
                    <span>Connecting camera sensor...</span>
                  </div>
                )}

                {/* Laser Reticle Overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                    <div className="relative w-64 h-36 rounded-2xl border-2 border-blue-400/90 shadow-[0_0_25px_rgba(59,130,246,0.6)] flex items-center justify-center overflow-hidden">
                      <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_12px_#3b82f6] animate-pulse" />
                      <span className="absolute bottom-2 text-[10px] font-mono text-blue-200 bg-black/80 px-2 py-0.5 rounded border border-blue-500/30">
                        {isContinuous ? 'Point at next barcode' : 'Align Barcode Here'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Continuous Scan Alert Toast */}
                {batchAlert && (
                  <div
                    className={`absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-30 ${
                      batchAlert.type === 'success'
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-amber-600 text-white shadow-amber-600/30'
                    }`}
                  >
                    {batchAlert.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{batchAlert.message}</span>
                  </div>
                )}

                {/* Loading overlay */}
                {cameraLoading && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2 z-10">
                    <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <span>Starting camera feed...</span>
                  </div>
                )}

                {/* Error overlay */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center space-y-3 z-10 overflow-y-auto">
                    <AlertCircle size={32} className="text-rose-400 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Camera Unavailable</p>
                      <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed">{cameraError}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                      <Button
                        size="sm"
                        onClick={() => snapInputRef.current?.click()}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 shadow-lg shadow-emerald-500/20"
                      >
                        <Camera size={13} />
                        <span>📸 Snap Photo with Camera</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startCamera}
                        className="text-xs bg-slate-900 border-slate-700 hover:text-white"
                      >
                        <RefreshCw size={12} className="mr-1" />
                        Retry Live
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setActiveTab('upload')}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1"
                      >
                        <Upload size={12} />
                        <span>Upload Photo</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Single Mode Detected Feedback Overlay */}
                {!isContinuous && detectedCode && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-2 animate-in zoom-in-95 z-20">
                    <CheckCircle2 size={44} className="text-emerald-400 animate-bounce" />
                    <h3 className="text-sm font-bold text-white">Barcode Identified!</h3>
                    <p className="text-base font-mono font-black text-emerald-400 bg-emerald-950/80 px-3.5 py-1.5 rounded-xl border border-emerald-500/30">
                      {detectedCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snapInputRef.current?.click()}
                    className="text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white font-semibold gap-1"
                  >
                    <Camera size={13} />
                    <span>Snap Photo</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMirrorView(!mirrorView)}
                    className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                      mirrorView
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Toggle Mirror View"
                  >
                    <FlipHorizontal size={13} />
                    <span className="hidden sm:inline">Mirror</span>
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleFacingMode}
                    className="text-xs bg-slate-900 border-slate-700 text-slate-400 hover:text-white gap-1"
                    title="Switch Front/Rear Camera"
                  >
                    <RefreshCw size={12} />
                    <span className="hidden sm:inline">Flip Cam</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startCamera}
                    className="text-xs bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    title="Restart Camera"
                  >
                    <RefreshCw size={12} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-3xl bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-blue-500 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-3 group"
              >
                <div className="p-4 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition">
                  <FileImage size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Click or Drag &amp; Drop Barcode Image</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload any photo of EAN-13, Code 128, UPC, QR, or product packaging
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs bg-slate-900 border-slate-700">
                    Browse File
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      snapInputRef.current?.click();
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                  >
                    <Camera size={12} />
                    <span>Take New Photo</span>
                  </Button>
                </div>
              </div>

              {uploadDecoding && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-xs text-blue-400">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <span>Scanning image for EAN-13 &amp; Code 128...</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCANNER GUN & MANUAL ENTRY */}
          {activeTab === 'gun' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Barcode size={18} />
                  <span>Physical Scanner Gun Ready</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Point your handheld USB / Bluetooth scanner gun at any hardware barcode and pull the trigger.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) {
                    handleBarcodeScanned(manualCode.trim());
                    setManualCode('');
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Scanner Input / Serial Number / EAN-13
                  </label>
                  <input
                    ref={gunInputRef}
                    type="text"
                    autoFocus
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Scan with handheld gun or type code..."
                    className="w-full px-4 py-3 bg-slate-950 border-2 border-blue-500/60 rounded-2xl text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-blue-500/20"
                  >
                    <span>{isContinuous ? 'Add to Batch Queue' : 'Lookup Product'}</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Continuous Mode Live Scanned Queue Tray */}
          {isContinuous && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ListPlus size={14} className="text-blue-400" />
                  <span>Scanned Batch Queue ({batchQueue.length} items)</span>
                </span>
                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchQueue([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {batchQueue.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No barcodes scanned yet. Point camera or scan gun at any box to start collecting.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                  {batchQueue.map((code, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs font-mono font-bold shadow-sm"
                    >
                      <span className="text-[10px] text-blue-400 opacity-70">#{idx + 1}</span>
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromBatch(idx)}
                        className="text-blue-400 hover:text-rose-300 transition"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info & Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Supported: EAN-13, Code 128, UPC, Code 39, QR, ITF</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                onCloseRef.current();
              }}
              className="text-xs bg-slate-900 border-slate-700"
            >
              Cancel
            </Button>
            {isContinuous && (
              <Button
                size="sm"
                onClick={handleCommitBatch}
                disabled={batchQueue.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <CheckCircle2 size={14} />
                <span>Done ({batchQueue.length} Scanned)</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
