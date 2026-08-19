'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  FolderGit2,
  Plus,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Kanban,
  MapPin,
  UsersRound,
  Truck,
  Video,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  SlidersHorizontal,
  Building2,
  Layers,
  Calendar,
  IndianRupee,
  Edit3,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { ProjectStatsCards } from '@/components/projects/ProjectStatsCards';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { Project360Drawer } from '@/components/projects/Project360Drawer';
import { AddProjectSiteModal } from '@/components/projects/AddProjectSiteModal';

export default function ProjectsPage() {
  const { hasPermission, hasRole, user } = useAuth();
  const isPrivileged = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('projects', 'create');

  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & View Mode
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'kanban'>('grid');

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const [deleteConfirmProject, setDeleteConfirmProject] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addSiteModalOpen, setAddSiteModalOpen] = useState(false);
  const [siteTargetProjectId, setSiteTargetProjectId] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/api/projects/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load project stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (clientFilter !== 'ALL') params.clientId = clientFilter;

      const res = await api.get('/api/projects', { params });
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportingData = async () => {
    try {
      const [clientsRes, groupsRes, vehiclesRes, usersRes] = await Promise.allSettled([
        api.get('/api/clients'),
        api.get('/api/groups'),
        api.get('/api/vehicles'),
        api.get('/api/users?limit=100'),
      ]);

      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data.data || []);
      if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value.data.data || []);
      if (vehiclesRes.status === 'fulfilled') setVehicles(vehiclesRes.value.data || []);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data || []);
    } catch (err) {
      console.error('Failed to load supporting data:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSupportingData();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter, clientFilter]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchProjects()]);
    setRefreshing(false);
  };

  const handleOpen360 = (id: string) => {
    setSelectedProjectId(id);
    setDrawerOpen(true);
  };

  const handleQuickChangeStage = async (e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>, projectId: string, newStatus: string) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
      );

      await api.put(`/api/projects/${projectId}`, { status: newStatus });
      fetchStats();
      fetchProjects();
    } catch (err) {
      console.error('Quick stage change error:', err);
    }
  };

  const handleQuickAssignGroup = async (e: React.ChangeEvent<HTMLSelectElement>, projectId: string, groupId: string) => {
    e.stopPropagation();
    try {
      const selectedGroup = groups.find((g) => g.id === groupId);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, groupId, group: selectedGroup || null } : p
        )
      );

      await api.put(`/api/projects/${projectId}`, { groupId: groupId || null });
      fetchProjects();
    } catch (err) {
      console.error('Quick group assign error:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmProject?.id) return;
    try {
      setDeleting(true);
      await api.delete(`/api/projects/${deleteConfirmProject.id}`);
      setDeleteConfirmProject(null);
      fetchStats();
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return null;
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Lifecycle Stages Progression Sequence
  const STAGES_SEQUENCE = [
    'PLANNING',
    'MATERIAL_PROCUREMENT',
    'IN_PROGRESS',
    'TESTING_INSPECTION',
    'COMMISSIONED',
  ];

  const kanbanColumns = [
    { id: 'PLANNING', label: 'Planning & Survey', color: 'border-slate-700 bg-slate-900/40' },
    { id: 'MATERIAL_PROCUREMENT', label: 'Procurement', color: 'border-amber-500/20 bg-amber-950/10' },
    { id: 'IN_PROGRESS', label: 'Field Execution', color: 'border-indigo-500/20 bg-indigo-950/10' },
    { id: 'TESTING_INSPECTION', label: 'Testing & JIR', color: 'border-blue-500/20 bg-blue-950/10' },
    { id: 'COMMISSIONED', label: 'Commissioned & AMC', color: 'border-emerald-500/20 bg-emerald-950/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Projects & Government Tenders</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Live Operations
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time execution command center for CCTV surveillance, optical fiber networks, and government contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold gap-1.5"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
            <span>Refresh</span>
          </Button>

          {isPrivileged && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Plus size={14} />
              <span>New Tender Project</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <ProjectStatsCards stats={stats} loading={statsLoading} />

      {/* Lifecycle Status Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'ALL', label: 'All Projects', count: stats?.totalProjects },
          { id: 'IN_PROGRESS', label: 'In Execution', count: stats?.inProgress },
          { id: 'PLANNING', label: 'Survey & Planning', count: stats?.planning },
          { id: 'TESTING_INSPECTION', label: 'Testing & JIR', count: stats?.inspection },
          { id: 'COMMISSIONED', label: 'Commissioned & AMC', count: stats?.commissioned },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              statusFilter === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-950 text-indigo-400 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 max-w-3xl flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tender code, work order, authority, territory..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Client / Dept Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="ALL">All Departments & Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Card Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Corporate Table View"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Milestone Stage Kanban"
          >
            <Kanban size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <FolderGit2 size={36} className="mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">No projects found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'No projects matching your search filter.'
              : 'Create your first government CCTV tender project to start tracking milestones and installation sites.'}
          </p>
          {isPrivileged && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold mt-2"
            >
              <Plus size={14} />
              <span>Create Tender Project</span>
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const isCommissioned = p.status === 'COMMISSIONED';

            return (
              <div
                key={p.id}
                onClick={() => handleOpen360(p.id)}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between relative"
              >
                <div>
                  {/* Top Badges & Card Action Bar (Stage, Edit, Delete) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {p.code}
                      </span>
                      {p.tenderNo && (
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[110px]" title={p.tenderNo}>
                          {p.tenderNo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPrivileged ? (
                        <>
                          <select
                            value={p.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleQuickChangeStage(e, p.id, e.target.value)}
                            className="text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-indigo-500/40 text-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer hover:border-indigo-400"
                          >
                            <option value="PLANNING">Planning & Survey</option>
                            <option value="MATERIAL_PROCUREMENT">Procurement</option>
                            <option value="IN_PROGRESS">Field Execution</option>
                            <option value="TESTING_INSPECTION">Testing & JIR</option>
                            <option value="COMMISSIONED">Commissioned & AMC</option>
                          </select>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(p);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 border border-slate-800 transition"
                            title="Edit Project"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmProject(p);
                            }}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                            title="Delete Project"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <Badge
                          variant={
                            isCommissioned
                              ? 'success'
                              : p.status === 'IN_PROGRESS'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-[9px] font-bold shrink-0"
                        >
                          {p.status?.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Project Title */}
                  <div className="mt-3">
                    <h3 className="text-base font-extrabold text-white group-hover:text-indigo-400 transition line-clamp-2">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                      {p.client ? (
                        <span>{p.client.companyName || p.client.name}</span>
                      ) : p.tenderAuthority ? (
                        <span>{p.tenderAuthority}</span>
                      ) : (
                        <span>Public Tender Contract</span>
                      )}
                    </p>
                  </div>

                  {/* Camera and Site Counter with Quick Add Site Button */}
                  <div className="mt-3.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                        <Video size={11} className="text-emerald-400" />
                        <span>CCTV Mounted</span>
                      </span>
                      <span className="text-sm font-black font-mono text-white mt-0.5 block">
                        {p.totalCamerasInstalled} / {p.totalCamerasPlanned}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                        <MapPin size={11} className="text-amber-400" />
                        <span>Sites & Poles</span>
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-sm font-black font-mono text-white">
                          {p._count?.sites || 0} Junctions
                        </span>
                        {isPrivileged && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSiteTargetProjectId(p.id);
                              setAddSiteModalOpen(true);
                            }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20"
                            title="Add Junction Site"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar with Milestone Summary */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">Commissioning Progress</span>
                      <span className="text-indigo-400 font-mono font-bold">{p.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-950 border border-slate-800/80 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Team, Van, Budget & Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      {isPrivileged ? (
                        <select
                          value={p.groupId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleQuickAssignGroup(e, p.id, e.target.value)}
                          className="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-0.5 focus:outline-none max-w-[130px] truncate"
                        >
                          <option value="">No Team Assigned</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      ) : p.group ? (
                        <span className="flex items-center gap-1 text-slate-300 font-medium truncate max-w-[120px]">
                          <UsersRound size={12} className="text-blue-400" />
                          <span>{p.group.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No team</span>
                      )}

                      {(p.vehicle || p.group?.vehicle) && (
                        <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                          <Truck size={11} className="text-amber-400" />
                          <span>{(p.vehicle || p.group?.vehicle)?.registrationNo}</span>
                        </span>
                      )}
                    </div>

                    {p.contractValue !== null && p.contractValue !== undefined && (
                      <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                        {formatCurrency(p.contractValue)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      {p.targetEndDate ? `Deadline: ${formatDate(p.targetEndDate)}` : 'Timeline Ongoing'}
                    </span>
                    <span className="text-indigo-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                      <span>Command Center</span>
                      <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* CORPORATE TABLE VIEW WITH EDIT & DELETE */
        <DataTable
          headers={[
            'Project & Code',
            'Tender Ref / Dept',
            'CCTV Mounted',
            'Progress',
            'Field Team & Van',
            'Budget (₹)',
            'Status',
            'Actions',
          ]}
        >
          {projects.map((p) => (
            <tr
              key={p.id}
              onClick={() => handleOpen360(p.id)}
              className="hover:bg-slate-800/40 transition cursor-pointer group"
            >
              {/* Project & Code */}
              <td className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    <FolderGit2 size={15} />
                  </div>
                  <div>
                    <p className="font-semibold text-white truncate max-w-xs">{p.name}</p>
                    <p className="text-[11px] text-indigo-400 font-mono">{p.code}</p>
                  </div>
                </div>
              </td>

              {/* Tender Ref / Dept */}
              <td className="p-4 text-xs">
                <p className="text-white font-medium truncate max-w-[160px]">
                  {p.client?.companyName || p.tenderAuthority || 'Govt Department'}
                </p>
                <p className="text-slate-400 text-[11px] font-mono">{p.tenderNo || p.workOrderNo || 'N/A'}</p>
              </td>

              {/* CCTV Cameras */}
              <td className="p-4 text-xs font-mono">
                <span className="text-white font-bold">
                  {p.totalCamerasInstalled} / {p.totalCamerasPlanned}
                </span>
                <p className="text-slate-400 text-[10px]">{p._count?.sites || 0} Poles/Sites</p>
              </td>

              {/* Progress */}
              <td className="p-4 text-xs">
                <div className="w-24 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-300">
                    <span>{p.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              </td>

              {/* Field Team & Van */}
              <td className="p-4 text-xs">
                <p className="text-slate-300 font-medium">{p.group?.name || 'Unassigned'}</p>
                <p className="text-slate-500 text-[11px] font-mono">
                  {(p.vehicle || p.group?.vehicle)?.registrationNo || ''}
                </p>
              </td>

              {/* Budget */}
              <td className="p-4 text-xs font-mono font-bold text-amber-400">
                {p.contractValue !== null ? formatCurrency(p.contractValue) : '—'}
              </td>

              {/* Status */}
              <td className="p-4">
                <Badge
                  variant={p.status === 'COMMISSIONED' ? 'success' : 'default'}
                  className="text-[9px] font-bold"
                >
                  {p.status?.replace('_', ' ')}
                </Badge>
              </td>

              {/* Action Buttons: 360, Edit, Delete */}
              <td className="p-4">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen360(p.id);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold transition border border-indigo-500/30"
                  >
                    360°
                  </button>

                  {isPrivileged && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(p);
                          setEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 border border-slate-800 transition"
                        title="Edit Project"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmProject(p);
                        }}
                        className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                        title="Delete Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        /* KANBAN STAGE BOARD VIEW WITH 1-CLICK STAGE ADVANCE, EDIT & DELETE */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {kanbanColumns.map((col) => {
            const colProjects = projects.filter((p) => {
              if (col.id === 'PLANNING') return p.status === 'PLANNING' || p.status === 'SURVEY';
              if (col.id === 'MATERIAL_PROCUREMENT') return p.status === 'MATERIAL_PROCUREMENT';
              if (col.id === 'IN_PROGRESS') return p.status === 'IN_PROGRESS';
              if (col.id === 'TESTING_INSPECTION') return p.status === 'TESTING_INSPECTION';
              if (col.id === 'COMMISSIONED') return p.status === 'COMMISSIONED';
              return false;
            });

            return (
              <div key={col.id} className={`p-4 rounded-3xl border ${col.color} space-y-3 min-w-[250px] flex flex-col`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{col.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 font-mono font-bold">
                    {colProjects.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colProjects.length === 0 ? (
                    <div className="p-4 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-[11px] text-slate-500">
                      No tenders in this stage
                    </div>
                  ) : (
                    colProjects.map((p) => {
                      const currentIdx = STAGES_SEQUENCE.indexOf(p.status);
                      const canAdvance = currentIdx < STAGES_SEQUENCE.length - 1;
                      const canMoveBack = currentIdx > 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleOpen360(p.id)}
                          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition shadow-md space-y-2.5 group relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-indigo-400 font-bold">{p.code}</span>
                            <div className="flex items-center gap-1">
                              {isPrivileged && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingProject(p);
                                      setEditModalOpen(true);
                                    }}
                                    className="p-1 rounded bg-slate-950 text-slate-400 hover:text-indigo-400"
                                    title="Edit"
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmProject(p);
                                    }}
                                    className="p-1 rounded bg-slate-950 text-slate-400 hover:text-rose-400"
                                    title="Delete"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              )}
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">{p.progress}%</span>
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition line-clamp-2">
                            {p.name}
                          </h4>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                            <span>{p.totalCamerasInstalled}/{p.totalCamerasPlanned} CCTV</span>
                            <span className="font-mono font-bold text-amber-400">{formatCurrency(p.contractValue)}</span>
                          </div>

                          {/* 1-Click Kanban Stage Shift Buttons */}
                          {isPrivileged && (
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                              {canMoveBack ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickChangeStage(e, p.id, STAGES_SEQUENCE[currentIdx - 1])}
                                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5 border border-slate-800 transition"
                                  title="Move to Previous Stage"
                                >
                                  <ArrowLeft size={10} />
                                  <span>Back</span>
                                </button>
                              ) : <div />}

                              {canAdvance && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickChangeStage(e, p.id, STAGES_SEQUENCE[currentIdx + 1])}
                                  className="p-1 px-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-[10px] text-indigo-300 hover:text-white font-bold flex items-center gap-0.5 border border-indigo-500/30 transition"
                                  title="Advance to Next Stage"
                                >
                                  <span>Advance</span>
                                  <ArrowRight size={10} />
                                </button>
                              )}
                            </div>
                          )}
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

      {/* Modals & 360 Drawer */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchProjects();
        }}
        clients={clients}
        groups={groups}
        vehicles={vehicles}
        users={users}
      />

      <EditProjectModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingProject(null);
        }}
        onSuccess={() => {
          fetchStats();
          fetchProjects();
        }}
        onDelete={() => {
          fetchStats();
          fetchProjects();
        }}
        project={editingProject}
        clients={clients}
        groups={groups}
        vehicles={vehicles}
        users={users}
      />

      {/* Dedicated Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <Modal
          isOpen={Boolean(deleteConfirmProject)}
          onClose={() => setDeleteConfirmProject(null)}
          title="Delete Tender Project"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Permanently Delete Project?</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to delete <b className="text-rose-400">[{deleteConfirmProject.code}]</b>{' '}
                  <span className="font-bold text-white">"{deleteConfirmProject.name}"</span>?
                </p>
                <p className="text-[11px] text-slate-400">
                  All {deleteConfirmProject._count?.sites || 0} junction sites, {deleteConfirmProject._count?.milestones || 0} milestone checklists, and associated tender records will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmProject(null)}
                className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 size={14} />
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {addSiteModalOpen && siteTargetProjectId && (
        <AddProjectSiteModal
          isOpen={addSiteModalOpen}
          onClose={() => {
            setAddSiteModalOpen(false);
            setSiteTargetProjectId(null);
          }}
          onSuccess={() => {
            fetchStats();
            fetchProjects();
          }}
          projectId={siteTargetProjectId}
        />
      )}

      <Project360Drawer
        projectId={selectedProjectId}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedProjectId(null);
        }}
        onRefresh={() => {
          fetchStats();
          fetchProjects();
        }}
        clients={clients}
        groups={groups}
        vehicles={vehicles}
        users={users}
      />
    </div>
  );
}
