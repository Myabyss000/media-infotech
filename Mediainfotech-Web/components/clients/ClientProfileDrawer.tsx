'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Wrench,
  Calendar,
  MessageCircle,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  DollarSign,
  Clock,
  Ticket as TicketIcon,
  ShieldCheck,
  Award,
  AlertCircle,
  CheckCircle2,
  FileText,
  UserCheck,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ClientModal } from './ClientModal';

interface ClientProfileDrawerProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  managers?: any[];
}

export function ClientProfileDrawer({
  clientId,
  isOpen,
  onClose,
  onUpdated,
  managers = [],
}: ClientProfileDrawerProps) {
  const { hasPermission } = useAuth();

  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'services' | 'billing' | 'interactions' | 'tickets'
  >('overview');

  // Modals & sub-forms
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddHistory, setShowAddHistory] = useState(false);

  // Service form
  const [serviceForm, setServiceForm] = useState({
    serviceName: '',
    startDate: '',
    endDate: '',
    amount: '',
    notes: '',
  });

  // Transaction form
  const [txForm, setTxForm] = useState({
    type: 'PAYMENT',
    amount: '',
    referenceNo: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // History form
  const [historyForm, setHistoryForm] = useState({
    type: 'CALL',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchClient();
    } else {
      setClient(null);
      setShowAddService(false);
      setShowAddTransaction(false);
      setShowAddHistory(false);
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !editModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editModalOpen, onClose]);

  const fetchClient = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/clients/${clientId}`);
      setClient(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Add Service Handler
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.serviceName) return;
    try {
      setActionLoading(true);
      await api.post(`/api/clients/${clientId}/services`, serviceForm);
      setServiceForm({ serviceName: '', startDate: '', endDate: '', amount: '', notes: '' });
      setShowAddService(false);
      fetchClient();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add service');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Service Handler
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to remove this service contract?')) return;
    try {
      await api.delete(`/api/clients/${clientId}/services/${serviceId}`);
      fetchClient();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete service');
    }
  };

  // Add Transaction Handler
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.date) return;
    try {
      setActionLoading(true);
      await api.post(`/api/clients/${clientId}/transactions`, txForm);
      setTxForm({
        type: 'PAYMENT',
        amount: '',
        referenceNo: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddTransaction(false);
      fetchClient();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to log transaction');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Are you sure you want to remove this transaction record?')) return;
    try {
      await api.delete(`/api/clients/${clientId}/transactions/${txId}`);
      fetchClient();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete transaction');
    }
  };

  // Add Interaction History Handler
  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyForm.title || !historyForm.date) return;
    try {
      setActionLoading(true);
      await api.post(`/api/clients/${clientId}/history`, historyForm);
      setHistoryForm({
        type: 'CALL',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddHistory(false);
      fetchClient();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record interaction');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete History Handler
  const handleDeleteHistory = async (historyId: string) => {
    if (!confirm('Are you sure you want to remove this interaction log?')) return;
    try {
      await api.delete(`/api/clients/${clientId}/history/${historyId}`);
      fetchClient();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete history');
    }
  };

  // Delete Client Handler
  const handleDeleteClient = async () => {
    if (!confirm(`Are you sure you want to permanently delete client "${client.name}" and all associated contracts?`)) return;
    try {
      await api.delete(`/api/clients/${clientId}`);
      alert('Client account removed successfully!');
      onClose();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete client');
    }
  };

  if (!isOpen) return null;

  // Compute billing balance
  let totalBilled = 0;
  let totalPaid = 0;
  if (client?.transactions) {
    for (const t of client.transactions) {
      if (t.type === 'INVOICE') totalBilled += t.amount || 0;
      else if (t.type === 'PAYMENT' || t.type === 'RECEIPT') totalPaid += t.amount || 0;
    }
  }
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  // Format clean phone for WhatsApp link
  const cleanPhone = client?.phone ? client.phone.replace(/[^0-9]/g, '') : '';
  const whatsappUrl = cleanPhone.length >= 10
    ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hello%20${encodeURIComponent(client?.name || '')},%20from%20Media%20Infotech`
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4 flex-shrink-0">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading client dossier...</div>
          ) : client ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-indigo-400/30 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
                {client.name?.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">{client.name}</h2>
                  <Badge
                    variant={client.status === 'ACTIVE' ? 'success' : client.status === 'PROSPECT' ? 'secondary' : 'destructive'}
                    className="text-[10px]"
                  >
                    {client.status}
                  </Badge>
                  {client.gstNumber && (
                    <Badge variant="outline" className="bg-slate-950 text-slate-300 font-mono text-[10px]">
                      GSTIN: {client.gstNumber}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  {client.companyName && (
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Building size={12} className="text-blue-400" />
                      {client.companyName}
                    </span>
                  )}
                  {client.city && <span>• {client.city}</span>}
                  <span>• {client.phone}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">No client data found</div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {client && (
              <>
                {/* 1-Click WhatsApp Quick Chat */}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle size={15} />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}

                {/* Direct Call Link */}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Call Client"
                  >
                    <Phone size={15} />
                  </a>
                )}

                {/* Edit Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditModalOpen(true)}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs gap-1.5"
                >
                  <Edit size={14} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>

                {/* Delete Button */}
                {hasPermission('clients', 'delete') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteClient}
                    className="bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs p-2"
                    title="Delete Client Profile"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {[
            { id: 'overview', label: 'Overview & Account', icon: Building },
            { id: 'services', label: `Services (${client?.services?.length || 0})`, icon: Wrench },
            { id: 'billing', label: `Billing & Ledger (${client?.transactions?.length || 0})`, icon: DollarSign },
            { id: 'interactions', label: `Activity Timeline (${client?.businessHistory?.length || 0})`, icon: Calendar },
            { id: 'tickets', label: `Support Tickets (${client?.tickets?.length || 0})`, icon: TicketIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                  active
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
              Loading 360° client dossier...
            </div>
          ) : !client ? (
            <div className="text-center py-20 text-slate-500 text-sm">Client profile not found.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & ACCOUNT */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Financial KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Total Billed (Invoices)</div>
                      <div className="text-base sm:text-lg font-bold text-white mt-1 font-mono">
                        {formatCurrency(totalBilled)}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Total Payments Received</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1 font-mono">
                        {formatCurrency(totalPaid)}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Outstanding Balance Due</div>
                      <div className={`text-base sm:text-lg font-bold mt-1 font-mono ${balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {formatCurrency(balanceDue)}
                      </div>
                    </div>
                  </div>

                  {/* Contact & Statutory Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} className="text-blue-400" />
                        <span>Contact & Account Profile</span>
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Primary Contact</p>
                          <p className="text-white font-bold">{client.name}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Company / Entity</p>
                          <p className="text-slate-300">{client.companyName || 'Individual'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Primary Phone</p>
                          <p className="text-white font-mono">{client.phone}</p>
                        </div>
                        {client.altPhone && (
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-semibold">Alternate / WhatsApp Phone</p>
                            <p className="text-emerald-400 font-mono">{client.altPhone}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Email Address</p>
                          <p className="text-slate-300">{client.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={14} className="text-amber-400" />
                        <span>Statutory & Address Details</span>
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">GSTIN / Tax ID</p>
                          <p className="text-white font-mono">{client.gstNumber || 'Not Registered'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase font-semibold">Billing Address</p>
                          <p className="text-slate-300">{client.address || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-semibold">City / State</p>
                            <p className="text-slate-300">{client.city || 'N/A'}{client.state ? `, ${client.state}` : ''}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-semibold">Pincode</p>
                            <p className="text-slate-300 font-mono">{client.pincode || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Account Manager Card */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Designated Account Manager
                        </span>
                        <h4 className="text-sm font-extrabold text-white mt-0.5">
                          {client.accountManager
                            ? `${client.accountManager.firstName} ${client.accountManager.lastName}`
                            : 'Direct to Company Management'}
                        </h4>
                        {client.accountManager?.email && (
                          <p className="text-xs text-slate-400 mt-0.5">{client.accountManager.email}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditModalOpen(true)}
                      className="text-xs bg-slate-900 border-slate-700"
                    >
                      Reassign Manager
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVE SERVICES & CONTRACTS */}
              {activeTab === 'services' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Active Service Contracts & Subscriptions</h3>
                      <p className="text-xs text-slate-400">AMC, Cloud, Hardware maintenance, or Development contracts.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddService(!showAddService)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                    >
                      <Plus size={14} />
                      <span>{showAddService ? 'Cancel' : 'Add Service'}</span>
                    </Button>
                  </div>

                  {/* Add Service Inline Form */}
                  {showAddService && (
                    <form
                      onSubmit={handleAddService}
                      className="p-4 rounded-2xl bg-slate-950 border border-blue-500/40 space-y-3.5 animate-in fade-in duration-150"
                    >
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        New Service Contract
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Service Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Annual IT Support & AMC, Cloud Hosting"
                            value={serviceForm.serviceName}
                            onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Billing Amount (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 50000"
                            value={serviceForm.amount}
                            onChange={(e) => setServiceForm({ ...serviceForm, amount: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Start Date</label>
                          <input
                            type="date"
                            value={serviceForm.startDate}
                            onChange={(e) => setServiceForm({ ...serviceForm, startDate: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">End / Renewal Date</label>
                          <input
                            type="date"
                            value={serviceForm.endDate}
                            onChange={(e) => setServiceForm({ ...serviceForm, endDate: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300">Contract Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. 24/7 SLA, 4 on-site visits per month"
                          value={serviceForm.notes}
                          onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddService(false)}
                          className="text-xs bg-slate-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={actionLoading}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                        >
                          {actionLoading ? 'Adding...' : 'Save Service Contract'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Services List */}
                  <div className="space-y-3">
                    {client.services?.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        No active service contracts recorded for this client.
                      </div>
                    ) : (
                      client.services?.map((s: any) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{s.serviceName}</h4>
                              <Badge variant="outline" className="text-[10px] bg-slate-900 text-blue-400 border-blue-500/30">
                                {s.status?.toUpperCase() || 'ACTIVE'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">
                              {s.startDate ? formatDate(s.startDate) : 'Immediate'} — {s.endDate ? formatDate(s.endDate) : 'Ongoing / Retainer'}
                            </p>
                            {s.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">{s.notes}</p>}
                          </div>

                          <div className="flex items-center gap-3">
                            {s.amount && (
                              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                {formatCurrency(s.amount)}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteService(s.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                              title="Delete Service"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: BILLING & PAYMENT LEDGER */}
              {activeTab === 'billing' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Financial Ledger & Invoicing</h3>
                      <p className="text-xs text-slate-400">Track invoices generated and payments received.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddTransaction(!showAddTransaction)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                    >
                      <Plus size={14} />
                      <span>{showAddTransaction ? 'Cancel' : 'Log Payment / Invoice'}</span>
                    </Button>
                  </div>

                  {/* Add Transaction Inline Form */}
                  {showAddTransaction && (
                    <form
                      onSubmit={handleAddTransaction}
                      className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3.5 animate-in fade-in duration-150"
                    >
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Log Financial Record
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Transaction Type *</label>
                          <select
                            value={txForm.type}
                            onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          >
                            <option value="PAYMENT">PAYMENT (Received)</option>
                            <option value="INVOICE">INVOICE (Billed)</option>
                            <option value="RECEIPT">RECEIPT</option>
                            <option value="REFUND">REFUND</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Amount (₹) *</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 25000"
                            value={txForm.amount}
                            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Transaction Date *</label>
                          <input
                            type="date"
                            required
                            value={txForm.date}
                            onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Reference / Invoice No</label>
                          <input
                            type="text"
                            placeholder="e.g. INV-2026-0042, UPI-998234"
                            value={txForm.referenceNo}
                            onChange={(e) => setTxForm({ ...txForm, referenceNo: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Description / Note</label>
                          <input
                            type="text"
                            placeholder="e.g. Q1 AMC installment via NEFT"
                            value={txForm.description}
                            onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddTransaction(false)}
                          className="text-xs bg-slate-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          {actionLoading ? 'Logging...' : 'Record Transaction'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Ledger Table */}
                  <div className="space-y-2">
                    {client.transactions?.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        No financial transactions logged yet.
                      </div>
                    ) : (
                      client.transactions?.map((t: any) => {
                        const isCredit = t.type === 'PAYMENT' || t.type === 'RECEIPT';
                        return (
                          <div
                            key={t.id}
                            className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-xl border ${
                                  isCredit
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                }`}
                              >
                                <DollarSign size={15} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white uppercase text-[11px]">{t.type}</span>
                                  {t.referenceNo && (
                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                      {t.referenceNo}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-400 text-[11px] mt-0.5">
                                  {t.description || 'Standard transaction'} • {formatDate(t.date)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`font-mono font-bold text-sm ${isCredit ? 'text-emerald-400' : 'text-blue-300'}`}>
                                {isCredit ? '+' : ''}{formatCurrency(t.amount)}
                              </span>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACTIVITY & INTERACTION TIMELINE */}
              {activeTab === 'interactions' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Business Interaction Timeline</h3>
                      <p className="text-xs text-slate-400">Meeting minutes, call logs, site visits, and client notes.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddHistory(!showAddHistory)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
                    >
                      <Plus size={14} />
                      <span>{showAddHistory ? 'Cancel' : 'Log Interaction'}</span>
                    </Button>
                  </div>

                  {/* Add Interaction Form */}
                  {showAddHistory && (
                    <form
                      onSubmit={handleAddHistory}
                      className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3.5 animate-in fade-in duration-150"
                    >
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        Log Meeting or Call Activity
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Activity Type *</label>
                          <select
                            value={historyForm.type}
                            onChange={(e) => setHistoryForm({ ...historyForm, type: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          >
                            <option value="CALL">Phone Call</option>
                            <option value="MEETING">In-Person Meeting</option>
                            <option value="VISIT">Client Site Visit</option>
                            <option value="WHATSAPP">WhatsApp / Chat</option>
                            <option value="EMAIL">Official Email</option>
                            <option value="NOTE">Internal Note</option>
                            <option value="FOLLOW_UP">Follow-Up Scheduled</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300">Subject / Title *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Discussed annual AMC renewal and server upgrade"
                            value={historyForm.title}
                            onChange={(e) => setHistoryForm({ ...historyForm, title: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Interaction Date *</label>
                          <input
                            type="date"
                            required
                            value={historyForm.date}
                            onChange={(e) => setHistoryForm({ ...historyForm, date: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300">Discussion Details / Next Action</label>
                          <input
                            type="text"
                            placeholder="e.g. Client requested 5% discount on 2-year contract; will send revised quote on Monday"
                            value={historyForm.description}
                            onChange={(e) => setHistoryForm({ ...historyForm, description: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddHistory(false)}
                          className="text-xs bg-slate-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={actionLoading}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          {actionLoading ? 'Saving...' : 'Record Activity'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* History Timeline */}
                  <div className="space-y-3">
                    {client.businessHistory?.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        No client interactions logged yet.
                      </div>
                    ) : (
                      client.businessHistory?.map((h: any) => (
                        <div
                          key={h.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                              <Clock size={15} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800 font-mono">
                                  {h.type}
                                </span>
                                <span className="text-xs font-bold text-white">{h.title}</span>
                              </div>
                              {h.description && (
                                <p className="text-xs text-slate-300 mt-1">{h.description}</p>
                              )}
                              <p className="text-[10px] text-slate-500 font-mono mt-1">
                                Logged on {formatDate(h.date)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteHistory(h.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition flex-shrink-0"
                            title="Delete Log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: LINKED SUPPORT TICKETS */}
              {activeTab === 'tickets' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white">Support & Service Tickets</h3>
                    <p className="text-xs text-slate-400">Live operational and maintenance tickets associated with this client.</p>
                  </div>

                  <div className="space-y-3">
                    {client.tickets?.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                        No support tickets linked to this client account.
                      </div>
                    ) : (
                      client.tickets?.map((t: any) => (
                        <div
                          key={t.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                {t.ticketNumber}
                              </span>
                              <span className="text-xs font-bold text-white">{t.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Priority: <span className="font-semibold text-slate-300">{t.priority}</span> • Created: {formatDate(t.createdAt)}
                            </p>
                          </div>

                          <Badge
                            variant={t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'success' : 'default'}
                            className="text-[10px]"
                          >
                            {t.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Client Modal */}
      <ClientModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          fetchClient();
          if (onUpdated) onUpdated();
        }}
        client={client}
        managers={managers}
      />
    </div>
  );
}
