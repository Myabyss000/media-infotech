'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  Filter,
  UsersRound,
  UserCheck,
  Car,
  CheckCircle2,
  Package,
  Barcode,
  Calendar,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';

export default function TicketsPage() {
  const { hasPermission } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  });

  // Dropdown Options
  const [groups, setGroups] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL_TIME');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [ticketToResolve, setTicketToResolve] = useState<any | null>(null);

  // Form State for Ticket Creation
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedGroupId: '',
    clientId: '',
    vehicleId: '',
    inventoryItemIds: [] as string[],
  });

  // Form State for Ticket Resolution / Solution
  const [resolveForm, setResolveForm] = useState({
    resolutionNote: '',
    inventoryItemIds: [] as string[],
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, filterGroup, timeRange, startDate, endDate, search]);

  const fetchAuxiliaryData = async () => {
    try {
      const [gRes, cRes, vRes, iRes] = await Promise.all([
        api.get('/api/groups'),
        api.get('/api/clients?limit=100'),
        api.get('/api/vehicles'),
        api.get('/api/inventory?limit=100'),
      ]);
      setGroups(gRes.data || []);
      setClients(cRes.data?.data || []);
      setVehicles(vRes.data || []);
      setInventoryList(iRes.data?.data || []);
    } catch (e) {
      console.error('Failed to load options', e);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = `/api/tickets?search=${search}`;
      if (filterStatus !== 'ALL') query += `&status=${filterStatus}`;
      if (filterPriority !== 'ALL') query += `&priority=${filterPriority}`;
      if (filterGroup !== 'ALL') query += `&assignedGroupId=${filterGroup}`;

      if (timeRange !== 'ALL_TIME' && timeRange !== 'CUSTOM') {
        query += `&timeRange=${timeRange}`;
      } else if (timeRange === 'CUSTOM' && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(query);
      setTickets(res.data.data || []);
      if (res.data.statusCounts) {
        setStatusCounts(res.data.statusCounts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/tickets', form);
      setModalOpen(false);
      setForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assignedGroupId: '',
        clientId: '',
        vehicleId: '',
        inventoryItemIds: [],
      });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, resolutionNote?: string, inventoryItemIds?: string[]) => {
    try {
      await api.put(`/api/tickets/${id}/status`, { status, resolutionNote, inventoryItemIds });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update ticket status');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToResolve) return;
    try {
      await handleUpdateStatus(
        ticketToResolve.id,
        'RESOLVED',
        resolveForm.resolutionNote,
        resolveForm.inventoryItemIds
      );
      setResolveModalOpen(false);
      setTicketToResolve(null);
      setResolveForm({ resolutionNote: '', inventoryItemIds: [] });
    } catch (e) {
      console.error(e);
    }
  };

  const totalTickets = statusCounts.OPEN + statusCounts.IN_PROGRESS + statusCounts.RESOLVED + statusCounts.CLOSED;
  const progressPercent =
    totalTickets > 0
      ? Math.round(((statusCounts.RESOLVED + statusCounts.CLOSED) / totalTickets) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Ticket System"
        subtitle="Raised by support managers to assign tasks to teams with linked client, vehicle, and inventory devices."
        icon={<TicketIcon className="text-blue-400" size={28} />}
        action={
          hasPermission('tickets', 'create') ? (
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              <span>Raise New Ticket</span>
            </button>
          ) : undefined
        }
      />

      {/* Ticket Status Bar & Progress Summary */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Overall Ticket Resolution Status
          </h2>
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-mono">
            <span className="text-blue-400 font-bold">{progressPercent}%</span>
            <span>Completed ({statusCounts.RESOLVED + statusCounts.CLOSED} / {totalTickets})</span>
          </div>
        </div>

        {/* Status Bar Indicator */}
        <div className="h-3.5 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
          <div
            style={{ width: `${totalTickets ? (statusCounts.OPEN / totalTickets) * 100 : 0}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`Open: ${statusCounts.OPEN}`}
          />
          <div
            style={{ width: `${totalTickets ? (statusCounts.IN_PROGRESS / totalTickets) * 100 : 0}%` }}
            className="bg-blue-500 transition-all duration-500"
            title={`In Progress: ${statusCounts.IN_PROGRESS}`}
          />
          <div
            style={{ width: `${totalTickets ? (statusCounts.RESOLVED / totalTickets) * 100 : 0}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Resolved: ${statusCounts.RESOLVED}`}
          />
          <div
            style={{ width: `${totalTickets ? (statusCounts.CLOSED / totalTickets) * 100 : 0}%` }}
            className="bg-slate-600 transition-all duration-500"
            title={`Closed: ${statusCounts.CLOSED}`}
          />
        </div>

        {/* Counter Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setFilterStatus(filterStatus === 'OPEN' ? 'ALL' : 'OPEN')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'OPEN'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">Open Tickets</p>
            <p className="text-xl font-extrabold font-mono text-amber-400 mt-1">{statusCounts.OPEN}</p>
          </div>

          <div
            onClick={() => setFilterStatus(filterStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'IN_PROGRESS'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">In Progress</p>
            <p className="text-xl font-extrabold font-mono text-blue-400 mt-1">{statusCounts.IN_PROGRESS}</p>
          </div>

          <div
            onClick={() => setFilterStatus(filterStatus === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'RESOLVED'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">Resolved</p>
            <p className="text-xl font-extrabold font-mono text-emerald-400 mt-1">{statusCounts.RESOLVED}</p>
          </div>

          <div
            onClick={() => setFilterStatus(filterStatus === 'CLOSED' ? 'ALL' : 'CLOSED')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'CLOSED'
                ? 'bg-slate-700/40 border-slate-600 text-slate-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
            }`}
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">Closed</p>
            <p className="text-xl font-extrabold font-mono text-slate-400 mt-1">{statusCounts.CLOSED}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket #, title, description..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Filter size={14} />
              <span>Filters:</span>
            </div>

            {/* Time Filter Select */}
            <div className="flex items-center space-x-1">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="ALL_TIME">All Time</option>
                <option value="TODAY">Created Today</option>
                <option value="THIS_WEEK">Created This Week</option>
                <option value="THIS_MONTH">Created This Month</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="ALL">All Assigned Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterGroup !== 'ALL' || timeRange !== 'ALL_TIME' || search) && (
              <button
                onClick={() => {
                  setFilterStatus('ALL');
                  setFilterPriority('ALL');
                  setFilterGroup('ALL');
                  setTimeRange('ALL_TIME');
                  setStartDate('');
                  setEndDate('');
                  setSearch('');
                }}
                className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers (Revealed when CUSTOM is selected) */}
        {timeRange === 'CUSTOM' && (
          <div className="flex flex-wrap items-center space-x-3 pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center space-x-1 font-semibold">
              <Calendar size={14} className="text-blue-400" />
              <span>Select Custom Range:</span>
            </span>

            <div className="flex items-center space-x-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading support tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800 text-xs">
          No support tickets found matching your selected query and time filter.
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => {
            const priorityBadge =
              t.priority === 'URGENT'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : t.priority === 'HIGH'
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : t.priority === 'MEDIUM'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700';

            const statusBadge =
              t.status === 'OPEN'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : t.status === 'IN_PROGRESS'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : t.status === 'RESOLVED'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-700/40 text-slate-400 border-slate-600';

            return (
              <div
                key={t.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-4 shadow-lg"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-extrabold text-blue-400 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      {t.ticketNumber}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${priorityBadge}`}>
                      {t.priority} Priority
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${statusBadge}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-mono">
                    Raised {formatDateTime(t.createdAt)} by {t.createdBy?.firstName} {t.createdBy?.lastName}
                  </div>
                </div>

                {/* Main Info */}
                <div>
                  <h3 className="text-base font-bold text-white">{t.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t.description}</p>
                </div>

                {/* Assigned Meta Grid: Group, Client, Vehicle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                  {/* Assigned Group */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-xs"
                      style={{ backgroundColor: t.assignedGroup?.color || '#3b82f6' }}
                    >
                      <UsersRound size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Assigned Group</p>
                      <p className="font-bold text-white truncate">{t.assignedGroup?.name || 'Unassigned'}</p>
                    </div>
                  </div>

                  {/* Linked Client */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                      <UserCheck size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Client Account</p>
                      <p className="font-bold text-white truncate">
                        {t.client ? `${t.client.name} (${t.client.companyName || 'Individual'})` : 'No Client Attached'}
                      </p>
                    </div>
                  </div>

                  {/* Linked Vehicle */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Car size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Assigned Vehicle</p>
                      <p className="font-bold text-white truncate">
                        {t.vehicle ? `${t.vehicle.registrationNo} (${t.vehicle.make} ${t.vehicle.model})` : 'No Vehicle Assigned'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attached Inventory Devices */}
                {t.inventoryItems && t.inventoryItems.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
                    <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center space-x-1">
                      <Package size={12} className="text-blue-400" />
                      <span>Attached Inventory Hardware Devices</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {t.inventoryItems.map((inv: any) => (
                        <span
                          key={inv.id}
                          className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 font-mono text-[11px] border border-blue-500/20 inline-flex items-center space-x-1.5"
                        >
                          <Barcode size={10} />
                          <span>
                            {inv.inventoryItem?.deviceName} ({inv.inventoryItem?.barcode})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Advancement Bar Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    {t.resolutionNote && (
                      <span className="text-emerald-400 font-semibold">
                        Resolution Note: {t.resolutionNote}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {t.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold border border-blue-500/30 transition"
                      >
                        Start Work (In Progress)
                      </button>
                    )}

                    {t.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => {
                          setTicketToResolve(t);
                          setResolveForm({ resolutionNote: '', inventoryItemIds: [] });
                          setResolveModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-semibold border border-emerald-500/30 transition"
                      >
                        Mark Resolved (Add Solution Devices)
                      </button>
                    )}

                    {t.status === 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'CLOSED')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raise Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <TicketIcon size={20} className="text-blue-400" />
                <span>Raise Support Ticket</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Ticket Title / Issue Summary
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. CCTV Camera Malfunction at Client Site Sector 62"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Detailed Issue Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explain problem details, location, and requirement..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Priority Level
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Assign to Team / Group
                  </label>
                  <select
                    value={form.assignedGroupId}
                    onChange={(e) => setForm({ ...form, assignedGroupId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="">Select Group (Optional)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Link Client Account
                  </label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="">Select Client (Optional)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Assign Vehicle for Ticket
                  </label>
                  <select
                    value={form.vehicleId}
                    onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="">Select Vehicle (Optional)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNo} ({v.make} {v.model})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attach Inventory Devices */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Assign Inventory Devices to Ticket & Group
                </label>
                <select
                  multiple
                  value={form.inventoryItemIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setForm({ ...form, inventoryItemIds: selected });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-24"
                >
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.deviceName} ({inv.barcode}) — {inv.condition} [{inv.status}]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple devices.</p>
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
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  {submitting ? 'Raising Ticket...' : 'Raise Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Resolution Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <span>Mark Ticket Resolved</span>
            </h2>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Resolution / Solution Notes
                </label>
                <textarea
                  value={resolveForm.resolutionNote}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolutionNote: e.target.value })}
                  placeholder="Describe resolution steps taken by the group..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Attach Installed / Replacement Devices
                </label>
                <select
                  multiple
                  value={resolveForm.inventoryItemIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setResolveForm({ ...resolveForm, inventoryItemIds: selected });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-24"
                >
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.deviceName} ({inv.barcode}) — {inv.condition}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
