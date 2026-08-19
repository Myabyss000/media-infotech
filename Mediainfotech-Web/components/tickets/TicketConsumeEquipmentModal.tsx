'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Wrench,
  Barcode,
  Camera,
  Upload,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileImage,
  PackageCheck,
  RefreshCw,
  Loader2,
  Search,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartBarcodeScannerModal } from '@/components/inventory/SmartBarcodeScannerModal';
import { BrowserMultiFormatReader } from '@zxing/library';

interface TicketConsumeEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber?: string;
  preselectedItem?: any | null;
  onSuccess: (newComment?: any) => void;
}

export function TicketConsumeEquipmentModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  preselectedItem,
  onSuccess,
}: TicketConsumeEquipmentModalProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [isDecodingPhoto, setIsDecodingPhoto] = useState(false);

  // Verified Equipment state
  const [verifiedItem, setVerifiedItem] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // GPS Geolocation state
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Form states
  const [notes, setNotes] = useState('');
  const [proofPhotoFile, setProofPhotoFile] = useState<File | null>(null);
  const [proofPhotoPreview, setProofPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-fetch GPS on opening
  useEffect(() => {
    if (isOpen) {
      if (preselectedItem) {
        setBarcodeInput(preselectedItem.barcode || '');
        setVerifiedItem(preselectedItem.inventoryItem || preselectedItem);
      } else {
        setBarcodeInput('');
        setVerifiedItem(null);
      }
      setLookupError(null);
      setSubmitError(null);
      setNotes('');
      setProofPhotoFile(null);
      setProofPhotoPreview(null);
      detectGpsLocation();
    }
  }, [isOpen, preselectedItem]);

  // GPS Geolocation helper
  const detectGpsLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setFetchingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);

        let address = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              address = data.display_name;
            }
          }
        } catch (_) {}

        setGpsLocation({ lat, lng, accuracy, address });
        setFetchingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Live lookup device by barcode
  const handleLookupBarcode = async (codeToLookup: string) => {
    const trimmed = codeToLookup.trim().toUpperCase();
    if (!trimmed) return;

    try {
      setLookupLoading(true);
      setLookupError(null);
      setBarcodeInput(trimmed);

      const res = await api.post('/api/inventory/lookup-serials', {
        barcodes: [trimmed],
      });

      const found = res.data?.items?.[0] || res.data?.found?.[0];
      if (found) {
        setVerifiedItem(found);
      } else {
        setVerifiedItem(null);
        setLookupError(`Barcode "${trimmed}" was not found in inventory database.`);
      }
    } catch (err: any) {
      console.error('Lookup barcode error:', err);
      setVerifiedItem(null);
      setLookupError(err.response?.data?.error || 'Failed to lookup barcode in inventory');
    } finally {
      setLookupLoading(false);
    }
  };

  // Decode barcode from uploaded image file using ZXing
  const handleBarcodePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingPhoto(true);
    setLookupError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const codeReader = new BrowserMultiFormatReader();
          const img = new Image();
          img.src = dataUrl;
          img.onload = async () => {
            try {
              const result = await codeReader.decodeFromImageElement(img);
              if (result && result.getText()) {
                const text = result.getText().trim().toUpperCase();
                handleLookupBarcode(text);
              } else {
                setLookupError('Could not decode barcode from photo. Please enter serial manually or try another photo.');
              }
            } catch (decodeErr) {
              setLookupError('No valid barcode detected in image. Please ensure photo is clear or type serial manually.');
            } finally {
              setIsDecodingPhoto(false);
            }
          };
        } catch (err) {
          setLookupError('Error processing image.');
          setIsDecodingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLookupError('Failed to read image file.');
      setIsDecodingPhoto(false);
    }
  };

  // Handle proof photo selection
  const handleSelectProofPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofPhotoFile(file);
    const url = URL.createObjectURL(file);
    setProofPhotoPreview(url);
  };

  // Handle Submit Equipment Consumption
  const handleSubmitConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) {
      setSubmitError('Please scan or enter a product barcode serial.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const formData = new FormData();
      formData.append('barcode', barcodeInput.trim().toUpperCase());
      if (notes.trim()) formData.append('notes', notes.trim());
      if (gpsLocation) {
        formData.append('lat', String(gpsLocation.lat));
        formData.append('lng', String(gpsLocation.lng));
        formData.append('accuracy', String(gpsLocation.accuracy));
        if (gpsLocation.address) formData.append('address', gpsLocation.address);
      }
      if (proofPhotoFile) {
        formData.append('photo', proofPhotoFile);
      }

      const res = await api.post(`/api/tickets/${ticketId}/consume-inventory`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess(res.data?.comment);
      onClose();
    } catch (err: any) {
      console.error('Consume inventory error:', err);
      setSubmitError(err.response?.data?.error || 'Failed to mark equipment as used on ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Install & Consume Equipment on Ticket</h2>
                {ticketNumber && (
                  <Badge variant="info" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">
                    #{ticketNumber}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Scan hardware barcode, tag live GPS coordinates, and log equipment as installed for this service ticket.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitConsumption} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {submitError && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {/* BARCODE SCANNER ROW */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Product Barcode / Serial Number *
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    if (verifiedItem) setVerifiedItem(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupBarcode(barcodeInput);
                    }
                  }}
                  placeholder="Scan barcode gun or type serial (e.g. CAM-4K-001)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none"
                  autoFocus
                />
                <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              <Button
                type="button"
                onClick={() => handleLookupBarcode(barcodeInput)}
                disabled={lookupLoading || !barcodeInput.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl"
              >
                {lookupLoading ? <RefreshCw size={13} className="animate-spin" /> : 'Verify'}
              </Button>

              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition shrink-0"
                title="Scan Live Camera"
              >
                <Camera size={16} />
              </button>

              <button
                type="button"
                onClick={() => barcodeUploadInputRef.current?.click()}
                disabled={isDecodingPhoto}
                className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 transition shrink-0"
                title="Upload Barcode Photo"
              >
                {isDecodingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              </button>

              <input
                ref={barcodeUploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleBarcodePhotoUpload}
                className="hidden"
              />
            </div>

            {lookupError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{lookupError}</span>
              </div>
            )}

            {/* Verified Item Card */}
            {verifiedItem && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">{verifiedItem.deviceName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Model: {verifiedItem.modelNumber || 'Hardware'} • Category: {verifiedItem.category || 'Equipment'}
                      </p>
                    </div>
                  </div>

                  <Badge variant="success" className="text-[10px]">
                    Verified in Stock
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono pt-1 border-t border-emerald-900/60 text-emerald-300">
                  <span>Serial: <strong>{verifiedItem.barcode}</strong></span>
                  <span>•</span>
                  <span>Condition: <strong>{verifiedItem.condition}</strong></span>
                  <span>•</span>
                  <span>Location: {verifiedItem.location || 'HQ Stock'}</span>
                </div>
              </div>
            )}
          </div>

          {/* AUDIT & SECURITY: LIVE GPS & TIMESTAMP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Live GPS Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <MapPin size={12} />
                  <span>Installation GPS Coordinates</span>
                </span>
                <button
                  type="button"
                  onClick={detectGpsLocation}
                  disabled={fetchingGps}
                  className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw size={10} className={fetchingGps ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {fetchingGps ? (
                <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px] py-1">
                  <Loader2 size={12} className="animate-spin text-blue-400 shrink-0" />
                  <span>Acquiring on-site GPS lock...</span>
                </div>
              ) : gpsLocation ? (
                <div className="space-y-0.5">
                  <p className="text-slate-200 font-semibold font-mono text-[11px]">
                    {gpsLocation.lat.toFixed(6)}°, {gpsLocation.lng.toFixed(6)}°
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {gpsLocation.address || `±${gpsLocation.accuracy}m Accuracy Verified`}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  GPS lock not acquired. Click refresh to retry.
                </p>
              )}
            </div>

            {/* Live Timestamp Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="flex items-center gap-1 text-blue-400 font-bold uppercase text-[10px]">
                <Clock size={12} />
                <span>Installation Timestamp</span>
              </span>
              <p className="text-slate-200 font-semibold font-mono text-[11px] pt-1">
                {currentTimestamp}
              </p>
              <p className="text-[10px] text-slate-500">
                Logged to inventory audit trail automatically
              </p>
            </div>
          </div>

          {/* INSTALLATION REMARKS */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Installation Remarks / Site Position
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Mounted Dome Camera in North Entrance ceiling, connected to POE Port 4 on NVR."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
            />
          </div>

          {/* OPTIONAL PROOF PHOTO UPLOAD */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileImage size={14} className="text-purple-400" />
                <span>Attach On-Site Proof Photo (Optional)</span>
              </label>

              {proofPhotoFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProofPhotoFile(null);
                    setProofPhotoPreview(null);
                  }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {proofPhotoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 max-w-xs">
                <img
                  src={proofPhotoPreview}
                  alt="Proof preview"
                  className="w-full max-h-40 object-cover"
                />
                <div className="p-2 bg-slate-950 text-[10px] text-slate-300 truncate">
                  {proofPhotoFile?.name}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full p-3 rounded-2xl border border-dashed border-slate-800 hover:border-purple-500/50 bg-slate-900/40 text-slate-400 hover:text-white transition flex items-center justify-center gap-2 text-xs"
              >
                <Camera size={15} />
                <span>Click to capture or upload on-site installation photo</span>
              </button>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectProofPhoto}
              className="hidden"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              Cancel
            </button>

            <Button
              type="submit"
              disabled={submitting || !barcodeInput.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20"
            >
              {submitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <PackageCheck size={15} />
              )}
              <span>Mark Equipment as Consumed & Used</span>
            </Button>
          </div>
        </form>
      </div>

      {/* ===== CAMERA BARCODE SCANNER ===== */}
      <SmartBarcodeScannerModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onDetected={(code) => {
          handleLookupBarcode(code);
        }}
      />
    </div>
  );
}
