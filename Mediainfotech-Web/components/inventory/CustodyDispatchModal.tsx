'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  X,
  UserCheck,
  ArrowRightLeft,
  Building,
  Truck,
  UsersRound,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Camera,
  ClipboardPaste,
  Trash2,
  Layers,
  PackageCheck,
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Search,
  Ticket as TicketIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartBarcodeScannerModal } from './SmartBarcodeScannerModal';

interface CustodyDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: any | null;
  mode?: 'CHECK_OUT' | 'CHECK_IN';
  users?: any[];
  clients?: any[];
  vehicles?: any[];
  groups?: any[];
}

export function CustodyDispatchModal({
  isOpen,
  onClose,
  onSuccess,
  item = null,
  mode = 'CHECK_OUT',
  users = [],
  clients = [],
  vehicles = [],
  groups = [],
}: CustodyDispatchModalProps) {
  const isBatchMode = !item && mode === 'CHECK_OUT';

  const [targetType, setTargetType] = useState<'USER' | 'CLIENT' | 'GROUP' | 'VEHICLE'>('USER');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [assignedClientId, setAssignedClientId] = useState('');
  const [assignedGroupId, setAssignedGroupId] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ticket Integration States
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [autoMatchedTicket, setAutoMatchedTicket] = useState<any | null>(null);

  // Batch Mode States
  const [manifestItems, setManifestItems] = useState<any[]>([]);
  const [rapidBarcodeInput, setRapidBarcodeInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [loadingGroupItems, setLoadingGroupItems] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const rapidInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch active tickets when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setNotes('');
      setSelectedTicketId('');
      setAutoMatchedTicket(null);
      if (isBatchMode) {
        setManifestItems([]);
        setRapidBarcodeInput('');
        setTimeout(() => rapidInputRef.current?.focus(), 150);
      }

      // Fetch active tickets for auto-linking
      api
        .get('/api/tickets?status=ALL&limit=200')
        .then((res) => {
          const tList = res.data?.tickets || res.data?.data || res.data || [];
          setTicketsList(tList);
        })
        .catch((err) => console.warn('Failed to load tickets in dispatch modal', err));
    }
  }, [isOpen, isBatchMode]);

  // Helper to auto-match ticket for group
  const autoMatchTicketForGroup = (groupId: string, tList = ticketsList) => {
    if (!groupId) return;
    const match = tList.find(
      (t) => t.assignedGroupId === groupId && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
    );
    if (match) {
      setSelectedTicketId(match.id);
      setAutoMatchedTicket(match);
      setNotes((prev) =>
        prev ? prev : `Dispatch for Ticket #${match.ticketNumber} (${match.title})`
      );
    }
  };

  const handlePreloadGroupEquipment = async (groupIdToLoad: string) => {
    if (!groupIdToLoad) return;
    try {
      setLoadingGroupItems(true);
      setErrorMsg(null);
      const res = await api.get(`/api/inventory?limit=200&assignedGroupId=${groupIdToLoad}`);
      const items = res.data?.data || res.data || [];
      if (items.length > 0) {
        setManifestItems((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = items.filter((it: any) => !existingIds.has(it.id));
          return [...prev, ...newItems];
        });
        playBeep(false);
      } else {
        setErrorMsg('No products currently assigned to this group.');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (e) {
      console.error('Failed to preload group items', e);
      setErrorMsg('Failed to fetch equipment for selected group');
    } finally {
      setLoadingGroupItems(false);
    }
  };

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

  // Lookup and add barcodes to batch manifest
  const handleLookupAndAddBarcodes = async (barcodesToAdd: string[]) => {
    const cleaned = Array.from(
      new Set(
        barcodesToAdd
          .map((b) => b.trim().toUpperCase())
          .filter((b) => b.length > 0)
      )
    );

    if (cleaned.length === 0) return;

    // Filter out already scanned in current manifest
    const existingBarcodes = new Set(manifestItems.map((m) => m.barcode));
    const toFetch = cleaned.filter((b) => !existingBarcodes.has(b));

    if (toFetch.length === 0) {
      playBeep(true);
      setErrorMsg(`All scanned item(s) are already in the dispatch manifest.`);
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

        // Auto-detect group from scanned items if user hasn't explicitly picked a destination yet
        const groupItem = foundItems.find((i) => i.assignedGroupId);
        if (groupItem && (!assignedGroupId && !assignedUserId && !assignedClientId && !assignedVehicleId)) {
          setTargetType('GROUP');
          setAssignedGroupId(groupItem.assignedGroupId);
          autoMatchTicketForGroup(groupItem.assignedGroupId);
        }

        // Auto-detect linked ticket from scanned items
        const linkedTicket = foundItems.flatMap((i) => i.linkedTickets || [])[0];
        if (linkedTicket) {
          setSelectedTicketId(linkedTicket.id);
          setAutoMatchedTicket(linkedTicket);
          if (linkedTicket.assignedGroupId && !assignedGroupId) {
            setTargetType('GROUP');
            setAssignedGroupId(linkedTicket.assignedGroupId);
          }
          setNotes((prev) =>
            prev ? prev : `Dispatch for Ticket #${linkedTicket.ticketNumber} (${linkedTicket.title})`
          );
        }
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

  // Rapid Barcode Input Handler (Gun / Keyboard Enter)
  const handleRapidInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapidBarcodeInput.trim()) return;
    handleLookupAndAddBarcodes([rapidBarcodeInput]);
  };

  // Remove single item from manifest
  const handleRemoveFromManifest = (idToRemove: string) => {
    setManifestItems((prev) => prev.filter((m) => m.id !== idToRemove));
  };

  // Paste multiple serials handler
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

  // Handle Dispatch Submission (Single or Batch)
  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (targetType === 'USER' && !assignedUserId) {
      alert('Please select a technician / employee.');
      return;
    }
    if (targetType === 'CLIENT' && !assignedClientId) {
      alert('Please select a client site.');
      return;
    }
    if (targetType === 'GROUP' && !assignedGroupId) {
      alert('Please select a group / field team.');
      return;
    }
    if (targetType === 'VEHICLE' && !assignedVehicleId) {
      alert('Please select a service vehicle.');
      return;
    }

    try {
      setSubmitting(true);

      if (isBatchMode) {
        // BATCH DISPATCH
        if (manifestItems.length === 0) {
          alert('Please scan or lookup at least one piece of equipment for dispatch.');
          setSubmitting(false);
          return;
        }

        const res = await api.post('/api/inventory/batch-dispatch', {
          itemIds: manifestItems.map((m) => m.id),
          targetType,
          assignedUserId: targetType === 'USER' ? assignedUserId : null,
          assignedClientId: targetType === 'CLIENT' ? assignedClientId : null,
          assignedGroupId: targetType === 'GROUP' ? assignedGroupId : null,
          assignedVehicleId: targetType === 'VEHICLE' ? assignedVehicleId : null,
          notes,
          ticketId: selectedTicketId || undefined,
        });

        alert(`Successfully dispatched ${manifestItems.length} equipment items!`);
      } else {
        // SINGLE ITEM DISPATCH
        await api.post(`/api/inventory/${item.id}/assign`, {
          assignedUserId: targetType === 'USER' ? assignedUserId : null,
          assignedClientId: targetType === 'CLIENT' ? assignedClientId : null,
          assignedGroupId: targetType === 'GROUP' ? assignedGroupId : null,
          assignedVehicleId: targetType === 'VEHICLE' ? assignedVehicleId : null,
          notes,
          ticketId: selectedTicketId || undefined,
        });

        alert(`Asset "${item.deviceName}" successfully dispatched!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Dispatch error:', err);
      const msg = err.response?.data?.error || 'Failed to dispatch custody';
      setErrorMsg(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Single Check-In Return
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(`/api/inventory/${item.id}/return`, {
        condition: returnCondition,
        notes,
      });
      alert(`Asset "${item.deviceName}" checked back into inventory!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to check in asset');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalManifestValuation = manifestItems.reduce((acc, m) => acc + (parseFloat(m.unitPrice) || 0), 0);
  const unavailableCount = manifestItems.filter((m) => !m.available).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                mode === 'CHECK_OUT'
                  ? 'bg-blue-600/10 text-blue-400 border-blue-500/20'
                  : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  {isBatchMode
                    ? 'Multi-Serial Batch Custody Dispatch'
                    : mode === 'CHECK_OUT'
                    ? 'Check-Out / Dispatch Asset'
                    : 'Check-In / Return Asset to Stock'}
                </h2>
                {isBatchMode && (
                  <Badge variant="info" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">
                    Manifest: {manifestItems.length}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {item
                  ? `${item.deviceName} (${item.barcode})`
                  : 'Scan multiple equipment barcodes to assign custody in bulk'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        {mode === 'CHECK_OUT' ? (
          <form
            id="dispatch-form"
            onSubmit={handleCheckOut}
            className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar"
          >
            {/* SECTION 1: DISPATCH DESTINATION (SELECT FIRST HAND) */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider">
                  1. Select Dispatch Destination *
                </label>
                {targetType === 'GROUP' && assignedGroupId && isBatchMode && (
                  <button
                    type="button"
                    onClick={() => handlePreloadGroupEquipment(assignedGroupId)}
                    disabled={loadingGroupItems}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Layers size={13} className={loadingGroupItems ? 'animate-spin' : ''} />
                    <span>{loadingGroupItems ? 'Loading...' : 'Pre-Load Group Products'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('USER')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    targetType === 'USER'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck size={18} />
                  <span>Technician</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('CLIENT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    targetType === 'CLIENT'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building size={18} />
                  <span>Client Site</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('GROUP')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    targetType === 'GROUP'
                      ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <UsersRound size={18} />
                  <span>Group / Team</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('VEHICLE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                    targetType === 'VEHICLE'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Truck size={18} />
                  <span>Service Van</span>
                </button>
              </div>

              {/* Destination Dropdowns */}
              {targetType === 'USER' && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assign Technician / Custodian *
                  </label>
                  <select
                    required
                    value={assignedUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setAssignedUserId(uid);
                      const match = ticketsList.find(
                        (t) => t.assignedUserId === uid && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
                      );
                      if (match) {
                        setSelectedTicketId(match.id);
                        setAutoMatchedTicket(match);
                        setNotes((prev) => prev || `Dispatch for Ticket #${match.ticketNumber} (${match.title})`);
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Technician / Employee --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role} - {u.designation || 'Field'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'CLIENT' && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deploy to Client Site *
                  </label>
                  <select
                    required
                    value={assignedClientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setAssignedClientId(cid);
                      const match = ticketsList.find(
                        (t) => t.clientId === cid && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
                      );
                      if (match) {
                        setSelectedTicketId(match.id);
                        setAutoMatchedTicket(match);
                        setNotes((prev) => prev || `Dispatch for Ticket #${match.ticketNumber} (${match.title})`);
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Client Account --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name} {c.city ? `(${c.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'GROUP' && (
                <div className="pt-1 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Allocate to Field Team / Service Group *
                  </label>
                  <select
                    required
                    value={assignedGroupId}
                    onChange={(e) => {
                      const newGroupId = e.target.value;
                      setAssignedGroupId(newGroupId);
                      autoMatchTicketForGroup(newGroupId);
                      if (newGroupId && isBatchMode && manifestItems.length === 0) {
                        handlePreloadGroupEquipment(newGroupId);
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400 font-semibold"
                  >
                    <option value="">-- Select Operational Group / Team --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.locationName ? `— (${g.locationName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'VEHICLE' && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Allocate to Service Vehicle *
                  </label>
                  <select
                    required
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNo} - {v.make} {v.model} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linked Support Ticket Selector (Auto-Matched) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <TicketIcon size={13} className="text-blue-400" />
                    <span>Link Support Ticket (Auto-Matched / Optional)</span>
                  </label>
                  {autoMatchedTicket && (
                    <Badge variant="info" className="text-[9px] bg-blue-500/20 text-blue-300 border-blue-500/30">
                      Auto-Matched #{autoMatchedTicket.ticketNumber}
                    </Badge>
                  )}
                </div>

                <select
                  value={selectedTicketId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setSelectedTicketId(tId);
                    const matched = ticketsList.find((t) => t.id === tId);
                    setAutoMatchedTicket(matched || null);
                    if (matched) {
                      setNotes((prev) =>
                        prev ? prev : `Dispatch for Ticket #${matched.ticketNumber} (${matched.title})`
                      );
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- No Linked Ticket --</option>
                  {ticketsList
                    .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.ticketNumber} — {t.title} ({t.priority} • {t.assignedGroup?.name || 'Field'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* SECTION 2: BATCH SCANNER & MANIFEST (For Batch Mode) */}
            {isBatchMode && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode size={15} className="text-blue-400" />
                    <span>2. Scan Hardware Barcodes to Dispatch</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Camera size={13} />
                      <span>Camera Scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasteModalOpen(true)}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <ClipboardPaste size={13} />
                      <span>Paste Excel</span>
                    </button>
                  </div>
                </div>

                {/* Handheld Scanner Gun Input Field */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode size={16} className="absolute left-3 top-2.5 text-blue-400" />
                    <input
                      ref={rapidInputRef}
                      type="text"
                      value={rapidBarcodeInput}
                      onChange={(e) => setRapidBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRapidInputSubmit(e);
                        }
                      }}
                      placeholder="Point scanner gun & pull trigger, or type barcode..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleRapidInputSubmit}
                    disabled={!rapidBarcodeInput.trim() || lookingUp}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 rounded-xl"
                  >
                    {lookingUp ? 'Verifying...' : 'Add Item'}
                  </Button>
                </div>

                {/* Live Manifest Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      Dispatch Manifest ({manifestItems.length} items)
                    </span>
                    {manifestItems.length > 0 && (
                      <div className="flex items-center gap-3">
                        {totalManifestValuation > 0 && (
                          <span className="text-emerald-400 font-mono font-bold">
                            Total: ₹{totalManifestValuation.toLocaleString('en-IN')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setManifestItems([])}
                          className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold"
                        >
                          Clear Manifest
                        </button>
                      </div>
                    )}
                  </div>

                  {manifestItems.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-1">
                      <PackageCheck size={24} className="mx-auto text-slate-600" />
                      <p>No equipment in manifest yet.</p>
                      <p className="text-[11px] text-slate-600">Scan barcodes, click "Pre-Load Group Products", or paste serials.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {manifestItems.map((m, idx) => {
                        const belongsToCurrentGroup =
                          targetType === 'GROUP' &&
                          assignedGroupId &&
                          m.assignedGroupId === assignedGroupId;

                        return (
                          <div
                            key={m.id || idx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                              belongsToCurrentGroup
                                ? 'bg-indigo-950/40 border-indigo-500/50'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[10px] text-slate-500 font-bold">#{idx + 1}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white truncate">{m.deviceName}</span>
                                  {m.modelNumber && (
                                    <span className="text-[10px] text-slate-400 font-mono">({m.modelNumber})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5 flex-wrap">
                                  <span className="text-blue-300 font-bold bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-500/30">
                                    {m.barcode}
                                  </span>
                                  <span className="text-slate-400">{m.condition}</span>
                                  {m.unitPrice && <span className="text-emerald-400">₹{m.unitPrice}</span>}
                                  {m.assignedGroup && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTargetType('GROUP');
                                        setAssignedGroupId(m.assignedGroupId);
                                      }}
                                      className="px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-[9px] font-sans font-semibold cursor-pointer hover:bg-indigo-900 transition flex items-center gap-1"
                                      title="Click to select this group as destination"
                                    >
                                      <UsersRound size={10} />
                                      <span>Group: {m.assignedGroup.name}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {belongsToCurrentGroup ? (
                                <Badge variant="success" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                  Ready for Group
                                </Badge>
                              ) : m.assignedGroup ? (
                                <Badge variant="info" className="text-[10px] bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                                  {m.assignedGroup.name}
                                </Badge>
                              ) : m.available ? (
                                <Badge variant="success" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                  In Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                                  {m.status}
                                </Badge>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveFromManifest(m.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SINGLE ITEM PREVIEW (For Single Item Mode) */}
            {!isBatchMode && item && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  2. Selected Hardware Asset
                </span>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{item.deviceName}</p>
                    <p className="text-[10px] text-blue-400 font-mono">SN: {item.barcode} • {item.modelNumber || 'Hardware'}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{item.condition}</Badge>
                </div>
              </div>
            )}

            {/* SECTION 3: DISPATCH REMARKS */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                3. Dispatch Remarks / Purpose / Ticket Reference
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Field dispatch for AMC ticket TCK-2026-0012, installation at Sector 5..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </form>
        ) : (
          /* CHECK-IN RETURN FORM (For single item) */
          <form onSubmit={handleCheckIn} className="p-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Current Assigned Custody</span>
              <p className="font-bold text-white">
                {item?.assignedUser
                  ? `Technician ${item.assignedUser.firstName} ${item.assignedUser.lastName}`
                  : item?.assignedClient
                  ? `Client Site: ${item.assignedClient.companyName || item.assignedClient.name}`
                  : item?.assignedGroup
                  ? `Group: ${item.assignedGroup.name}`
                  : item?.assignedVehicle
                  ? `Vehicle: ${item.assignedVehicle.registrationNo}`
                  : 'Currently in field'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Returned Physical Condition *
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold"
              >
                <option value="GOOD">1. GOOD - Standard Operational</option>
                <option value="DAMAGED">2. DAMAGED - Broken / Decommissioned</option>
                <option value="NEEDS_REPAIR">3. NEEDS REPAIR - Requires Service / RMA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Return Inspection Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Returned after completing CCTV deployment at client premises. Tested OK."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white resize-none"
              />
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/70">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-slate-900 border-slate-700"
          >
            Cancel
          </Button>

          {mode === 'CHECK_OUT' ? (
            <Button
              type="submit"
              form="dispatch-form"
              disabled={submitting || (isBatchMode && manifestItems.length === 0)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-blue-500/20"
            >
              {submitting ? (
                'Dispatching...'
              ) : isBatchMode ? (
                `Confirm Batch Dispatch (${manifestItems.length} Items)`
              ) : (
                'Confirm Dispatch (Check-Out)'
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCheckIn}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              {submitting ? 'Checking In...' : 'Accept Return (Check-In)'}
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Barcode & Image Scanner Modal */}
      <SmartBarcodeScannerModal
        isOpen={scannerOpen}
        mode="continuous"
        initialBatch={manifestItems.map((m) => m.barcode)}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          handleLookupAndAddBarcodes([code]);
        }}
        onBatchDetected={(batch) => {
          handleLookupAndAddBarcodes(batch);
        }}
      />

      {/* Paste from Excel / Invoice Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Paste Multiple Barcodes for Dispatch</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copy a column of barcodes from your dispatch sheet or invoice. Serials separated by newlines, commas, or tabs will be looked up automatically.
            </p>

            <textarea
              rows={6}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder={`MIT-CAM-1024\nMIT-CAM-1025\nMIT-NVR-9041`}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasteModalOpen(false)}
                className="text-xs bg-slate-900 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyPasteSerials}
                disabled={!pasteRawText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
              >
                <Plus size={14} />
                <span>Verify &amp; Add to Manifest</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
