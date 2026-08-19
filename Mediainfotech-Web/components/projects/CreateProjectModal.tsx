'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import {
  FolderPlus,
  ShieldAlert,
  Building2,
  Calendar,
  IndianRupee,
  Users,
  MapPin,
  FileText,
  Truck,
  Sparkles,
} from 'lucide-react';
import { MapPicker } from '@/components/ui/MapPicker';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  groups: any[];
  vehicles: any[];
  users: any[];
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  clients = [],
  groups = [],
  vehicles = [],
  users = [],
}: CreateProjectModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    tenderNo: '',
    workOrderNo: '',
    tenderAuthority: '',
    description: '',
    status: 'PLANNING',
    priority: 'HIGH',
    contractValue: '',
    emdAmount: '',
    locationName: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    targetEndDate: '',
    clientId: '',
    groupId: '',
    vehicleId: '',
    managerId: '',
  });

  const handleLocationSelect = (loc: {
    latitude: number;
    longitude: number;
    address: string;
    locationName?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
      locationName: loc.locationName || prev.locationName || loc.address.split(',')[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Tender / Project Title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.post('/api/projects', {
        ...formData,
        contractValue: formData.contractValue ? parseFloat(formData.contractValue) : null,
        emdAmount: formData.emdAmount ? parseFloat(formData.emdAmount) : null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        targetEndDate: formData.targetEndDate || null,
        clientId: formData.clientId || null,
        groupId: formData.groupId || null,
        vehicleId: formData.vehicleId || null,
        managerId: formData.managerId || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create project error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to create tender project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Government Tender / Project"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Tender Scope & Government Identification */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Building2 size={14} />
            <span>Tender Scope & Authority</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <FormField label="Project / Tender Title *">
                <input
                  type="text"
                  required
                  placeholder="e.g. Municipal City Surveillance & ANPR Camera Setup"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>
            </div>

            <FormField label="Tender Ref / Gazette No">
              <input
                type="text"
                placeholder="e.g. WB/POLICE/CCTV/2026/08"
                value={formData.tenderNo}
                onChange={(e) => setFormData({ ...formData, tenderNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </FormField>

            <FormField label="Work Order No">
              <input
                type="text"
                placeholder="e.g. WO-MUNICIPAL-2026-99"
                value={formData.workOrderNo}
                onChange={(e) => setFormData({ ...formData, workOrderNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </FormField>

            <FormField label="Govt Department / Authority">
              <input
                type="text"
                placeholder="e.g. West Bengal Police / Municipal Corp"
                value={formData.tenderAuthority}
                onChange={(e) => setFormData({ ...formData, tenderAuthority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </FormField>

            <FormField label="Client Link (Optional)">
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Select Existing Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Section 2: Financials & Priority */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <IndianRupee size={14} />
            <span>Commercials & Priority</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Sanctioned Value (₹)">
              <input
                type="number"
                placeholder="e.g. 4850000"
                value={formData.contractValue}
                onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </FormField>

            <FormField label="EMD / BG (₹)">
              <input
                type="number"
                placeholder="e.g. 150000"
                value={formData.emdAmount}
                onChange={(e) => setFormData({ ...formData, emdAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </FormField>

            <FormField label="Execution Priority">
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition font-semibold"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent SLA</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Section 3: Team & Resource Allocation */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Users size={14} />
            <span>Field Team & Transport Allocation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Assigned Field Group">
              <select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Select Field Team...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Service Van / Vehicle">
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Select Service Van...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} ({v.model})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Project Lead / Manager">
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Select In-Charge...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.designation || u.role})
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Section 4: Territory, Interactive Precision Map & Timeline */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <MapPin size={14} />
            <span>Territory, Interactive Precision Map & Timeline</span>
          </div>

          {/* Precision Map Picker */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-3">
            <MapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              address={formData.address}
              locationName={formData.locationName}
              onLocationSelect={handleLocationSelect}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Location / Zone Territory Name *">
              <input
                type="text"
                placeholder="e.g. Barasat Municipality CCTV Grid (Ward 1 to 24)"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </FormField>

            <FormField label="Target Commissioning Date">
              <input
                type="date"
                value={formData.targetEndDate}
                onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Detected Full Address">
                <input
                  type="text"
                  placeholder="Auto-detected full address from map selection..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>
            </div>
          </div>

          <FormField label="Project Scope & Technical Deliverables">
            <textarea
              rows={2}
              placeholder="Key deliverables, CCTV camera models, optical fiber network layout, control room requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </FormField>
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
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-indigo-600/20 px-5"
          >
            <FolderPlus size={14} />
            <span>{submitting ? 'Creating Tender Project...' : 'Create Tender Project'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
