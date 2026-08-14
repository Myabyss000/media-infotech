'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  CheckCircle2,
  Package,
  Barcode,
  Clock,
  MessageSquare,
  Send,
  Trash2,
  Building2,
  LayoutGrid,
  List as ListIcon,
  Check,
  Camera,
  Download,
  Maximize2,
  FileImage,
  X,
  User,
  RotateCcw,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Loader2,
  Lock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { FormField, inputClassName, textareaClassName } from '@/components/ui/FormField';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function TicketsPage() {
  const { user, hasPermission, hasRole } = useAuth();
  const canManageTickets = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('tickets', 'create');
  const isManagerOrAdmin = hasRole('ADMIN', 'MANAGER', 'HR');
  const isAdmin = hasRole('ADMIN') || user?.role === 'ADMIN';

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Default to List view (Option 1)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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
  const [usersList, setUsersList] = useState<any[]>([]);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [filterTechnician, setFilterTechnician] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL_TIME');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [ticketToResolve, setTicketToResolve] = useState<any | null>(null);
  const [activeTicketDrawer, setActiveTicketDrawer] = useState<any | null>(null);

  // Form State for Ticket Creation
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedGroupId: '',
    assignedUserId: '',
    clientId: '',
    vehicleId: '',
    inventoryItemIds: [] as string[],
  });

  // Form State for Ticket Resolution with Proof Photo & GPS Log
  const [resolveForm, setResolveForm] = useState({
    resolutionNote: '',
    inventoryItemIds: [] as string[],
  });
  const [resolvePhotoFile, setResolvePhotoFile] = useState<File | null>(null);
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null);
  const resolvePhotoInputRef = useRef<HTMLInputElement>(null);

  // Geolocation Audit State for Resolution (captured in background)
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState(false);

  // Comment & Discussion Photo Upload State
  const [commentText, setCommentText] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [previewModalPhoto, setPreviewModalPhoto] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, filterGroup, filterTechnician, timeRange, startDate, endDate, search]);

  const fetchAuxiliaryData = async () => {
    try {
      const [gRes, cRes, vRes, iRes, uRes] = await Promise.all([
        api.get('/api/groups').catch(() => ({ data: [] })),
        api.get('/api/clients?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/api/vehicles').catch(() => ({ data: [] })),
        api.get('/api/inventory?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/api/users?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      setGroups(gRes.data || []);
      setClients(cRes.data?.data || cRes.data || []);
      setVehicles(vRes.data || []);
      setInventoryList(iRes.data?.data || iRes.data || []);
      setUsersList(uRes.data?.data || uRes.data || []);
    } catch (e) {
      console.error('Failed to load auxiliary options', e);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = `/api/tickets?search=${search}`;
      if (filterStatus !== 'ALL') query += `&status=${filterStatus}`;
      if (filterPriority !== 'ALL') query += `&priority=${filterPriority}`;
      if (filterGroup !== 'ALL') query += `&assignedGroupId=${filterGroup}`;
      if (filterTechnician !== 'ALL') query += `&assignedUserId=${filterTechnician}`;

      if (timeRange !== 'ALL_TIME' && timeRange !== 'CUSTOM') {
        query += `&timeRange=${timeRange}`;
      } else if (timeRange === 'CUSTOM' && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await api.get(query);
      const ticketData = res.data.data || [];
      setTickets(ticketData);
      if (res.data.statusCounts) {
        setStatusCounts(res.data.statusCounts);
      }

      if (activeTicketDrawer) {
        const updated = ticketData.find((t: any) => t.id === activeTicketDrawer.id);
        if (updated) setActiveTicketDrawer(updated);
      }
    } catch (e) {
      console.error('Fetch tickets error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Acquire technician GPS coordinates silently for admin/manager audit
  const captureResolutionGps = () => {
    if (!navigator.geolocation) {
      setFetchingGps(false);
      return;
    }

    setFetchingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              address = data.display_name;
            }
          }
        } catch {
          // fallback
        }

        setGpsLocation({ lat, lng, accuracy, address });
        setGpsCaptured(true);
        setFetchingGps(false);
      },
      () => {
        setFetchingGps(false);
        setGpsCaptured(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleOpenResolveModal = (t: any) => {
    setTicketToResolve(t);
    setResolveForm({
      resolutionNote: t.resolutionNote || '',
      inventoryItemIds: [],
    });
    handleClearResolvePhoto();
    setGpsLocation(null);
    setGpsCaptured(false);
    setResolveModalOpen(true);
    captureResolutionGps();
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
        dueDate: '',
        assignedGroupId: '',
        assignedUserId: '',
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

  // Status updater with role-based restrictions
  const handleUpdateStatus = async (
    id: string,
    status: string,
    resolutionNote?: string,
    proofPhotoFile?: File | null,
    locationData?: { lat: number; lng: number; accuracy: number; address?: string } | null,
    inventoryItemIds?: string[]
  ) => {
    try {
      if (proofPhotoFile || locationData) {
        const formData = new FormData();
        formData.append('status', status);
        if (resolutionNote) formData.append('resolutionNote', resolutionNote);
        if (proofPhotoFile) formData.append('proofPhoto', proofPhotoFile);
        if (locationData) {
          formData.append('resolveLat', locationData.lat.toString());
          formData.append('resolveLng', locationData.lng.toString());
          formData.append('resolveAccuracy', locationData.accuracy.toString());
          if (locationData.address) formData.append('resolveAddress', locationData.address);
        }
        if (inventoryItemIds && inventoryItemIds.length > 0) {
          formData.append('inventoryItemIds', JSON.stringify(inventoryItemIds));
        }

        await api.put(`/api/tickets/${id}/status`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(`/api/tickets/${id}/status`, {
          status,
          resolutionNote,
          inventoryItemIds,
        });
      }

      await fetchTickets();
      if (activeTicketDrawer && activeTicketDrawer.id === id) {
        const fresh = await api.get(`/api/tickets/${id}`);
        setActiveTicketDrawer(fresh.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update ticket status');
    }
  };

  const handleResolvePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Photo size exceeds 50MB limit.');
      return;
    }

    setResolvePhotoFile(file);
    if (file.type.startsWith('image/')) {
      setResolvePhotoPreview(URL.createObjectURL(file));
    } else {
      setResolvePhotoPreview(null);
    }
  };

  const handleClearResolvePhoto = () => {
    setResolvePhotoFile(null);
    if (resolvePhotoPreview) {
      URL.revokeObjectURL(resolvePhotoPreview);
      setResolvePhotoPreview(null);
    }
    if (resolvePhotoInputRef.current) {
      resolvePhotoInputRef.current.value = '';
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToResolve) return;
    if (!resolveForm.resolutionNote.trim()) {
      alert('Please enter resolution summary & notes.');
      return;
    }

    setResolving(true);
    try {
      await handleUpdateStatus(
        ticketToResolve.id,
        'RESOLVED',
        resolveForm.resolutionNote.trim(),
        resolvePhotoFile,
        gpsLocation,
        resolveForm.inventoryItemIds
      );
      setResolveModalOpen(false);
      setTicketToResolve(null);
      setResolveForm({ resolutionNote: '', inventoryItemIds: [] });
      handleClearResolvePhoto();
      setGpsLocation(null);
      setGpsCaptured(false);
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  };

  // Admin-only ticket deletion handler
  const handleDeleteTicket = async (ticketId: string) => {
    if (!isAdmin) {
      alert('Permission denied: Only System Admins can delete tickets.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this support ticket? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/tickets/${ticketId}`);
      if (activeTicketDrawer && activeTicketDrawer.id === ticketId) {
        setActiveTicketDrawer(null);
      }
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete ticket');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit.');
      return;
    }

    setSelectedPhotoFile(file);
    if (file.type.startsWith('image/')) {
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setPhotoPreviewUrl(null);
    }
  };

  const handleClearPhoto = () => {
    setSelectedPhotoFile(null);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketDrawer || (!commentText.trim() && !selectedPhotoFile)) return;
    setSubmittingComment(true);
    try {
      const formData = new FormData();
      if (commentText.trim()) {
        formData.append('content', commentText.trim());
      }
      if (selectedPhotoFile) {
        formData.append('photo', selectedPhotoFile);
      }

      await api.post(`/api/tickets/${activeTicketDrawer.id}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCommentText('');
      handleClearPhoto();

      const fresh = await api.get(`/api/tickets/${activeTicketDrawer.id}`);
      setActiveTicketDrawer(fresh.data);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeTicketDrawer || !confirm('Delete this comment?')) return;
    try {
      await api.delete(`/api/tickets/${activeTicketDrawer.id}/comments/${commentId}`);
      const fresh = await api.get(`/api/tickets/${activeTicketDrawer.id}`);
      setActiveTicketDrawer(fresh.data);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const toggleInventorySelection = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      inventoryItemIds: prev.inventoryItemIds.includes(itemId)
        ? prev.inventoryItemIds.filter((id) => id !== itemId)
        : [...prev.inventoryItemIds, itemId],
    }));
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { bg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', dot: 'bg-rose-500' };
      case 'HIGH':
        return { bg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', dot: 'bg-orange-500' };
      case 'MEDIUM':
        return { bg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', dot: 'bg-blue-500' };
      default:
        return { bg: 'bg-slate-800 text-slate-400 border border-slate-700', dot: 'bg-slate-500' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', label: 'Open' };
      case 'IN_PROGRESS':
        return { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: 'In Progress' };
      case 'RESOLVED':
        return { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Resolved' };
      case 'CLOSED':
        return { badge: 'bg-slate-800 text-slate-400 border border-slate-700', label: 'Closed' };
      default:
        return { badge: 'bg-slate-800 text-slate-400 border border-slate-700', label: status };
    }
  };

  const KANBAN_COLUMNS = [
    { key: 'OPEN', title: 'Open', color: 'text-amber-400', dot: 'bg-amber-400' },
    { key: 'IN_PROGRESS', title: 'In Progress', color: 'text-blue-400', dot: 'bg-blue-400' },
    { key: 'RESOLVED', title: 'Resolved', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    { key: 'CLOSED', title: 'Closed', color: 'text-slate-400', dot: 'bg-slate-500' },
  ];

  const totalTicketsCount =
    statusCounts.OPEN + statusCounts.IN_PROGRESS + statusCounts.RESOLVED + statusCounts.CLOSED;

  const STATUS_TABS = [
    { key: 'ALL', label: 'All Tickets', count: totalTicketsCount, activeStyle: 'bg-blue-600 text-white shadow-md' },
    { key: 'OPEN', label: 'Open', count: statusCounts.OPEN, dot: 'bg-amber-400', activeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
    { key: 'IN_PROGRESS', label: 'In Progress', count: statusCounts.IN_PROGRESS, dot: 'bg-blue-400', activeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
    { key: 'RESOLVED', label: 'Resolved', count: statusCounts.RESOLVED, dot: 'bg-emerald-400', activeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
    { key: 'CLOSED', label: 'Archived', count: statusCounts.CLOSED, dot: 'bg-slate-400', activeStyle: 'bg-slate-800 text-slate-200 border-slate-600' },
  ];

  const hasActiveFilters =
    filterStatus !== 'ALL' ||
    filterPriority !== 'ALL' ||
    filterGroup !== 'ALL' ||
    filterTechnician !== 'ALL' ||
    timeRange !== 'ALL_TIME' ||
    search.trim() !== '';

  const resetAllFilters = () => {
    setFilterStatus('ALL');
    setFilterPriority('ALL');
    setFilterGroup('ALL');
    setFilterTechnician('ALL');
    setTimeRange('ALL_TIME');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Support & Field Tickets</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track client issues, field dispatch, SLA deadlines, equipment, and verified resolutions.
          </p>
        </div>

        {canManageTickets && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20 shrink-0"
          >
            <Plus size={16} />
            <span>Raise Support Ticket</span>
          </button>
        )}
      </div>

      {/* Interactive Status Segmented Bar (Option 1: Linear / GitHub Style) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 border transition shrink-0 ${
                isActive
                  ? tab.activeStyle
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, clients, or issues..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-2xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListIcon size={13} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Board</span>
            </button>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none"
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
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white max-w-[140px] truncate focus:outline-none"
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
              title="Reset Filters"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        /* ===================== MODERN HIGH-DENSITY LIST / ROW VIEW ===================== */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800">
              Loading support tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
              <TicketIcon size={32} className="mx-auto text-slate-600 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-400">No tickets match your filter criteria.</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting filters or raising a new support ticket.</p>
            </div>
          ) : (
            tickets.map((t) => {
              const priority = getPriorityStyle(t.priority);
              const status = getStatusStyle(t.status);
              const isOverdue =
                t.dueDate &&
                new Date(t.dueDate) < new Date() &&
                t.status !== 'RESOLVED' &&
                t.status !== 'CLOSED';

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTicketDrawer(t)}
                  className="group p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md"
                >
                  {/* Left Column: ID, Status, Title, Description */}
                  <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                    <div className="pt-0.5 shrink-0">
                      <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 block text-center">
                        {t.ticketNumber}
                      </span>
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${status.badge}`}>
                          {status.label}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${priority.bg}`}>
                          {t.priority}
                        </span>
                        <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition leading-snug">
                          {t.title}
                        </h3>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">{t.description}</p>
                      )}

                      {/* Metadata Chips Row */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {t.client && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-950/30 border border-purple-500/20 px-2.5 py-0.5 rounded-xl">
                            <Building2 size={12} className="text-purple-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{t.client.companyName || t.client.name}</span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-950 px-2.5 py-0.5 rounded-xl border border-slate-800">
                          <User size={12} className="text-blue-400 shrink-0" />
                          <span>
                            {t.assignedUser
                              ? `${t.assignedUser.firstName} ${t.assignedUser.lastName}`
                              : t.assignedGroup?.name || 'Unassigned'}
                          </span>
                        </span>

                        {t.dueDate && (
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-xl ${
                              isOverdue
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                                : 'bg-slate-950 text-slate-400 border border-slate-800'
                            }`}
                          >
                            <Clock size={12} className="shrink-0" />
                            <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}

                        {t.proofPhoto && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-0.5 rounded-xl">
                            <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                            <span>Verified Proof</span>
                          </span>
                        )}

                        {t.inventoryItems && t.inventoryItems.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/30 border border-blue-500/20 px-2 py-0.5 rounded-xl">
                            <Package size={12} className="text-blue-400 shrink-0" />
                            <span>{t.inventoryItems.length} Equipment</span>
                          </span>
                        )}

                        {(t._count?.comments > 0 || t.comments?.length > 0) && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 pl-1">
                            <MessageSquare size={12} />
                            <span>{t._count?.comments || t.comments?.length || 0}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Workflow Action Button & Admin Controls */}
                  <div
                    className="flex items-center space-x-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 w-full lg:w-auto justify-between lg:justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Workflow Progress Button */}
                    {t.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>Start Work</span>
                        <ArrowRight size={13} />
                      </button>
                    )}

                    {t.status === 'IN_PROGRESS' && (
                      <div className="flex items-center space-x-1.5">
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'OPEN')}
                            className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                            title="Revert to Open (Admin/Manager Only)"
                          >
                            ← Open
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenResolveModal(t)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <span>Resolve (Proof)</span>
                          <CheckCircle2 size={13} />
                        </button>
                      </div>
                    )}

                    {t.status === 'RESOLVED' && (
                      <div className="flex items-center space-x-2">
                        {isManagerOrAdmin ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                              className="px-2.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition flex items-center space-x-1"
                              title="Reopen to In Progress"
                            >
                              <RotateCcw size={12} />
                              <span>Reopen</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'CLOSED')}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                            >
                              Close Ticket →
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <ShieldCheck size={14} />
                            <span>Submitted for Manager Close</span>
                          </span>
                        )}
                      </div>
                    )}

                    {t.status === 'CLOSED' && (
                      isManagerOrAdmin ? (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                          className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <RotateCcw size={12} />
                          <span>Reopen</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono py-1">Archived</span>
                      )
                    )}

                    {/* Admin Delete Trash Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(t.id)}
                        className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 transition"
                        title="Delete Ticket (Admin Only)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ===================== KANBAN BOARD VIEW ===================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                className="rounded-3xl bg-slate-900/60 border border-slate-800 p-4 space-y-3 min-h-[480px] flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className={`text-xs font-extrabold uppercase tracking-wider ${col.color}`}>{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-0.5">
                  {colTickets.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                      No {col.title.toLowerCase()} tickets
                    </div>
                  ) : (
                    colTickets.map((t) => {
                      const priority = getPriorityStyle(t.priority);

                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTicketDrawer(t)}
                          className="group p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition cursor-pointer space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-400">
                              {t.ticketNumber}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${priority.bg}`}>
                              {t.priority}
                            </span>
                          </div>

                          <h4 className="font-bold text-white text-xs leading-snug group-hover:text-blue-400 transition line-clamp-2">
                            {t.title}
                          </h4>

                          {t.client && (
                            <div className="flex items-center space-x-1.5 text-[10px] text-purple-300 bg-purple-950/30 px-2 py-1 rounded-xl border border-purple-500/20 truncate">
                              <Building2 size={11} className="shrink-0 text-purple-400" />
                              <span className="truncate">{t.client.companyName || t.client.name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                            <span className="truncate text-slate-400 text-[10px]">
                              {t.assignedUser ? `${t.assignedUser.firstName}` : 'Unassigned'}
                            </span>
                            <span className="text-blue-400 font-semibold text-[10px]">View Hub →</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== TICKET HUB & RESOLUTION AUDIT MODAL ===================== */}
      <Modal
        open={!!activeTicketDrawer}
        onClose={() => setActiveTicketDrawer(null)}
        title={`Ticket Hub • ${activeTicketDrawer?.ticketNumber || ''}`}
        icon={<TicketIcon size={20} className="text-blue-400" />}
        maxWidth="max-w-3xl"
      >
        {activeTicketDrawer && (
          <div className="space-y-4 py-1">
            {/* Overview Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">{activeTicketDrawer.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${getPriorityStyle(activeTicketDrawer.priority).bg}`}>
                    {activeTicketDrawer.priority}
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${getStatusStyle(activeTicketDrawer.status).badge}`}>
                    {getStatusStyle(activeTicketDrawer.status).label}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{activeTicketDrawer.description}</p>
            </div>

            {/* Quick Status Control Bar (Strict RBAC) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <p className="text-[10px] text-slate-500 uppercase font-bold">
                {isManagerOrAdmin ? 'Manager Status Progression & Reopen Controls' : 'Ticket Workflow Progression'}
              </p>

              {isManagerOrAdmin ? (
                /* Full Controls for Admins and Product Managers */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'OPEN')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                      activeTicketDrawer.status === 'OPEN'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    🟡 Move to Open
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'IN_PROGRESS')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                      activeTicketDrawer.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    🔵 In Progress
                  </button>

                  <button
                    onClick={() => handleOpenResolveModal(activeTicketDrawer)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                      activeTicketDrawer.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                    }`}
                  >
                    🟢 Resolve / Proof
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'CLOSED')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                      activeTicketDrawer.status === 'CLOSED'
                        ? 'bg-slate-700/60 border-slate-500 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    ⚪ Close Ticket
                  </button>
                </div>
              ) : (
                /* Forward-only Workflow for Employees */
                <div className="flex items-center space-x-2">
                  {activeTicketDrawer.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus(activeTicketDrawer.id, 'IN_PROGRESS')}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <span>Start Work → Move to In Progress</span>
                    </button>
                  )}

                  {activeTicketDrawer.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleOpenResolveModal(activeTicketDrawer)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <span>Submit Resolution & Proof Photo →</span>
                    </button>
                  )}

                  {activeTicketDrawer.status === 'RESOLVED' && (
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center space-x-1.5">
                      <ShieldCheck size={14} />
                      <span>Resolution submitted. Pending Product Manager verification.</span>
                    </div>
                  )}

                  {activeTicketDrawer.status === 'CLOSED' && (
                    <div className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs text-center">
                      This ticket has been officially closed and archived.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Client Account</p>
                <p className="font-bold text-white truncate">
                  {activeTicketDrawer.client?.name || activeTicketDrawer.client?.companyName || 'No Client'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Assigned Personnel</p>
                <p className="font-bold text-white truncate">
                  {activeTicketDrawer.assignedUser
                    ? `${activeTicketDrawer.assignedUser.firstName} ${activeTicketDrawer.assignedUser.lastName}`
                    : activeTicketDrawer.assignedGroup?.name || 'Unassigned'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Target SLA Date</p>
                <p className="font-bold text-white">
                  {activeTicketDrawer.dueDate ? new Date(activeTicketDrawer.dueDate).toLocaleDateString() : 'No Deadline'}
                </p>
              </div>
            </div>

            {/* ================= RESOLUTION AUDIT (GPS VISIBLE TO ADMIN/MANAGERS ONLY) ================= */}
            {(activeTicketDrawer.status === 'RESOLVED' || activeTicketDrawer.status === 'CLOSED' || activeTicketDrawer.proofPhoto) && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="font-bold text-emerald-400 text-sm">Resolution Verification & Audit</span>
                  </div>
                  {activeTicketDrawer.resolvedAt && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Resolved {formatDateTime(activeTicketDrawer.resolvedAt)}
                    </span>
                  )}
                </div>

                <div className={`grid gap-3 ${isManagerOrAdmin && activeTicketDrawer.resolveLat ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Resolver Info */}
                  <div className="space-y-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Resolved By Technician</p>
                    <p className="font-bold text-white flex items-center space-x-1.5">
                      <User size={13} className="text-emerald-400" />
                      <span>
                        {activeTicketDrawer.resolvedBy
                          ? `${activeTicketDrawer.resolvedBy.firstName} ${activeTicketDrawer.resolvedBy.lastName}`
                          : activeTicketDrawer.assignedUser
                          ? `${activeTicketDrawer.assignedUser.firstName} ${activeTicketDrawer.assignedUser.lastName}`
                          : 'Technician on Record'}
                      </span>
                    </p>
                    {activeTicketDrawer.resolutionNote && (
                      <p className="text-slate-300 text-xs mt-1 pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500 font-semibold">Solution Note:</span> {activeTicketDrawer.resolutionNote}
                      </p>
                    )}
                  </div>

                  {/* Geolocation Audit Log (Restricted to Admin/Manager Only) */}
                  {isManagerOrAdmin && activeTicketDrawer.resolveLat && activeTicketDrawer.resolveLng && (
                    <div className="space-y-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-between">
                        <span>Technician Resolve Location</span>
                        {activeTicketDrawer.resolveAccuracy && (
                          <span className="text-[9px] text-emerald-400 font-mono">
                            ±{activeTicketDrawer.resolveAccuracy}m Accuracy
                          </span>
                        )}
                      </p>

                      <div className="space-y-1.5 pt-0.5">
                        <p className="text-slate-200 text-xs flex items-start space-x-1.5">
                          <MapPin size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            {activeTicketDrawer.resolveAddress ||
                              `${activeTicketDrawer.resolveLat.toFixed(5)}° N, ${activeTicketDrawer.resolveLng.toFixed(5)}° E`}
                          </span>
                        </p>

                        <div className="flex items-center space-x-2 pt-1">
                          <a
                            href={`https://www.google.com/maps?q=${activeTicketDrawer.resolveLat},${activeTicketDrawer.resolveLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[10px] font-semibold flex items-center space-x-1 transition border border-emerald-500/30"
                          >
                            <ExternalLink size={10} />
                            <span>Verify on Google Maps</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resolution Proof Photo Thumbnail */}
                {activeTicketDrawer.proofPhoto && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Attached Site Proof of Work</p>
                    <div
                      onClick={() =>
                        setPreviewModalPhoto(
                          activeTicketDrawer.proofPhoto.startsWith('http')
                            ? activeTicketDrawer.proofPhoto
                            : `${API_BASE_URL}${activeTicketDrawer.proofPhoto}`
                        )
                      }
                      className="relative group rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 max-w-sm cursor-pointer hover:border-emerald-400 transition shadow-lg"
                    >
                      <img
                        src={
                          activeTicketDrawer.proofPhoto.startsWith('http')
                            ? activeTicketDrawer.proofPhoto
                            : `${API_BASE_URL}${activeTicketDrawer.proofPhoto}`
                        }
                        alt="Resolution proof photo"
                        className="w-full max-h-48 object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="p-2 bg-slate-950/90 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium flex items-center gap-1">
                          <FileImage size={13} className="text-emerald-400" />
                          <span>Resolution Proof Photo</span>
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5 text-[10px]">
                          <Maximize2 size={10} /> Inspect High-Res
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attached Hardware (if any) */}
            {activeTicketDrawer.inventoryItems && activeTicketDrawer.inventoryItems.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <Package size={11} className="text-blue-400" />
                  <span>Equipment Attached ({activeTicketDrawer.inventoryItems.length})</span>
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {activeTicketDrawer.inventoryItems.map((inv: any) => (
                    <span
                      key={inv.id}
                      className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 font-mono text-[10px] border border-blue-500/20 inline-flex items-center space-x-1"
                    >
                      <Barcode size={10} />
                      <span>{inv.inventoryItem?.deviceName}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discussion & Photos Feed */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-blue-400" />
                <span>Discussion & Site Photos ({activeTicketDrawer.comments?.length || 0})</span>
              </h4>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {activeTicketDrawer.comments && activeTicketDrawer.comments.length > 0 ? (
                  activeTicketDrawer.comments.map((c: any) => {
                    const photoFullUrl = c.photo ? (c.photo.startsWith('http') ? c.photo : `${API_BASE_URL}${c.photo}`) : null;

                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {c.author?.firstName?.charAt(0) || 'U'}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">
                                {c.author?.firstName} {c.author?.lastName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {formatDateTime(c.createdAt)}
                              </span>
                            </div>
                            {c.content && <p className="text-slate-300 leading-relaxed break-words">{c.content}</p>}

                            {photoFullUrl && (
                              <div className="pt-1">
                                <div
                                  onClick={() => setPreviewModalPhoto(photoFullUrl)}
                                  className="relative group rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 max-w-xs cursor-pointer hover:border-blue-500/50 transition shadow-md"
                                >
                                  <img
                                    src={photoFullUrl}
                                    alt="Site photo"
                                    className="w-full max-h-40 object-cover group-hover:scale-105 transition duration-200"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="p-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px]">
                                    <span className="text-slate-300 font-medium flex items-center gap-1">
                                      <FileImage size={11} className="text-blue-400" />
                                      <span>Attached Photo</span>
                                    </span>
                                    <span className="text-blue-400 font-semibold flex items-center gap-0.5">
                                      <Maximize2 size={9} /> High-Res
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {(c.authorId === user?.id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-500 hover:text-red-400 transition p-1 shrink-0"
                            title="Delete comment"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No comments or photos yet.</p>
                )}
              </div>

              {selectedPhotoFile && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-blue-500/30 gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Selected preview"
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center shrink-0">
                        <FileImage size={16} />
                      </div>
                    )}
                    <div className="truncate text-xs">
                      <p className="font-semibold text-white truncate">{selectedPhotoFile.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(selectedPhotoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition shrink-0"
                    title="Remove Photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*,.heic,.heif,.dng,.raw,.cr2,.nef,.arw,.tiff,.tif,.bmp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
                    selectedPhotoFile
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Attach High-Resolution / RAW Site Photo"
                >
                  <Camera size={16} />
                </button>

                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={selectedPhotoFile ? 'Add optional note for attached photo...' : 'Post progress update or question...'}
                  className={`flex-1 ${inputClassName}`}
                />

                <button
                  type="submit"
                  disabled={submittingComment || (!commentText.trim() && !selectedPhotoFile)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Send size={12} />
                  <span>{submittingComment ? 'Sending...' : 'Post'}</span>
                </button>
              </form>
            </div>

            {/* Admin-Only Ticket Delete Option */}
            {isAdmin && (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck size={12} className="text-rose-400" />
                  <span>Admin Zone</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTicket(activeTicketDrawer.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition flex items-center space-x-1.5"
                >
                  <Trash2 size={13} />
                  <span>Permanently Delete Ticket</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ===================== CREATE TICKET MODAL ===================== */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Raise Support Ticket"
        icon={<TicketIcon size={20} className="text-blue-400" />}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <FormField label="Ticket Title">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. CCTV Camera Offline at Sector 4"
              className={inputClassName}
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe the issue, reported symptoms, or customer request..."
              className={textareaClassName}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Priority Level">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className={inputClassName}
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent / Critical</option>
              </select>
            </FormField>

            <FormField label="Target SLA Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Assign Field Group">
              <select
                value={form.assignedGroupId}
                onChange={(e) => setForm({ ...form, assignedGroupId: e.target.value })}
                className={inputClassName}
              >
                <option value="">Select Group (Optional)...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Assign Specific Technician">
              <select
                value={form.assignedUserId}
                onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
                className={inputClassName}
              >
                <option value="">Select Technician (Optional)...</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label={`Assign Hardware / Equipment (${form.inventoryItemIds.length} Selected)`}>
            <div className="space-y-1 max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-2xl border border-slate-800">
              {inventoryList.map((inv) => {
                const isSelected = form.inventoryItemIds.includes(inv.id);
                return (
                  <div
                    key={inv.id}
                    onClick={() => toggleInventorySelection(inv.id)}
                    className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                      isSelected ? 'bg-blue-600/20 border border-blue-500/40' : 'bg-slate-900/60 border border-slate-800'
                    }`}
                  >
                    <div className="text-white">{inv.deviceName} ({inv.barcode})</div>
                    {isSelected && <Check size={13} className="text-blue-400" />}
                  </div>
                );
              })}
            </div>
          </FormField>

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel={submitting ? 'Raising...' : 'Create Ticket'}
            submitting={submitting}
          />
        </form>
      </Modal>

      {/* ===================== RESOLVE TICKET MODAL ===================== */}
      <Modal
        open={resolveModalOpen}
        onClose={() => {
          setResolveModalOpen(false);
          handleClearResolvePhoto();
        }}
        title="Resolve Ticket • Verified Proof of Work"
        icon={<CheckCircle2 size={20} className="text-emerald-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          <FormField label="Resolution Summary & Solution Notes">
            <textarea
              value={resolveForm.resolutionNote}
              onChange={(e) => setResolveForm({ ...resolveForm, resolutionNote: e.target.value })}
              rows={3}
              placeholder="Explain how the issue was fixed, components replaced, or adjustments made on site..."
              className={textareaClassName}
              required
            />
          </FormField>

          {/* Proof Photo Attachment */}
          <FormField label="Resolution Proof Photo (Site Verification)">
            <input
              ref={resolvePhotoInputRef}
              type="file"
              accept="image/*,.heic,.heif,.dng,.raw,.cr2,.nef,.arw,.tiff,.tif,.bmp"
              onChange={handleResolvePhotoSelect}
              className="hidden"
            />

            {resolvePhotoFile ? (
              <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  {resolvePhotoPreview ? (
                    <img
                      src={resolvePhotoPreview}
                      alt="Proof preview"
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileImage size={20} />
                    </div>
                  )}
                  <div className="truncate text-xs">
                    <p className="font-bold text-white truncate">{resolvePhotoFile.name}</p>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      {(resolvePhotoFile.size / (1024 * 1024)).toFixed(2)} MB • Verified Proof Attached
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearResolvePhoto}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition shrink-0"
                  title="Remove Photo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => resolvePhotoInputRef.current?.click()}
                className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 hover:border-emerald-500/50 cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 text-center group"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Camera size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">
                    Click to attach Proof Photo
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Supports high-resolution camera captures and RAW formats (up to 50MB)
                  </p>
                </div>
              </div>
            )}
          </FormField>

          {/* On-Site Verification Indicator */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <div>
                <p className="font-bold text-white text-[11px]">On-Site Audit Verification</p>
                <p className="text-[10px] text-slate-400">
                  {fetchingGps
                    ? 'Acquiring geolocation tag...'
                    : gpsCaptured
                    ? 'GPS location captured for manager verification'
                    : 'Location verification active'}
                </p>
              </div>
            </div>
            {fetchingGps && <Loader2 size={13} className="text-blue-400 animate-spin" />}
          </div>

          <ModalFooter
            onClose={() => {
              setResolveModalOpen(false);
              handleClearResolvePhoto();
            }}
            submitLabel={resolving ? 'Verifying & Resolving...' : 'Confirm Resolution'}
            submitting={resolving}
            variant="emerald"
          />
        </form>
      </Modal>

      {/* ===================== HIGH-RESOLUTION LIGHTBOX MODAL ===================== */}
      {previewModalPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setPreviewModalPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-1 text-white">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <FileImage size={15} className="text-blue-400" />
                <span>Site Photo Inspection</span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewModalPhoto}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1 transition shadow-md"
                >
                  <Download size={12} />
                  <span>Download Original</span>
                </a>
                <button
                  onClick={() => setPreviewModalPhoto(null)}
                  className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center max-h-[75vh] w-full shadow-2xl">
              <img
                src={previewModalPhoto}
                alt="Ticket attachment preview"
                className="max-h-[72vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
