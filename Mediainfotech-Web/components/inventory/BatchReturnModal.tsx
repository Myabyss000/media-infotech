'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  X,
  ArrowRightLeft,
  Barcode,
  Camera,
  ClipboardPaste,
  Trash2,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Building,
  UserCheck,
  UsersRound,
  Truck,
  Wrench,
  Search,
  ChevronRight,
  Layers,
  Clock,
  MapPin,
  FileCheck,
  Sparkles,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartBarcodeScannerModal } from './SmartBarcodeScannerModal';

interface BatchReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchReturnModal({
  isOpen,
  onClose,
  onSuccess,
}: BatchReturnModalProps) {
  const [manifestItems, setManifestItems] = useState<any[]>([]);
  const [rapidBarcodeInput, setRapidBarcodeInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [activeCustodyModalOpen, setActiveCustodyModalOpen] = useState(false);
  const [activeCustodyGroups, setActiveCustodyGroups] = useState<any[]>([]);
  const [activeCustodyLoading, setActiveCustodyLoading] = useState(false);

  // Filters within manifest
  const [manifestFilterTab, setManifestFilterTab] = useState<'ALL' | 'ASSIGNED' | 'INSTALLED' | 'MUST_RETURN'>('ALL');

  // Return options
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnLocation, setReturnLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rapidInputRef = useRef<HTMLInputElement | null>(null);

  // Sound effects
  const playBeep = (isError = false) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (isError) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.12);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      setManifestItems([]);
      setRapidBarcodeInput('');
      setNotes('');
      setReturnLocation('');
      setErrorMsg(null);
      setManifestFilterTab('ALL');
      fetchActiveCustodyCandidates();
      setTimeout(() => rapidInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const fetchActiveCustodyCandidates = async () => {
    try {
      setActiveCustodyLoading(true);
      const res = await api.get('/api/inventory/return-candidates');
      setActiveCustodyGroups(res.data?.custodianGroups || []);
    } catch (err) {
      console.warn('Failed to load active custody roster:', err);
    } finally {
      setActiveCustodyLoading(false);
    }
  };

  // Lookup scanned barcodes and append to manifest
  const handleLookupAndAddBarcodes = async (barcodesToAdd: string[]) => {
    const cleaned = Array.from(
      new Set(
        barcodesToAdd
          .map((b) => b.trim().toUpperCase())
          .filter((b) => b.length > 0)
      )
    );

    if (cleaned.length === 0) return;

    const existingBarcodes = new Set(manifestItems.map((m) => m.barcode));
    const toFetch = cleaned.filter((b) => !existingBarcodes.has(b));

    if (toFetch.length === 0) {
      playBeep(true);
      setErrorMsg('All scanned item(s) are already in the return manifest.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    try {
      setLookingUp(true);
      setErrorMsg(null);

      const res = await api.post('/api/inventory/lookup-serials', { barcodes: toFetch });
      const foundItems: any[] = res.data?.items || [];
      const missingBarcodes: string[] = res.data?.missingBarcodes || [];

      if (foundItems.length > 0) {
        playBeep(false);
        setManifestItems((prev) => [...prev, ...foundItems]);
      }

      if (missingBarcodes.length > 0) {
        playBeep(true);
        setErrorMsg(`${missingBarcodes.length} barcode(s) not registered in inventory: ${missingBarcodes.join(', ')}`);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Barcode lookup error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to verify barcodes');
    } finally {
      setLookingUp(false);
      setRapidBarcodeInput('');
      setTimeout(() => rapidInputRef.current?.focus(), 50);
    }
  };

  const handleRapidInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapidBarcodeInput.trim()) return;
    handleLookupAndAddBarcodes([rapidBarcodeInput]);
  };

  const handleRemoveFromManifest = (idToRemove: string) => {
    setManifestItems((prev) => prev.filter((m) => m.id !== idToRemove));
  };

  const handleApplyPasteSerials = () => {
    if (!pasteRawText.trim()) return;
    const tokens = pasteRawText
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    setPasteModalOpen(false);
    setPasteRawText('');
    handleLookupAndAddBarcodes(tokens);
  };

  const handleAddGroupToManifest = (groupItems: any[]) => {
    const existingBarcodes = new Set(manifestItems.map((m) => m.barcode));
    const toAdd = groupItems.filter((i) => !existingBarcodes.has(i.barcode));
    if (toAdd.length === 0) {
      alert('All items in this group are already in the return manifest.');
      return;
    }
    setManifestItems((prev) => [...prev, ...toAdd]);
    setActiveCustodyModalOpen(false);
    playBeep(false);
  };

  // Submit Batch Return
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manifestItems.length === 0) {
      setErrorMsg('Please scan or add at least one product serial to check in.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        barcodes: manifestItems.map((m) => m.barcode),
        condition: returnCondition,
        location: returnLocation || undefined,
        notes: notes || undefined,
      };

      await api.post('/api/inventory/batch-return', payload);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Batch return error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to check in equipment items');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Compute Categorization Counts
  const assignedItems = manifestItems.filter((i) => i.custodyType === 'ASSIGNED_FIELD' || (i.status === 'ASSIGNED' && !i.isInstalled && !i.mustReturn));
  const installedItems = manifestItems.filter((i) => i.isInstalled || i.custodyType === 'INSTALLED_ON_SITE');
  const mustReturnItems = manifestItems.filter((i) => i.mustReturn || i.custodyType === 'MUST_RETURN');
  const inStockItems = manifestItems.filter((i) => i.status === 'IN_STOCK' || i.custodyType === 'IN_STOCK');

  const filteredManifest = manifestItems.filter((item) => {
    if (manifestFilterTab === 'ALL') return true;
    if (manifestFilterTab === 'ASSIGNED') return item.custodyType === 'ASSIGNED_FIELD' || (item.status === 'ASSIGNED' && !item.isInstalled && !item.mustReturn);
    if (manifestFilterTab === 'INSTALLED') return item.isInstalled || item.custodyType === 'INSTALLED_ON_SITE';
    if (manifestFilterTab === 'MUST_RETURN') return item.mustReturn || item.custodyType === 'MUST_RETURN';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-tight">Multi-Serial Batch Return & Check-In</h2>
                <Badge variant="success" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold px-2 py-0.5">
                  {manifestItems.length} Scanned
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect equipment, classify active field custody vs installed on-site hardware, and restock warehouse inventory.
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
        <form onSubmit={handleCheckIn} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* CUSTODY DISCLOSURE KPI METRIC BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Assigned in Field */}
            <div
              onClick={() => setManifestFilterTab('ASSIGNED')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                manifestFilterTab === 'ASSIGNED'
                  ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                  : 'bg-slate-950/60 border-slate-800 hover:border-blue-500/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck size={13} />
                  <span>Assigned (Field)</span>
                </span>
                <span className="text-sm font-extrabold">{assignedItems.length}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">In technician / van custody</p>
            </div>

            {/* 2. Installed On-Site */}
            <div
              onClick={() => setManifestFilterTab('INSTALLED')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                manifestFilterTab === 'INSTALLED'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                  : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Building size={13} />
                  <span>Installed On-Site</span>
                </span>
                <span className="text-sm font-extrabold">{installedItems.length}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">Active at client premises</p>
            </div>

            {/* 3. Must Return */}
            <div
              onClick={() => setManifestFilterTab('MUST_RETURN')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                manifestFilterTab === 'MUST_RETURN'
                  ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                  : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  <span>Must Return</span>
                </span>
                <span className="text-sm font-extrabold">{mustReturnItems.length}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">Task completed / return due</p>
            </div>

            {/* 4. Total Manifest Items */}
            <div
              onClick={() => setManifestFilterTab('ALL')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                manifestFilterTab === 'ALL'
                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                  : 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} />
                  <span>Total Scanned</span>
                </span>
                <span className="text-sm font-extrabold">{manifestItems.length}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">All queue items</p>
            </div>
          </div>

          {/* DECOMMISSION WARNING BANNER */}
          {installedItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle size={17} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">Decommission Alert: </span>
                <span>
                  {installedItems.length} item(s) in this batch are registered as installed on client premises or attached to active tickets. Checking them in will unregister them from client sites and restock them into warehouse inventory.
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: SCANNER CONTROLS & BATCH INPUT */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode size={14} className="text-emerald-400" />
                <span>Scan or Select Hardware to Check In *</span>
              </label>

              <div className="flex items-center gap-2">
                {/* Pick from Active Field Custody */}
                <button
                  type="button"
                  onClick={() => setActiveCustodyModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Browse all hardware currently dispatched to technicians & vans"
                >
                  <UsersRound size={13} />
                  <span>Browse Field Custody</span>
                </button>

                {manifestItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setManifestItems([])}
                    className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold ml-1"
                  >
                    <Trash2 size={12} />
                    <span>Clear Manifest ({manifestItems.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Input Bar Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={rapidInputRef}
                  type="text"
                  value={rapidBarcodeInput}
                  onChange={(e) => setRapidBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRapidInputSubmit(e);
                    }
                  }}
                  placeholder="Scan barcode gun or type serial (e.g. CAM-4K-001)... [Press Enter]"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none"
                  disabled={lookingUp}
                  autoFocus
                />
                <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              <Button
                type="button"
                onClick={handleRapidInputSubmit}
                disabled={lookingUp || !rapidBarcodeInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                {lookingUp ? <RefreshCw size={13} className="animate-spin" /> : 'Add'}
              </Button>

              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition shrink-0"
                title="Continuous Camera Scanner"
              >
                <Camera size={16} />
              </button>

              <button
                type="button"
                onClick={() => setPasteModalOpen(true)}
                className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition shrink-0"
                title="Paste Multiple Serials from Delivery Sheet"
              >
                <ClipboardPaste size={16} />
              </button>
            </div>

            {/* FILTER TABS & MANIFEST LIST */}
            {manifestItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
                <Barcode size={34} className="mx-auto text-slate-600 opacity-40" />
                <p className="text-xs text-slate-400 font-semibold">No equipment scanned into return manifest</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Scan each returned hardware item using your barcode gun or camera, or click &quot;Browse Field Custody&quot; to pick items issued to a technician.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {/* Tab Filter Bar */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManifestFilterTab('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        manifestFilterTab === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({manifestItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManifestFilterTab('ASSIGNED')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        manifestFilterTab === 'ASSIGNED'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-blue-300'
                      }`}
                    >
                      <span>Field Custody</span>
                      <span className="text-[10px] bg-blue-950 px-1.5 rounded-full">{assignedItems.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManifestFilterTab('INSTALLED')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        manifestFilterTab === 'INSTALLED'
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-emerald-300'
                      }`}
                    >
                      <span>Installed</span>
                      <span className="text-[10px] bg-emerald-950 px-1.5 rounded-full">{installedItems.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManifestFilterTab('MUST_RETURN')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        manifestFilterTab === 'MUST_RETURN'
                          ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-amber-300'
                      }`}
                    >
                      <span>Must Return</span>
                      <span className="text-[10px] bg-amber-950 px-1.5 rounded-full">{mustReturnItems.length}</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    Showing {filteredManifest.length} of {manifestItems.length}
                  </span>
                </div>

                {/* Scanned Items Itemized Cards */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredManifest.map((m, idx) => {
                    const isInst = m.isInstalled || m.custodyType === 'INSTALLED_ON_SITE';
                    const isMust = m.mustReturn || m.custodyType === 'MUST_RETURN';
                    const isAssn = m.custodyType === 'ASSIGNED_FIELD' || (m.status === 'ASSIGNED' && !isInst && !isMust);

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isInst
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : isMust
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : isAssn
                            ? 'bg-blue-950/20 border-blue-500/30'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="font-mono text-[10px] text-slate-500 font-bold mt-0.5">#{idx + 1}</span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white truncate">{m.deviceName}</span>
                              {m.modelNumber && (
                                <span className="text-[10px] text-slate-400 font-mono">({m.modelNumber})</span>
                              )}
                              <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                                {m.barcode}
                              </span>
                            </div>

                            {/* Deep Disclosure Details Line */}
                            <div className="flex items-center gap-3 text-[10px] flex-wrap text-slate-400">
                              {/* Classification Badge */}
                              {isInst ? (
                                <span className="text-emerald-300 font-bold bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                                  <Building size={11} />
                                  <span>INSTALLED ON-SITE</span>
                                </span>
                              ) : isMust ? (
                                <span className="text-amber-300 font-bold bg-amber-950/90 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                                  <AlertTriangle size={11} />
                                  <span>MUST RETURN</span>
                                </span>
                              ) : isAssn ? (
                                <span className="text-blue-300 font-bold bg-blue-950/90 px-2 py-0.5 rounded-full border border-blue-500/40 flex items-center gap-1">
                                  <UserCheck size={11} />
                                  <span>FIELD CUSTODY</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                  IN STOCK
                                </span>
                              )}

                              {/* Custodian & Client Information */}
                              {m.currentCustodian && (
                                <span className="text-slate-300 font-medium">
                                  {m.currentCustodian}
                                </span>
                              )}

                              {m.daysInCustody !== undefined && m.daysInCustody > 0 && (
                                <span className="text-slate-400 flex items-center gap-1 font-mono">
                                  <Clock size={10} />
                                  <span>{m.daysInCustody}d in field</span>
                                </span>
                              )}

                              {m.assignedClient && (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <MapPin size={10} />
                                  <span>Site: {m.assignedClient.companyName || m.assignedClient.name}</span>
                                </span>
                              )}
                            </div>

                            {/* Warning / Return Mandate Advisory Note */}
                            {m.mustReturnReason && (
                              <p className="text-[10px] text-amber-300/90 font-medium">
                                ℹ️ {m.mustReturnReason}
                              </p>
                            )}
                            {m.warning && (
                              <p className="text-[10px] text-amber-400 font-semibold">
                                {m.warning}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          {m.unitPrice ? (
                            <span className="text-[10px] font-mono text-slate-400 font-semibold hidden sm:inline">
                              ₹{m.unitPrice.toLocaleString('en-IN')}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromManifest(m.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                            title="Remove from Return Manifest"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: RETURN CONDITION & LOCATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Physical Condition on Return *
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="GOOD">1. GOOD - Operational, Normal Wear</option>
                <option value="DAMAGED">2. DAMAGED - Broken / Decommissioned</option>
                <option value="NEEDS_REPAIR">3. NEEDS REPAIR - Requires Service / RMA</option>
              </select>
              <p className="text-[10px] text-slate-500">
                Items marked as Damaged or Needs Repair will automatically transition to Under Maintenance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Restock Location / Shelf Rack
              </label>
              <input
                type="text"
                value={returnLocation}
                onChange={(e) => setReturnLocation(e.target.value)}
                placeholder="e.g. Central Warehouse / Rack A3 / Bin 12"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-medium"
              />
              <p className="text-[10px] text-slate-500">
                Optional: specify warehouse shelf/bin location to update storage records.
              </p>
            </div>
          </div>

          {/* SECTION 3: INSPECTION NOTES */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              Return Inspection Notes / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Returned from Patuli installation. Hardware verified intact and tested."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
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
              disabled={submitting || manifestItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              {submitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <PackageCheck size={15} />
              )}
              <span>Check In {manifestItems.length} Products to Stock</span>
            </Button>
          </div>
        </form>
      </div>

      {/* ===== CONTINUOUS CAMERA SCANNER SUB-MODAL ===== */}
      <SmartBarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        mode="continuous"
        initialBatch={manifestItems.map((m) => m.barcode)}
        onDetected={(code) => handleLookupAndAddBarcodes([code])}
        onBatchDetected={(batch) => {
          handleLookupAndAddBarcodes(batch);
        }}
      />

      {/* ===== PASTE SERIALS SUB-MODAL ===== */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardPaste size={16} className="text-emerald-400" />
                <span>Paste Serials for Batch Return</span>
              </h3>
              <button onClick={() => setPasteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste barcodes from delivery returns, slips, or spreadsheets (separated by newlines, commas, or spaces).
            </p>

            <textarea
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              rows={6}
              placeholder="CAM-4K-001&#10;CAM-4K-002&#10;NVR-16CH-992&#10;FIBER-SFP-10G"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPasteSerials}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20"
              >
                Import Serials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BROWSE ACTIVE FIELD CUSTODY ROSTER SUB-MODAL ===== */}
      {activeCustodyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <UsersRound size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Active Field Custody Roster</h3>
                  <p className="text-[11px] text-slate-400">
                    Browse equipment currently in the hands of Technicians, Field Groups, and Service Vans.
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveCustodyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {activeCustodyLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Loading field custody records...</span>
                </div>
              ) : activeCustodyGroups.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No active equipment currently assigned in field custody.
                </div>
              ) : (
                activeCustodyGroups.map((group, gIdx) => (
                  <div key={gIdx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {group.custodianType === 'USER' ? (
                          <UserCheck size={16} className="text-blue-400" />
                        ) : group.custodianType === 'VEHICLE' ? (
                          <Truck size={16} className="text-amber-400" />
                        ) : (
                          <Building size={16} className="text-emerald-400" />
                        )}
                        <span className="text-xs font-bold text-white">{group.custodianName}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700 text-slate-300">
                          {group.items.length} units
                        </Badge>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleAddGroupToManifest(group.items)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl h-auto flex items-center gap-1.5"
                      >
                        <Plus size={13} />
                        <span>Add All ({group.items.length})</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {group.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate text-[11px]">{item.deviceName}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                              <span className="text-emerald-400 font-bold">{item.barcode}</span>
                              <span>• {item.condition}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddGroupToManifest([item])}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-300 transition"
                            title="Add single item to return manifest"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveCustodyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
