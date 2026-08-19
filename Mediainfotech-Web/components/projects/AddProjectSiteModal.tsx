'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import { MapPin, Video, Zap, ShieldAlert, Plus } from 'lucide-react';
import { MapPicker } from '@/components/ui/MapPicker';

interface AddProjectSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export function AddProjectSiteModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}: AddProjectSiteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    camerasPlanned: '4',
    poleType: 'OCTAGONAL_POLE',
    powerSource: 'GRID_EB_METER',
    notes: '',
  });

  const handleLocationSelect = (loc: {
    latitude: number;
    longitude: number;
    address: string;
    locationName?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      address: loc.address,
      name: prev.name || loc.locationName || loc.address.split(',')[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a site / junction name');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.post(`/api/projects/${projectId}/sites`, {
        ...formData,
        camerasPlanned: parseInt(formData.camerasPlanned, 10) || 1,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Add site error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to add junction site');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Camera Junction / Pole Site"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Map Picker for Junction Pole */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <MapPicker
            latitude={formData.latitude ? parseFloat(formData.latitude) : null}
            longitude={formData.longitude ? parseFloat(formData.longitude) : null}
            address={formData.address}
            locationName={formData.name}
            onLocationSelect={handleLocationSelect}
          />
        </div>

        <FormField label="Junction / Site Landmark Name *">
          <input
            type="text"
            required
            placeholder="e.g. Junction 08 - Barasat Duckbungalow More CCTV Pole #03"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </FormField>

        <FormField label="Site Address & Landmarks">
          <input
            type="text"
            placeholder="e.g. Jessore Road & NH12 intersection near Barasat railway gate"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="CCTV Cameras Planned *">
            <input
              type="number"
              min="1"
              required
              value={formData.camerasPlanned}
              onChange={(e) => setFormData({ ...formData, camerasPlanned: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono font-bold"
            />
          </FormField>

          <FormField label="Pole Structure Type">
            <select
              value={formData.poleType}
              onChange={(e) => setFormData({ ...formData, poleType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="OCTAGONAL_POLE">Octagonal Galvanized Pole</option>
              <option value="SWAGED_POLE">Swaged Tubular Steel Pole</option>
              <option value="EXISTING_ELECTRIC_POLE">Existing Utility Pole</option>
              <option value="WALL_MOUNT">Building Wall / Cantilever</option>
              <option value="GANTRY_MAST">Overhead Highway Gantry</option>
            </select>
          </FormField>

          <FormField label="Power Supply Setup">
            <select
              value={formData.powerSource}
              onChange={(e) => setFormData({ ...formData, powerSource: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="GRID_EB_METER">Govt Grid EB Meter</option>
              <option value="SOLAR_PANEL">Solar PV Panel & Battery</option>
              <option value="UPS_BACKUP">Central UPS Feeder</option>
              <option value="STREETLIGHT_LINE">Streetlight Night Feeder</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="GPS Latitude">
            <input
              type="text"
              placeholder="e.g. 22.7233"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </FormField>

          <FormField label="GPS Longitude">
            <input
              type="text"
              placeholder="e.g. 88.4807"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </FormField>
        </div>

        <FormField label="Site Execution Notes">
          <textarea
            rows={2}
            placeholder="e.g. Requires 2 ANPR cameras facing traffic flow, 1 PTZ dome. Splicing box mounted at 3.5m height."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-slate-950 border-slate-800 text-slate-400 text-xs"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus size={14} />
            <span>{submitting ? 'Adding Site...' : 'Add Junction Site'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
