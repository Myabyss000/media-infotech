'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Car, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, inputClassName } from '@/components/ui/FormField';

export default function VehiclesPage() {
  const { hasPermission } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    registrationNo: '',
    type: 'Car',
    make: '',
    model: '',
    year: '',
    fuelType: 'Petrol',
    notes: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/vehicles');
      setVehicles(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/vehicles', form);
      setModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add vehicle');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Fleet Management"
        subtitle="Track company cars, vans, bikes, and employee assignments."
        action={
          hasPermission('vehicles', 'create') ? (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20"
            >
              <Plus size={16} />
              <span>Add New Vehicle</span>
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="text-xs text-slate-400">Loading vehicles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {vehicles.length === 0 ? (
            <EmptyState message="No vehicles registered in fleet." />
          ) : (
            vehicles.map((v) => (
              <div key={v.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Car size={20} />
                  </div>
                  <StatusBadge status={v.status} />
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base">{v.registrationNo}</h3>
                  <p className="text-xs text-slate-400">
                    {v.make} {v.model} ({v.type})
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                  <span>Fuel: {v.fuelType || 'N/A'}</span>
                  <span>Year: {v.year || 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Vehicle to Fleet"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Registration Number">
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
            <FormField label="Make">
              <input
                type="text"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="e.g. Maruti"
                className={inputClassName}
                required
              />
            </FormField>
            <FormField label="Model">
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. Swift"
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel="Add Vehicle"
          />
        </form>
      </Modal>
    </div>
  );
}
