'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Car,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  RotateCcw,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Calendar,
  AlertCircle,
  Key,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, inputClassName } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function VehiclesPage() {
  const { hasRole, hasPermission } = useAuth();
  const canManage = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('vehicles', 'create');

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [assignedUserId, setAssignedUserId] = useState('');
  const [assignPurpose, setAssignPurpose] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [form, setForm] = useState({
    registrationNo: '',
    type: 'Car',
    make: '',
    model: '',
    year: '',
    fuelType: 'Petrol',
    status: 'AVAILABLE',
    notes: '',
  });

  useEffect(() => {
    fetchVehicles();
    fetchEmployees();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/vehicles');
      setVehicles(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/api/users?limit=100');
      setEmployees(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    setEditingVehicleId(null);
    setForm({
      registrationNo: '',
      type: 'Car',
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      fuelType: 'Petrol',
      status: 'AVAILABLE',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingVehicleId(v.id);
    setForm({
      registrationNo: v.registrationNo || '',
      type: v.type || 'Car',
      make: v.make || '',
      model: v.model || '',
      year: v.year ? v.year.toString() : '',
      fuelType: v.fuelType || 'Petrol',
      status: v.status || 'AVAILABLE',
      notes: v.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicleId) {
        await api.put(`/api/vehicles/${editingVehicleId}`, form);
      } else {
        await api.post('/api/vehicles', form);
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save vehicle');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to remove this vehicle from fleet?')) return;
    try {
      await api.delete(`/api/vehicles/${vehicleId}`);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  const handleOpenAssign = (v: any) => {
    setSelectedVehicle(v);
    setAssignedUserId('');
    setAssignPurpose('');
    setAssignNotes('');
    setAssignModalOpen(true);
  };

  const handleAssignVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !assignedUserId) return;
    try {
      await api.post(`/api/vehicles/${selectedVehicle.id}/assign`, {
        userId: assignedUserId,
        purpose: assignPurpose,
        notes: assignNotes,
      });
      setAssignModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign vehicle');
    }
  };

  const handleReturnVehicle = async (vehicleId: string) => {
    if (!confirm('Confirm return of this vehicle to the company pool?')) return;
    try {
      await api.put(`/api/vehicles/${vehicleId}/return`);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to return vehicle');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      !search ||
      v.registrationNo?.toLowerCase().includes(search.toLowerCase()) ||
      v.make?.toLowerCase().includes(search.toLowerCase()) ||
      v.model?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Car size={16} />
            <span>{canManage ? 'Fleet & Transport Operations' : 'Assigned Field Transport'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {canManage ? 'Company Vehicle Fleet Management' : 'My Assigned Service Vehicle'}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            {canManage
              ? 'Track company cars, maintenance status, fuel types, insurance validity, and driver assignments.'
              : 'Company vehicle or service van assigned to your custody or your active field group.'}
          </p>
        </div>

        {canManage && (
          <Button
            onClick={handleOpenCreate}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-amber-600/20"
          >
            <Plus size={15} />
            <span>Add New Vehicle</span>
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search registration, make, or model..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total Vehicles: <span className="text-white font-bold">{vehicles.length}</span>
        </div>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-xs">Loading vehicle fleet...</span>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
            <Car size={26} />
          </div>
          <h3 className="text-base font-bold text-white">
            {canManage ? 'No vehicles found matching the criteria.' : 'No Vehicle Assigned'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {canManage
              ? 'Try adjusting your search query or add a new vehicle.'
              : 'You currently do not have a company vehicle or group service van assigned to your custody.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((v) => {
            const activeAssignment = v.assignments?.[0];
            return (
              <div
                key={v.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 transition-all duration-200 shadow-xl flex flex-col justify-between group space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Car size={22} />
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        v.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : v.status === 'ASSIGNED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }
                    >
                      {v.status}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-extrabold text-white text-base tracking-wide font-mono">
                      {v.registrationNo}
                    </h3>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">
                      {v.make} {v.model} ({v.type})
                    </p>
                  </div>

                  {activeAssignment?.user && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {activeAssignment.user.firstName?.[0]}
                      </div>
                      <div className="text-[11px] min-w-0 flex-1">
                        <span className="text-slate-400">Assigned: </span>
                        <span className="font-bold text-white truncate">
                          {activeAssignment.user.firstName} {activeAssignment.user.lastName}
                        </span>
                      </div>
                    </div>
                  )}

                  {v.notes && (
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                      {v.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500">
                    {v.fuelType || 'Petrol'} {v.year ? `• ${v.year}` : ''}
                  </span>

                  {/* Actions (Only for Managers / Admins) */}
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssign(v)}
                        className="text-[11px] h-7 bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300 gap-1"
                      >
                        <UserCheck size={12} />
                        <span>{activeAssignment ? 'Reassign' : 'Assign'}</span>
                      </Button>

                      {activeAssignment && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturnVehicle(v.id)}
                          className="text-[11px] h-7 bg-slate-950 border-slate-800 hover:bg-slate-800 text-amber-400 gap-1"
                          title="Mark vehicle returned to pool"
                        >
                          <RotateCcw size={12} />
                          <span>Return</span>
                        </Button>
                      )}

                      <button
                        onClick={(e) => handleOpenEdit(v, e)}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                        title="Edit Details"
                      >
                        <Edit size={13} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteVehicle(v.id, e)}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Vehicle"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicleId ? 'Edit Fleet Vehicle' : 'Add Vehicle to Fleet'}
      >
        <form onSubmit={handleSubmitVehicle} className="space-y-4 text-xs">
          <FormField label="Registration Number *">
            <input
              type="text"
              value={form.registrationNo}
              onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
              placeholder="e.g. DL-01-AB-1234"
              className={inputClassName}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vehicle Type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputClassName}
              >
                <option value="Car">Car</option>
                <option value="Van">Van</option>
                <option value="Bike">Motorcycle</option>
                <option value="Truck">Commercial Truck</option>
                <option value="EV">Electric Vehicle</option>
              </select>
            </FormField>

            <FormField label="Fuel Type">
              <select
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                className={inputClassName}
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric (EV)</option>
                <option value="CNG">CNG</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Make *">
              <input
                type="text"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="e.g. Maruti"
                className={inputClassName}
                required
              />
            </FormField>

            <FormField label="Model *">
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. Swift Dzire"
                className={inputClassName}
                required
              />
            </FormField>

            <FormField label="Model Year">
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="2024"
                className={inputClassName}
              />
            </FormField>
          </div>

          {editingVehicleId && (
            <FormField label="Fleet Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClassName}
              >
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
            </FormField>
          )}

          <FormField label="Notes / Fleet Details">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Fastag ID, insurance policy number, servicing schedule..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none h-20"
            />
          </FormField>

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel={editingVehicleId ? 'Save Changes' : 'Add Vehicle'}
          />
        </form>
      </Modal>

      {/* Assign Vehicle Modal */}
      {assignModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                Assign Vehicle ({selectedVehicle.registrationNo})
              </h4>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignVehicle} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Select Employee *</label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.designation || emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Assignment Purpose</label>
                <input
                  type="text"
                  value={assignPurpose}
                  onChange={(e) => setAssignPurpose(e.target.value)}
                  placeholder="e.g. Daily client visits, Sales route, Logistics"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Notes</label>
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Fuel card issued, key handed over"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  Assign Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
