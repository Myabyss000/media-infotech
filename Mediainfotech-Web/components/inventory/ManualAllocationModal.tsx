'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  X,
  ArrowRightLeft,
  UserCheck,
  Building,
  Truck,
  Ticket as TicketIcon,
  Package,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ManualAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedItem?: any | null;
  items?: any[];
  users?: any[];
  clients?: any[];
  vehicles?: any[];
}

export function ManualAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedItem = null,
  items = [],
  users = [],
  clients = [],
  vehicles = [],
}: ManualAllocationModalProps) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [targetType, setTargetType] = useState<'USER' | 'CLIENT' | 'VEHICLE'>('USER');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [assignedClientId, setAssignedClientId] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [allocationReason, setAllocationReason] = useState('Deployment');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedItem?.id) {
      setSelectedItemId(preselectedItem.id);
    } else {
      setSelectedItemId('');
    }
    setAssignedUserId('');
    setAssignedClientId('');
    setAssignedVehicleId('');
    setNotes('');
    setQuantity('1');
    setItemSearch('');
  }, [preselectedItem, isOpen]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === selectedItemId) || preselectedItem;

  const filteredItems = items.filter(
    (i) =>
      i.deviceName.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.barcode.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.modelNumber && i.modelNumber.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      alert('Please select a hardware device to allocate.');
      return;
    }

    if (targetType === 'USER' && !assignedUserId) {
      alert('Please select a technician / employee.');
      return;
    }
    if (targetType === 'CLIENT' && !assignedClientId) {
      alert('Please select a client account / site.');
      return;
    }
    if (targetType === 'VEHICLE' && !assignedVehicleId) {
      alert('Please select a service vehicle.');
      return;
    }

    try {
      setSubmitting(true);
      const combinedNotes = `[${allocationReason}] (Qty: ${quantity}) - ${notes}`.trim();

      await api.post(`/api/inventory/${selectedItemId}/assign`, {
        assignedUserId: targetType === 'USER' ? assignedUserId : null,
        assignedClientId: targetType === 'CLIENT' ? assignedClientId : null,
        assignedVehicleId: targetType === 'VEHICLE' ? assignedVehicleId : null,
        notes: combinedNotes,
      });

      alert(`Equipment allocated successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to allocate equipment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Manual Equipment Allocation</h2>
              <p className="text-xs text-slate-400">
                Dispatch and record custody handover to field staff, client site, or service van.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Step 1: Device Selection */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Select Hardware Equipment <span className="text-rose-400">*</span>
            </label>

            {!preselectedItem ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search device by name, model or barcode..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                </div>

                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium"
                >
                  <option value="">-- Choose Equipment from Master Inventory ({filteredItems.length} items) --</option>
                  {filteredItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.deviceName} — {i.barcode} ({i.status} • Stock: {i.stockAmount || 1})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-white text-sm">{currentItem?.deviceName}</p>
                  <p className="text-blue-400 font-mono font-bold">Serial: {currentItem?.barcode}</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-slate-900">
                  {currentItem?.category || 'Hardware'}
                </Badge>
              </div>
            )}

            {currentItem && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                <span>Available Stock: <strong className="text-emerald-400">{currentItem.stockAmount || 1} units</strong></span>
                <span>Current Status: <strong className="text-white">{currentItem.status}</strong></span>
              </div>
            )}
          </div>

          {/* Step 2: Allocation Target */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Allocate Custody To <span className="text-rose-400">*</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('USER')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                  targetType === 'USER'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck size={16} />
                <span>Technician</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('CLIENT')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                  targetType === 'CLIENT'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Building size={16} />
                <span>Client Site</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('VEHICLE')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                  targetType === 'VEHICLE'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Truck size={16} />
                <span>Service Van</span>
              </button>
            </div>

            {targetType === 'USER' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Employee / Field Technician *
                </label>
                <select
                  required
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="">-- Choose Technician ({users.length} available) --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role} - {u.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'CLIENT' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Client Enterprise / Site *
                </label>
                <select
                  required
                  value={assignedClientId}
                  onChange={(e) => setAssignedClientId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="">-- Choose Client Site ({clients.length} available) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name} {c.city ? `(${c.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'VEHICLE' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Select Service Van / Vehicle *
                </label>
                <select
                  required
                  value={assignedVehicleId}
                  onChange={(e) => setAssignedVehicleId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                >
                  <option value="">-- Choose Vehicle ({vehicles.length} active) --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo} — {v.make} {v.model} ({v.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 3: Purpose & Logistics */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Allocation Reason</label>
                <select
                  value={allocationReason}
                  onChange={(e) => setAllocationReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="Deployment">Client Site Deployment</option>
                  <option value="Replacement">AMC / Warranty Replacement</option>
                  <option value="Field Toolkit">Technician Field Toolkit</option>
                  <option value="Vehicle Stock">Service Van Floating Stock</option>
                  <option value="Testing">Testing & Configuration</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Allocated Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Allocation Handover Remarks</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Issued for AMC installation at Salt Lake office, tested working OK..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs bg-slate-900 border-slate-700">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-blue-500/20"
            >
              {submitting ? 'Allocating...' : 'Confirm Manual Allocation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
