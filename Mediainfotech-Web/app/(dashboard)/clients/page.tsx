'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Building,
  DollarSign,
  Wrench,
  MessageCircle,
  LayoutGrid,
  List,
  Download,
  ShieldCheck,
  UserPlus,
  ArrowUpRight,
  Edit,
  ExternalLink,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ClientStatsCards } from '@/components/clients/ClientStatsCards';
import { ClientProfileDrawer } from '@/components/clients/ClientProfileDrawer';
import { ClientModal } from '@/components/clients/ClientModal';

export default function ClientsPage() {
  const { hasPermission } = useAuth();

  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PROSPECT' | 'INACTIVE'>('ACTIVE');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);

  useEffect(() => {
    fetchClients();
    fetchStats();
    fetchManagers();
  }, [search, statusFilter, managerFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/api/clients?${params.toString()}`);
      let list = res.data.data || [];

      if (managerFilter !== 'ALL') {
        list = list.filter((c: any) => c.accountManagerId === managerFilter);
      }

      setClients(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/api/clients/stats');
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/api/users?limit=200');
      setManagers(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpen360 = (clientId: string) => {
    setSelectedClientId(clientId);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (clients.length === 0) {
      alert('No clients available to export.');
      return;
    }

    const headers = ['Client Name', 'Company Name', 'Status', 'Phone', 'Alt Phone', 'Email', 'GSTIN', 'Address', 'City', 'State', 'Account Manager'];
    const rows = clients.map((c) => [
      `"${c.name || ''}"`,
      `"${c.companyName || ''}"`,
      `"${c.status || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.altPhone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.gstNumber || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.city || ''}"`,
      `"${c.state || ''}"`,
      `"${c.accountManager ? `${c.accountManager.firstName} ${c.accountManager.lastName}` : 'Unassigned'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MediaInfotech_Clients_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Client Accounts & CRM Hub</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage corporate client accounts, active service subscriptions, financial ledgers, and CRM interaction logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Download size={14} />
            <span>Export Master CSV</span>
          </Button>

          {hasPermission('clients', 'create') && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <Plus size={15} />
              <span>Add New Client</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <ClientStatsCards stats={stats} loading={statsLoading} />

      {/* Status Lifecycle Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Active Accounts</span>
          {stats?.activeClients !== undefined && (
            <Badge variant="outline" className="text-[10px] bg-slate-950 border-emerald-500/30 text-emerald-400">
              {stats.activeClients}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PROSPECT')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusFilter === 'PROSPECT'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <UserPlus size={14} className="text-blue-400" />
          <span>Leads & Prospects</span>
          {stats?.prospectClients !== undefined && (
            <Badge variant="outline" className="text-[10px] bg-slate-950 border-blue-500/30 text-blue-400">
              {stats.prospectClients}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('INACTIVE')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusFilter === 'INACTIVE'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <span>Inactive / On-Hold</span>
          {stats?.inactiveClients !== undefined && (
            <Badge variant="outline" className="text-[10px] bg-slate-950 border-rose-500/30 text-rose-400">
              {stats.inactiveClients}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusFilter === 'ALL'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <span>All Clients</span>
          {stats?.totalClients !== undefined && (
            <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-700 text-slate-400">
              {stats.totalClients}
            </Badge>
          )}
        </button>
      </div>

      {/* Filter & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client, company, phone, email, GSTIN, city..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Account Manager Filter */}
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Account Managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Corporate Table View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-xs">Loading client directory...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-400 text-xs">
          No client profiles found matching your filter criteria.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c) => {
            const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
            const whatsappUrl = cleanPhone.length >= 10
              ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hello%20${encodeURIComponent(c.name || '')},%20from%20Media%20Infotech`
              : null;

            return (
              <div
                key={c.id}
                onClick={() => handleOpen360(c.id)}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:scale-105 transition flex-shrink-0">
                      {c.name?.charAt(0)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={c.status === 'ACTIVE' ? 'success' : c.status === 'PROSPECT' ? 'secondary' : 'destructive'}
                        className="text-[9px]"
                      >
                        {c.status}
                      </Badge>
                      {c.gstNumber && (
                        <Badge variant="outline" className="text-[9px] bg-slate-950 border-slate-700 text-slate-400 font-mono">
                          GST
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition">
                      {c.name}
                    </h3>
                    {c.companyName ? (
                      <p className="text-xs text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                        <Building size={12} className="text-blue-400 flex-shrink-0" />
                        <span className="truncate">{c.companyName}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-0.5">Individual Account</p>
                    )}
                    {c.city && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.city}{c.state ? `, ${c.state}` : ''}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center text-slate-400 gap-1.5">
                      <Phone size={13} className="text-slate-500 flex-shrink-0" />
                      <span className="font-mono">{c.phone}</span>
                    </div>
                    {c.email && (
                      <div className="flex items-center text-slate-400 gap-1.5 truncate">
                        <Mail size={13} className="text-slate-500 flex-shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                      {c._count?.services || 0} Service{c._count?.services === 1 ? '' : 's'}
                    </span>
                    {c.accountManager && (
                      <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 truncate max-w-[120px]">
                        AM: {c.accountManager.firstName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                        title="WhatsApp Chat"
                      >
                        <MessageCircle size={13} />
                      </a>
                    )}
                    <span className="text-xs text-blue-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                      <span>360°</span>
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CORPORATE TABLE VIEW */
        <DataTable
          headers={['Client & Company', 'Contact Details', 'GSTIN & Location', 'Account Manager', 'Active Services', 'Status', 'Actions']}
        >
          {clients.map((c) => {
            const cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
            const whatsappUrl = cleanPhone.length >= 10
              ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hello%20${encodeURIComponent(c.name || '')},%20from%20Media%20Infotech`
              : null;

            return (
              <tr
                key={c.id}
                onClick={() => handleOpen360(c.id)}
                className="hover:bg-slate-800/40 transition cursor-pointer"
              >
                {/* Client & Company */}
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                      {c.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.companyName || 'Individual'}</p>
                    </div>
                  </div>
                </td>

                {/* Contact Details */}
                <td className="p-4 text-xs">
                  <p className="text-white font-mono">{c.phone}</p>
                  <p className="text-slate-400 text-[11px] truncate max-w-xs">{c.email || 'N/A'}</p>
                </td>

                {/* GSTIN & Location */}
                <td className="p-4 text-xs font-mono">
                  <p className="text-slate-300">{c.gstNumber || 'Unregistered'}</p>
                  <p className="text-[10px] text-slate-500 font-sans">{c.city || 'N/A'}</p>
                </td>

                {/* Account Manager */}
                <td className="p-4 text-xs text-slate-300">
                  {c.accountManager ? (
                    <span className="text-indigo-400 font-medium">
                      {c.accountManager.firstName} {c.accountManager.lastName}
                    </span>
                  ) : (
                    <span className="text-slate-500">Unassigned</span>
                  )}
                </td>

                {/* Active Services */}
                <td className="p-4 text-xs">
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                    {c._count?.services || 0} Contract{c._count?.services === 1 ? '' : 's'}
                  </Badge>
                </td>

                {/* Status */}
                <td className="p-4">
                  <StatusBadge
                    status={c.status === 'ACTIVE' ? 'ACTIVE' : c.status === 'PROSPECT' ? 'PENDING' : 'INACTIVE'}
                    label={c.status}
                  />
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen360(c.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition border border-blue-500/30"
                    >
                      360° View
                    </button>

                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition border border-emerald-500/20"
                        title="WhatsApp Chat"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}

                    <button
                      onClick={(e) => handleOpenEdit(c, e)}
                      className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                      title="Edit Client Profile"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      {/* Client 360° Dossier Drawer */}
      <ClientProfileDrawer
        clientId={selectedClientId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={() => {
          fetchClients();
          fetchStats();
        }}
        managers={managers}
      />

      {/* Create Client Modal */}
      <ClientModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchClients();
          fetchStats();
        }}
        managers={managers}
      />

      {/* Edit Client Modal */}
      {editingClient && (
        <ClientModal
          isOpen={Boolean(editingClient)}
          onClose={() => setEditingClient(null)}
          onSuccess={() => {
            fetchClients();
            fetchStats();
          }}
          client={editingClient}
          managers={managers}
        />
      )}
    </div>
  );
}
