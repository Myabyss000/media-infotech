'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, RefreshCw, Scan, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanning, setScanning] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    setDetectedCode(null);
    setScanning(true);

    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported in this browser context.');
        setScanning(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (_) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err2: any) {
          throw err2;
        }
      }

      if (!mediaStream) {
        throw new Error('Could not acquire camera stream');
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      // Start Barcode Detection Loop
      startScanningLoop(mediaStream);
    } catch (err: any) {
      console.warn('Camera error:', err);
      const isNotReadable =
        err?.name === 'NotReadableError' ||
        err?.message?.includes('NotReadableError') ||
        err?.message?.includes('video source');

      if (isNotReadable) {
        setCameraError('Webcam is busy or locked by another application. Please close other camera tabs and retry.');
      } else {
        setCameraError('Unable to access camera. Please allow camera permissions or use manual scanner.');
      }
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => {
        try { t.stop(); } catch (_) {}
      });
      setStream(null);
    }
    if (videoRef.current) {
      const existing = videoRef.current.srcObject as MediaStream | null;
      if (existing) {
        try {
          existing.getTracks().forEach((t) => {
            try { t.stop(); } catch (_) {}
          });
        } catch (_) {}
      }
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const startScanningLoop = async (currentStream: MediaStream) => {
    // Check if BarcodeDetector is available in window
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'qr_code',
            'upc_a',
            'upc_e',
            'data_matrix',
          ],
        });

        const interval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              if (rawVal) {
                clearInterval(interval);
                handleBarcodeFound(rawVal);
              }
            }
          } catch (e) {}
        }, 300);

        return () => clearInterval(interval);
      } catch (e) {}
    }
  };

  const handleBarcodeFound = (code: string) => {
    setDetectedCode(code);
    stopCamera();
    setTimeout(() => {
      onDetected(code);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Live Camera Barcode Scanner</h2>
              <p className="text-xs text-slate-400">Position barcode or QR label inside the scanner frame.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-video sm:aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Reticle Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
            <div className="relative w-64 h-40 rounded-2xl border-2 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
              <div className="w-full h-0.5 bg-blue-500/80 shadow-[0_0_8px_#3b82f6] animate-bounce" />
            </div>
          </div>

          {/* Camera Controls Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={toggleFacingMode}
              className="p-2.5 rounded-2xl bg-slate-950/80 text-white hover:bg-slate-900 border border-slate-700/80 shadow-lg transition"
              title="Switch Camera (Front / Rear)"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Detected Badge */}
          {detectedCode && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle2 size={42} className="text-emerald-400 animate-bounce" />
              <h3 className="text-sm font-bold text-white">Barcode Detected!</h3>
              <p className="text-base font-mono font-black text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-500/30">
                {detectedCode}
              </p>
              <p className="text-xs text-slate-400">Opening device profile...</p>
            </div>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <AlertCircle size={36} className="text-rose-400" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => startCamera(facingMode)}
                className="text-xs bg-slate-900 border-slate-700"
              >
                Retry Camera
              </Button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Supported: Code128, QR Code, EAN, UPC</span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs bg-slate-900 border-slate-700">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
