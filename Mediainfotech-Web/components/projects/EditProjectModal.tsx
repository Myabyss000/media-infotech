'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  Save,
  Trash2,
  Building2,
  IndianRupee,
  Calendar,
  Users,
  Truck,
  MapPin,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MapPicker } from '@/components/ui/MapPicker';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (projectId: string) => void;
  project: any | null;
  clients: any[];
  groups: any[];
  vehicles: any[];
  users: any[];
}

export function EditProjectModal({
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  project,
  clients,
  groups,
  vehicles,
  users,
}: EditProjectModalProps) {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'FINANCIALS' | 'TEAM' | 'LOCATION' | 'DANGER'>('DETAILS');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    tenderNo: '',
    workOrderNo: '',
    tenderAuthority: '',
    description: '',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    contractValue: '',
    emdAmount: '',
    billingProgress: '',
    locationName: '',
    address: '',
    latitude: '',
    longitude: '',
    workOrderDate: '',
    startDate: '',
    targetEndDate: '',
    completedDate: '',
    clientId: '',
    groupId: '',
    vehicleId: '',
    managerId: '',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        tenderNo: project.tenderNo || '',
        workOrderNo: project.workOrderNo || '',
        tenderAuthority: project.tenderAuthority || '',
        description: project.description || '',
        status: project.status || 'IN_PROGRESS',
        priority: project.priority || 'HIGH',
        contractValue: project.contractValue ? String(project.contractValue) : '',
        emdAmount: project.emdAmount ? String(project.emdAmount) : '',
        billingProgress: project.billingProgress ? String(project.billingProgress) : '',
        locationName: project.locationName || '',
        address: project.address || '',
        latitude: project.latitude ? String(project.latitude) : '',
        longitude: project.longitude ? String(project.longitude) : '',
        workOrderDate: project.workOrderDate ? project.workOrderDate.split('T')[0] : '',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        targetEndDate: project.targetEndDate ? project.targetEndDate.split('T')[0] : '',
        completedDate: project.completedDate ? project.completedDate.split('T')[0] : '',
        clientId: project.clientId || '',
        groupId: project.groupId || '',
        vehicleId: project.vehicleId || '',
        managerId: project.managerId || '',
      });
      setActiveTab('DETAILS');
      setError(null);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;
    if (!formData.name.trim()) {
      setError('Project title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.put(`/api/projects/${project.id}`, {
        ...formData,
        contractValue: formData.contractValue ? parseFloat(formData.contractValue) : null,
        emdAmount: formData.emdAmount ? parseFloat(formData.emdAmount) : null,
        billingProgress: formData.billingProgress ? parseFloat(formData.billingProgress) : 0,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        workOrderDate: formData.workOrderDate || null,
        startDate: formData.startDate || null,
        targetEndDate: formData.targetEndDate || null,
        completedDate: formData.completedDate || null,
        clientId: formData.clientId || null,
        groupId: formData.groupId || null,
        vehicleId: formData.vehicleId || null,
        managerId: formData.managerId || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update project error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id) return;
    if (!confirm(`Are you sure you want to permanently delete project [${project.code}] "${project.name}"? All associated milestones and sites will be deleted.`)) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/api/projects/${project.id}`);
      if (onDelete) onDelete(project.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delete project error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Tender Project • ${project?.code || ''}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'DETAILS', label: 'Tender Overview', icon: FileText },
            { id: 'FINANCIALS', label: 'Budget & Timeline', icon: IndianRupee },
            { id: 'TEAM', label: 'Team & Van Dispatch', icon: Users },
            { id: 'LOCATION', label: 'Site Location', icon: MapPin },
            { id: 'DANGER', label: 'Danger Zone', icon: Trash2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isDanger = tab.id === 'DANGER';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? isDanger
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isDanger
                    ? 'text-rose-400/70 hover:text-rose-300 hover:bg-rose-950/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: DETAILS */}
        {activeTab === 'DETAILS' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="Project / Tender Title *">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </FormField>
              </div>

              <FormField label="Tender Number / Gazette Ref">
                <input
                  type="text"
                  placeholder="e.g. TND/PWD/SURV/2026/04"
                  value={formData.tenderNo}
                  onChange={(e) => setFormData({ ...formData, tenderNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>

              <FormField label="Work Order Number">
                <input
                  type="text"
                  placeholder="e.g. WO-WB-POLICE-9821"
                  value={formData.workOrderNo}
                  onChange={(e) => setFormData({ ...formData, workOrderNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>

              <FormField label="Government Department / Authority">
                <input
                  type="text"
                  placeholder="e.g. Municipal Corporation & Police Department"
                  value={formData.tenderAuthority}
                  onChange={(e) => setFormData({ ...formData, tenderAuthority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>

              <FormField label="Associated Client Account">
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">No Client Linked</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Project Scope & Description">
                  <textarea
                    rows={3}
                    placeholder="Turnkey CCTV surveillance, optical fiber networking, ANPR cameras..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIALS & TIMELINE */}
        {activeTab === 'FINANCIALS' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Contract Sanctioned Budget (₹)">
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-2.5 text-amber-400" />
                  <input
                    type="number"
                    placeholder="4850000"
                    value={formData.contractValue}
                    onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </FormField>

              <FormField label="EMD Security Deposit (₹)">
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="number"
                    placeholder="242500"
                    value={formData.emdAmount}
                    onChange={(e) => setFormData({ ...formData, emdAmount: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </FormField>

              <FormField label="Work Order Date">
                <input
                  type="date"
                  value={formData.workOrderDate}
                  onChange={(e) => setFormData({ ...formData, workOrderDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>

              <FormField label="Execution Start Date">
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>

              <FormField label="Target Handover / Deadline Date">
                <input
                  type="date"
                  value={formData.targetEndDate}
                  onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>

              <FormField label="Actual Commissioning Date (if finished)">
                <input
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM & VEHICLE DISPATCH */}
        {activeTab === 'TEAM' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Lifecycle Stage">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="PLANNING">Planning & Survey</option>
                  <option value="MATERIAL_PROCUREMENT">Material Procurement</option>
                  <option value="IN_PROGRESS">Field Execution</option>
                  <option value="TESTING_INSPECTION">Testing & JIR Inspection</option>
                  <option value="COMMISSIONED">Commissioned & AMC</option>
                </select>
              </FormField>

              <FormField label="SLA Priority">
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent SLA</option>
                </select>
              </FormField>

              <FormField label="Assigned Field Team (Group)">
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">No Team Assigned</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Assigned Service Van">
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">No Vehicle Assigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNo} ({v.model})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Project Manager In-Charge">
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">Unassigned Manager</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role} - {u.designation || u.department})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SITE LOCATION & PRECISION MAP */}
        {activeTab === 'LOCATION' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            {/* Interactive Precision Map */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <MapPicker
                latitude={formData.latitude ? parseFloat(formData.latitude) : null}
                longitude={formData.longitude ? parseFloat(formData.longitude) : null}
                address={formData.address}
                locationName={formData.locationName}
                onLocationSelect={(loc) => {
                  setFormData((prev) => ({
                    ...prev,
                    latitude: String(loc.latitude),
                    longitude: String(loc.longitude),
                    address: loc.address,
                    locationName: loc.locationName || prev.locationName || loc.address.split(',')[0],
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="Primary Territory / City Landmark">
                  <input
                    type="text"
                    placeholder="e.g. Salt Lake Sector 5 Traffic Corridor"
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Full Project Address">
                  <input
                    type="text"
                    placeholder="e.g. Salt Lake Electronic Complex, Sector 5, Kolkata, WB - 700091"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </FormField>
              </div>

              <FormField label="Latitude GPS">
                <input
                  type="text"
                  placeholder="e.g. 22.5804"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </FormField>

              <FormField label="Longitude GPS">
                <input
                  type="text"
                  placeholder="e.g. 88.4328"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </FormField>
            </div>
          </div>
        )}

        {/* TAB 5: DANGER ZONE / DELETE */}
        {activeTab === 'DANGER' && (
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle size={17} />
              <span>Delete Government Tender Project</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Permanently deleting project <b className="text-white font-mono">[{project?.code}]</b> will remove all associated milestone checklists, camera junction sites, and uploaded tender documents.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 size={14} />
                <span>{deleting ? 'Deleting Project...' : 'Permanently Delete Project'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-indigo-600/30 px-5"
            >
              <Save size={14} />
              <span>{submitting ? 'Saving Changes...' : 'Save Updates'}</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
