'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import {
  RotateCcw,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Barcode,
  PackageCheck,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RetrieveAndReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: any | null;
  ticketId?: string;
  clientId?: string;
}

export function RetrieveAndReplaceModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  ticketId,
  clientId,
}: RetrieveAndReplaceModalProps) {
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED' | 'NEEDS_REPAIR'>('DAMAGED');
  const [damageNotes, setDamageNotes] = useState('');
  const [restockLocation, setRestockLocation] = useState('');

  // Replacement Option
  const [enableReplacement, setEnableReplacement] = useState(false);
  const [availableReplacements, setAvailableReplacements] = useState<any[]>([]);
  const [selectedReplacementId, setSelectedReplacementId] = useState('');
  const [replacementBarcode, setReplacementBarcode] = useState('');
  const [replacementNotes, setReplacementNotes] = useState('');
  const [searchingReplacements, setSearchingReplacements] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setReturnCondition('DAMAGED');
      setDamageNotes('');
      setRestockLocation('');
      setEnableReplacement(false);
      setSelectedReplacementId('');
      setReplacementBarcode('');
      setReplacementNotes('');
      setError(null);
      fetchAvailableReplacements();
    }
  }, [isOpen, item]);

  const fetchAvailableReplacements = async () => {
    try {
      setSearchingReplacements(true);
      const res = await api.get('/api/inventory?status=IN_STOCK&limit=50');
      const items = res.data.data || res.data || [];
      // Filter items in same category if applicable
      setAvailableReplacements(items);
    } catch (err) {
      console.error('Failed to load available replacements:', err);
    } finally {
      setSearchingReplacements(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item?.id) return;

    if ((returnCondition === 'DAMAGED' || returnCondition === 'NEEDS_REPAIR') && !damageNotes.trim()) {
      setError('Please provide details on the damage / malfunction symptoms');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (ticketId) {
        // Ticket-specific retrieval endpoint
        await api.post(`/api/tickets/${ticketId}/retrieve-and-replace`, {
          retrievedItemId: item.id,
          returnCondition,
          damageNotes: damageNotes.trim(),
          replacementItemId: enableReplacement ? selectedReplacementId || undefined : undefined,
          replacementBarcode: enableReplacement ? replacementBarcode.trim() || undefined : undefined,
          replacementNotes: enableReplacement ? replacementNotes.trim() : undefined,
        });
      } else {
        // General inventory retrieval endpoint
        await api.post('/api/inventory/retrieve-installed', {
          itemId: item.id,
          returnCondition,
          damageNotes: damageNotes.trim(),
          restockLocation: restockLocation.trim() || undefined,
          replacementItemId: enableReplacement ? selectedReplacementId || undefined : undefined,
          replacementBarcode: enableReplacement ? replacementBarcode.trim() || undefined : undefined,
          replacementNotes: enableReplacement ? replacementNotes.trim() : undefined,
          clientId: clientId || item.assignedClientId,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Retrieve and replace error:', err);
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to retrieve product');
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Retrieve / Replace Field Installed Product"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Installed Device Info Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
            Target Product to Retrieve
          </span>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-extrabold text-white">{item.deviceName}</h4>
              <p className="text-slate-400 text-xs font-mono mt-0.5">
                SN: <strong className="text-indigo-300">{item.barcode}</strong> • {item.modelNumber || item.category || 'Device'}
              </p>
              {item.location && (
                <p className="text-[11px] text-amber-400 font-medium mt-1">
                  📍 {item.location}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700">
              Installed at Site
            </Badge>
          </div>
        </div>

        {/* Section 1: Physical Condition on Return (Strictly 3 Options) */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Physical Condition on Return *
          </label>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'GOOD', label: '1. GOOD', desc: 'Working & Operational', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
              { id: 'DAMAGED', label: '2. DAMAGED', desc: 'Defective / Damaged', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
              { id: 'NEEDS_REPAIR', label: '3. NEEDS REPAIR', desc: 'Requires Service / RMA', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
            ].map((cond) => (
              <button
                type="button"
                key={cond.id}
                onClick={() => setReturnCondition(cond.id as any)}
                className={`p-3 rounded-xl border text-left transition ${
                  returnCondition === cond.id
                    ? `${cond.color} ring-1 ring-white/20 font-bold shadow-md`
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs block">{cond.label}</span>
                <span className="text-[10px] opacity-80 block mt-0.5">{cond.desc}</span>
              </button>
            ))}
          </div>

          <FormField label="Damage Extent & Malfunction Details *">
            <textarea
              rows={2}
              required={returnCondition !== 'GOOD'}
              placeholder="Describe how much damage it has (e.g. Port 2 & 3 blown due to electrical surge, casing scorched, or camera lens cracked by stone)..."
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </FormField>
        </div>

        {/* Section 2: One-Click Replacement Option */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>Dispatch & Install Replacement Unit at Site</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Immediately swap and install a fresh unit at the same client site
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableReplacement}
                onChange={(e) => setEnableReplacement(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {enableReplacement && (
            <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
              <FormField label="Select Replacement Unit from Available Stock">
                <select
                  value={selectedReplacementId}
                  onChange={(e) => setSelectedReplacementId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose Fresh Device from Stock...</option>
                  {availableReplacements
                    .filter((r) => r.id !== item.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.deviceName} — SN: {r.barcode} ({r.modelNumber || r.category})
                      </option>
                    ))}
                </select>
              </FormField>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">OR Enter Serial Barcode</span>
              </div>

              <input
                type="text"
                placeholder="Scan or type replacement barcode (e.g. SN-HIK-8849)"
                value={replacementBarcode}
                onChange={(e) => setReplacementBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />

              <input
                type="text"
                placeholder="Replacement installation remarks (optional)..."
                value={replacementNotes}
                onChange={(e) => setReplacementNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-slate-900 border-slate-800 text-slate-400 text-xs"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-rose-600/20"
          >
            <RotateCcw size={14} />
            <span>
              {submitting
                ? 'Processing...'
                : enableReplacement
                ? 'Retrieve & Install Replacement'
                : 'Retrieve from Field'}
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
