'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { X, Building, User, Phone, Mail, MapPin, CreditCard, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: any | null; // If provided, we are in Edit mode
  managers?: any[];
}

export function ClientModal({
  isOpen,
  onClose,
  onSuccess,
  client,
  managers = [],
}: ClientModalProps) {
  const isEditing = Boolean(client?.id);

  const [form, setForm] = useState({
    name: '',
    companyName: '',
    status: 'ACTIVE',
    phone: '',
    altPhone: '',
    email: '',
    gstNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    accountManagerId: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        companyName: client.companyName || '',
        status: client.status || 'ACTIVE',
        phone: client.phone || '',
        altPhone: client.altPhone || '',
        email: client.email || '',
        gstNumber: client.gstNumber || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        pincode: client.pincode || '',
        accountManagerId: client.accountManagerId || '',
      });
    } else {
      setForm({
        name: '',
        companyName: '',
        status: 'ACTIVE',
        phone: '',
        altPhone: '',
        email: '',
        gstNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        accountManagerId: '',
      });
    }
  }, [client, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      alert('Client Name and Phone Number are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await api.put(`/api/clients/${client.id}`, form);
        alert('Client profile updated successfully!');
      } else {
        await api.post('/api/clients', form);
        alert('Client account registered successfully!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save client profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition flex items-center gap-1 text-xs font-semibold"
              title="Return"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Return</span>
            </button>
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {isEditing ? 'Edit Client Account' : 'Register New Client Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditing
                  ? `Update contact and billing credentials for ${client.name}`
                  : 'Add a new client profile, business details, and assign an account manager.'}
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

        {/* Scrollable Form Body */}
        <form
          id="client-form"
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar"
        >
          {/* Primary Identity Grid */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-blue-400" />
                <span>Client & Company Details</span>
              </span>

              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Account Status:</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PROSPECT">PROSPECT / LEAD</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Contact / Person Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Apex Tech Solutions Ltd."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alternate Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={form.altPhone}
                  onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                  placeholder="e.g. +91 98765 43211"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. contact@apextech.com"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Account Manager
                </label>
                <select
                  value={form.accountManagerId}
                  onChange={(e) => setForm({ ...form, accountManagerId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Direct to Company / Unassigned --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.role} - {m.department || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Statutory & Location Details */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-amber-400" />
              <span>Statutory GST & Address Details</span>
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                GSTIN / Tax Identification Number
              </label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Office / Billing Street Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. Suite 402, Tech Park, Outer Ring Road..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="e.g. 560103"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ← Cancel
          </button>

          <Button
            type="submit"
            form="client-form"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-blue-500/20"
          >
            {submitting ? 'Saving Account...' : isEditing ? 'Save Client Profile' : 'Create Client Account'}
          </Button>
        </div>
      </div>
    </div>
  );
}
