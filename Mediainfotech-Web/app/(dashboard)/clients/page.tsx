'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { UserCheck, Plus, Search, Phone, Mail, Building, DollarSign, Wrench } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ClientsPage() {
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    altPhone: '',
    address: '',
    city: '',
    gstNumber: '',
  });

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    try {
      const res = await api.get(`/api/clients?search=${search}`);
      setClients(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/clients', form);
      setModalOpen(false);
      fetchClients();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create client');
    }
  };

  const fetchClientDetails = async (id: string) => {
    try {
      const res = await api.get(`/api/clients/${id}`);
      setSelectedClient(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Client Accounts & Service History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage clients, service types, transaction logs, and complete interaction history.
          </p>
        </div>

        {hasPermission('clients', 'create') && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} />
            <span>Add New Client</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name, company, phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Grid of Clients */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading clients...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800">
              No client profiles found.
            </div>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                onClick={() => fetchClientDetails(c.id)}
                className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition cursor-pointer space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                    {c.name.charAt(0)}
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                    {c.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base group-hover:text-blue-400 transition">
                    {c.name}
                  </h3>
                  {c.companyName && (
                    <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Building size={12} className="text-slate-500" />
                      <span>{c.companyName}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p className="flex items-center space-x-2">
                    <Phone size={12} className="text-slate-500" />
                    <span>{c.phone}</span>
                  </p>
                  {c.email && (
                    <p className="flex items-center space-x-2 text-slate-400">
                      <Mail size={12} className="text-slate-500" />
                      <span>{c.email}</span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{c._count?.services || 0} Services Active</span>
                  <span className="text-blue-400 font-semibold">View History →</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">{selectedClient.name}</h2>
                <p className="text-xs text-slate-400">{selectedClient.companyName || 'Individual Client'}</p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Contact Phone</p>
                <p className="text-white font-mono mt-0.5">{selectedClient.phone}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Email Address</p>
                <p className="text-white mt-0.5">{selectedClient.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">GST Number</p>
                <p className="text-white font-mono mt-0.5">{selectedClient.gstNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Address</p>
                <p className="text-white mt-0.5">{selectedClient.address || 'N/A'}</p>
              </div>
            </div>

            {/* Services History */}
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-3">
                <Wrench size={16} className="text-blue-400" />
                <span>Services Provided</span>
              </h3>
              <div className="space-y-2">
                {selectedClient.services?.length === 0 ? (
                  <p className="text-xs text-slate-500">No active service contracts.</p>
                ) : (
                  selectedClient.services?.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">{s.serviceName}</p>
                        <p className="text-[11px] text-slate-400">
                          {s.startDate ? formatDate(s.startDate) : ''} — {s.endDate ? formatDate(s.endDate) : 'Ongoing'}
                        </p>
                      </div>
                      <p className="font-mono text-emerald-400 font-bold">{formatCurrency(s.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Transactions History */}
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-3">
                <DollarSign size={16} className="text-emerald-400" />
                <span>Transaction & Billing History</span>
              </h3>
              <div className="space-y-2">
                {selectedClient.transactions?.length === 0 ? (
                  <p className="text-xs text-slate-500">No payment/invoice history logged.</p>
                ) : (
                  selectedClient.transactions?.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white uppercase text-[10px]">{t.type}</p>
                        <p className="text-slate-400 text-[11px]">{t.description || t.referenceNo}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="font-bold text-white">{formatCurrency(t.amount)}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(t.date)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Add Client Account</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Client / Contact Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Apex Tech Solutions"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                >
                  Create Client Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
