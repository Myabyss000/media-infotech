'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  Search,
  Barcode,
  Camera,
  ClipboardPaste,
  Trash2,
  Package,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building,
  UserCheck,
  Truck,
  UsersRound,
  Wrench,
  DollarSign,
  ArrowRight,
  ExternalLink,
  PackageCheck,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SmartBarcodeScannerModal } from './SmartBarcodeScannerModal';

interface BatchProductLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForDispatch?: (items: any[]) => void;
  onFilterMainInventory?: (barcodes: string[]) => void;
  onOpen360?: (itemId: string) => void;
}

export function BatchProductLookupModal({
  isOpen,
  onClose,
  onSelectForDispatch,
  onFilterMainInventory,
  onOpen360,
}: BatchProductLookupModalProps) {
  const [queuedSerials, setQueuedSerials] = useState<string[]>([]);
  const [rapidInput, setRapidInput] = useState('');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Lookup results state
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [lookupResults, setLookupResults] = useState<{
    found: any[];
    missing: string[];
  }>({ found: [], missing: [] });
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQueuedSerials([]);
      setRapidInput('');
      setLookupResults({ found: [], missing: [] });
      setLookupError(null);
    }
  }, [isOpen]);

  // Execute lookup whenever queuedSerials changes (only when modal is open and has serials)
  useEffect(() => {
    if (!isOpen || queuedSerials.length === 0) {
      setLookupResults({ found: [], missing: [] });
      return;
    }

    const fetchDetails = async () => {
      setLoadingLookup(true);
      setLookupError(null);
      try {
        const res = await api.post('/api/inventory/lookup-serials', {
          barcodes: queuedSerials,
        });
        setLookupResults({
          found: res.data?.found || res.data?.items || [],
          missing: res.data?.missing || res.data?.missingBarcodes || [],
        });
      } catch (err: any) {
        console.error('Batch serial lookup error:', err);
        setLookupError(err.response?.data?.error || 'Failed to lookup product serials');
      } finally {
        setLoadingLookup(false);
      }
    };

    const timer = setTimeout(fetchDetails, 250);
    return () => clearTimeout(timer);
  }, [queuedSerials, isOpen]);

  // Serial Management
  const handleAddRapidSerial = (codeToAdd?: string) => {
    const target = (codeToAdd || rapidInput).trim().toUpperCase();
    if (!target) return;
    if (queuedSerials.includes(target)) {
      setLookupError(`Serial "${target}" is already in lookup list!`);
      setTimeout(() => setLookupError(null), 3000);
      setRapidInput('');
      return;
    }
    setQueuedSerials((prev) => [...prev, target]);
    setRapidInput('');
    setLookupError(null);
  };

  const handleRemoveSerial = (idxToRemove: number) => {
    setQueuedSerials((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    const tokens = pasteText
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    const newSerials: string[] = [];
    for (const token of tokens) {
      if (!queuedSerials.includes(token) && !newSerials.includes(token)) {
        newSerials.push(token);
      }
    }

    if (newSerials.length > 0) {
      setQueuedSerials((prev) => [...prev, ...newSerials]);
    }
    setPasteModalOpen(false);
    setPasteText('');
  };

  if (!isOpen) return null;

  // Compute live statistics
  const foundItems = lookupResults.found || [];
  const inStockCount = foundItems.filter((i) => i.status === 'IN_STOCK').length;
  const assignedCount = foundItems.filter((i) => i.status === 'ASSIGNED').length;
  const maintenanceCount = foundItems.filter((i) => i.status === 'UNDER_MAINTENANCE').length;
  const totalValuation = foundItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Search size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Multi-Serial Product Lookup & Batch Inspector</h2>
                <Badge variant="info" className="text-[10px] bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                  {queuedSerials.length} Scanned
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Scan multiple hardware serial numbers to verify warehouse stock, active custodians, and condition simultaneously.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {/* Top Scanning Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode size={14} className="text-indigo-400" />
                <span>Scan or Paste Multiple Product Serials</span>
              </label>

              {queuedSerials.length > 0 && (
                <button
                  onClick={() => setQueuedSerials([])}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Trash2 size={12} />
                  <span>Clear All ({queuedSerials.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={rapidInput}
                  onChange={(e) => setRapidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRapidSerial();
                    }
                  }}
                  placeholder="Scan gun or type serial (e.g. CAM-4K-001)... [Press Enter]"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none"
                  autoFocus
                />
                <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              <button
                type="button"
                onClick={() => handleAddRapidSerial()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shrink-0"
              >
                Add [Enter]
              </button>

              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
                title="Continuous Camera Scan"
              >
                <Camera size={14} />
                <span className="hidden sm:inline">Camera Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setPasteModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
                title="Paste from Excel or Delivery Note"
              >
                <ClipboardPaste size={14} />
                <span className="hidden sm:inline">Paste Excel</span>
              </button>
            </div>

            {/* Error Notification */}
            {lookupError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                <span>{lookupError}</span>
              </div>
            )}

            {/* Scanned Serial Tags */}
            {queuedSerials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                {queuedSerials.map((code, idx) => {
                  const isMissing = lookupResults.missing.includes(code);
                  return (
                    <span
                      key={`${code}-${idx}`}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 ${
                        isMissing
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                          : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
                      }`}
                    >
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSerial(idx)}
                        className="text-slate-400 hover:text-rose-400 transition"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {queuedSerials.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Queried</span>
                <p className="text-base font-extrabold text-white font-mono">{queuedSerials.length}</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  <span>In Warehouse</span>
                </span>
                <p className="text-base font-extrabold text-emerald-300 font-mono">{inStockCount}</p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-1">
                <span className="text-[10px] text-blue-400 uppercase font-semibold flex items-center gap-1">
                  <UserCheck size={11} />
                  <span>Field Assigned</span>
                </span>
                <p className="text-base font-extrabold text-blue-300 font-mono">{assignedCount}</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                <span className="text-[10px] text-amber-400 uppercase font-semibold flex items-center gap-1">
                  <Wrench size={11} />
                  <span>Maintenance</span>
                </span>
                <p className="text-base font-extrabold text-amber-300 font-mono">{maintenanceCount}</p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
                <span className="text-[10px] text-indigo-400 uppercase font-semibold flex items-center gap-1">
                  <DollarSign size={11} />
                  <span>Batch Value</span>
                </span>
                <p className="text-base font-extrabold text-indigo-300 font-mono">{formatCurrency(totalValuation)}</p>
              </div>
            </div>
          )}

          {/* Missing / Unregistered Products Alert */}
          {lookupResults.missing.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-400">
                <AlertCircle size={15} />
                <span>{lookupResults.missing.length} Serial(s) Not Found in Inventory</span>
              </div>
              <p className="text-[11px] text-slate-300">
                The following barcodes are not registered in the system database:{' '}
                <span className="font-mono text-rose-200 font-semibold">
                  {lookupResults.missing.join(', ')}
                </span>
              </p>
            </div>
          )}

          {/* Results Table */}
          {loadingLookup ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw size={24} className="animate-spin text-indigo-400" />
              <span>Looking up product dossiers and live custody status...</span>
            </div>
          ) : queuedSerials.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-slate-800 space-y-3">
              <Barcode size={40} className="mx-auto text-slate-600 opacity-40" />
              <h4 className="text-sm font-bold text-slate-300">No Serials Queued Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Scan multiple barcodes using your handheld gun, camera, or paste from Excel to inspect live custody,
                deployment sites, and condition simultaneously.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Identified Equipment Dossiers ({foundItems.length})
              </h4>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {foundItems.map((item) => {
                  const conditionBadge =
                    item.condition === 'NEW'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : item.condition === 'DAMAGED' || item.condition === 'DEFECTIVE'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

                  const custodianText = item.assignedUser
                    ? `Field Tech: ${item.assignedUser.firstName} ${item.assignedUser.lastName}`
                    : item.assignedClient
                    ? `Client Site: ${item.assignedClient.companyName || item.assignedClient.name}`
                    : item.assignedGroup
                    ? `Group: ${item.assignedGroup.name}`
                    : item.assignedVehicle
                    ? `Van: ${item.assignedVehicle.registrationNo}`
                    : 'In Warehouse Stock';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                            <Package size={20} />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-white text-sm">{item.deviceName}</h5>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/40">
                                {item.barcode}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {item.modelNumber || item.category || 'Hardware'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${conditionBadge}`}>
                                {item.condition}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={
                              item.status === 'IN_STOCK'
                                ? 'ACTIVE'
                                : item.status === 'ASSIGNED'
                                ? 'PENDING'
                                : 'INACTIVE'
                            }
                            label={item.status}
                          />

                          {onOpen360 && (
                            <button
                              onClick={() => {
                                onOpen360(item.id);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-semibold text-xs transition border border-blue-500/30 flex items-center gap-1"
                            >
                              <ExternalLink size={12} />
                              <span>360° Dossier</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Custodian & Storage Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-900">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Custodian</span>
                          <p className="text-slate-200 font-medium truncate">{custodianText}</p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Location / Rack</span>
                          <p className="text-slate-300">{item.location || 'HQ Warehouse'}</p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Unit Price & Purchase</span>
                          <p className="text-emerald-400 font-mono font-bold">
                            {formatCurrency(Number(item.price) || 0)}
                            <span className="text-slate-500 text-[10px] font-normal ml-1">
                              ({item.buyDate ? formatDate(item.buyDate) : 'N/A'})
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {onFilterMainInventory && foundItems.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  onFilterMainInventory(foundItems.map((i) => i.barcode));
                  onClose();
                }}
                className="bg-slate-900 border-slate-700 hover:text-white text-xs font-semibold gap-1.5"
              >
                <Search size={13} />
                <span>Filter Main Table ({foundItems.length})</span>
              </Button>
            )}

            {onSelectForDispatch && foundItems.length > 0 && inStockCount > 0 && (
              <Button
                onClick={() => {
                  const available = foundItems.filter((i) => i.status === 'IN_STOCK');
                  onSelectForDispatch(available);
                  onClose();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-indigo-500/20"
              >
                <PackageCheck size={14} />
                <span>Batch Dispatch Available ({inStockCount})</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===== CONTINUOUS CAMERA SCANNER ===== */}
      <SmartBarcodeScannerModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        mode="continuous"
        initialBatch={queuedSerials}
        onDetected={(code) => handleAddRapidSerial(code)}
        onBatchDetected={(batch) => {
          setQueuedSerials(batch);
        }}
      />

      {/* ===== PASTE BULK SERIALS SUB-MODAL ===== */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardPaste size={16} className="text-emerald-400" />
                <span>Paste Serials from Excel / Bill</span>
              </h3>
              <button onClick={() => setPasteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste barcodes from spreadsheet columns, delivery slips, or invoices (separated by newlines, commas, or spaces).
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
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
                onClick={handleApplyPaste}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20"
              >
                Import Serials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
