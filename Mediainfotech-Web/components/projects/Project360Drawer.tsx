'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  X,
  FolderGit2,
  Calendar,
  IndianRupee,
  MapPin,
  Users,
  Truck,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  Ticket,
  Package,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronRight,
  ExternalLink,
  Upload,
  Trash2,
  Zap,
  Edit3,
  MessageSquare,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { AddProjectSiteModal } from './AddProjectSiteModal';
import { EditProjectModal } from './EditProjectModal';
import Link from 'next/link';

interface Project360DrawerProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  clients?: any[];
  groups?: any[];
  vehicles?: any[];
  users?: any[];
}

export function Project360Drawer({
  projectId,
  isOpen,
  onClose,
  onRefresh,
  clients = [],
  groups = [],
  vehicles = [],
  users = [],
}: Project360DrawerProps) {
  const { hasRole, hasPermission } = useAuth();
  const isPrivileged = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('projects', 'update');

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MILESTONES' | 'SITES' | 'HARDWARE' | 'TEAM' | 'DOCUMENTS' | 'TICKETS'>('MILESTONES');

  // Sub-modal states
  const [addSiteModalOpen, setAddSiteModalOpen] = useState(false);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);

  // Document Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('WORK_ORDER');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Custom Milestone State
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneStage, setNewMilestoneStage] = useState('CAMERA_MOUNTING');
  const [addingMilestone, setAddingMilestone] = useState(false);

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/projects/${projectId}`);
      setProject(res.data.data);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleUpdateMilestone = async (milestoneId: string, status: string, progress: number) => {
    try {
      // Optimistic update
      setProject((prev: any) => {
        if (!prev) return prev;
        const updatedMilestones = prev.milestones.map((m: any) =>
          m.id === milestoneId ? { ...m, status, progress } : m
        );
        const avgProgress = Math.round(
          updatedMilestones.reduce((acc: number, m: any) => acc + (m.progress || 0), 0) /
            (updatedMilestones.length || 1)
        );
        return { ...prev, milestones: updatedMilestones, progress: avgProgress };
      });

      await api.put(`/api/projects/milestones/${milestoneId}`, {
        status,
        progress,
      });

      fetchProjectDetails();
      onRefresh();
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete milestone "${title}"?`)) return;

    try {
      // Optimistic update
      setProject((prev: any) => {
        if (!prev) return prev;
        const updatedMilestones = prev.milestones.filter((m: any) => m.id !== milestoneId);
        const avgProgress = updatedMilestones.length > 0
          ? Math.round(
              updatedMilestones.reduce((acc: number, m: any) => acc + (m.progress || 0), 0) /
                updatedMilestones.length
            )
          : 0;
        return { ...prev, milestones: updatedMilestones, progress: avgProgress };
      });

      await api.delete(`/api/projects/milestones/${milestoneId}`);
      fetchProjectDetails();
      onRefresh();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  const handleAddCustomMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !projectId) return;

    try {
      setAddingMilestone(true);
      await api.post(`/api/projects/${projectId}/milestones`, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || undefined,
        stage: newMilestoneStage,
        status: 'IN_PROGRESS',
        order: (project?.milestones?.length || 0) + 1,
        progress: 25,
      });
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
      setAddMilestoneModalOpen(false);
      fetchProjectDetails();
      onRefresh();
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleUpdateSiteCameras = async (site: any, delta: number) => {
    const newInstalled = Math.max(0, Math.min(site.camerasPlanned, site.camerasInstalled + delta));
    try {
      // Optimistic update
      setProject((prev: any) => {
        if (!prev) return prev;
        const updatedSites = prev.sites.map((s: any) =>
          s.id === site.id
            ? {
                ...s,
                camerasInstalled: newInstalled,
                status:
                  newInstalled >= s.camerasPlanned
                    ? 'ONLINE_TESTED'
                    : newInstalled > 0
                    ? 'CAMERA_MOUNTED'
                    : s.status,
              }
            : s
        );
        const totalInstalled = updatedSites.reduce(
          (acc: number, s: any) => acc + (s.camerasInstalled || 0),
          0
        );
        return { ...prev, sites: updatedSites, totalCamerasInstalled: totalInstalled };
      });

      await api.put(`/api/projects/sites/${site.id}`, {
        camerasInstalled: newInstalled,
        status:
          newInstalled >= site.camerasPlanned
            ? 'ONLINE_TESTED'
            : newInstalled > 0
            ? 'CAMERA_MOUNTED'
            : site.status,
      });
      fetchProjectDetails();
      onRefresh();
    } catch (err) {
      console.error('Failed to update site cameras:', err);
    }
  };

  const handleUpdateSiteStatus = async (siteId: string, newStatus: string) => {
    try {
      await api.put(`/api/projects/sites/${siteId}`, { status: newStatus });
      fetchProjectDetails();
      onRefresh();
    } catch (err) {
      console.error('Failed to update site status:', err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !projectId) return;

    try {
      setUploadingDoc(true);
      let fileUrl = `/uploads/documents/${newDocCategory.toLowerCase()}_sample.pdf`;
      let fileSize = '1.4 MB';

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = uploadRes.data.fileUrl || uploadRes.data.url;
        fileSize = (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB';
      }

      await api.post(`/api/projects/${projectId}/documents`, {
        title: newDocTitle.trim(),
        category: newDocCategory,
        fileUrl,
        fileSize,
      });

      setNewDocTitle('');
      setSelectedFile(null);
      setUploadDocModalOpen(false);
      fetchProjectDetails();
    } catch (err) {
      console.error('Failed to upload document:', err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await api.delete(`/api/projects/documents/${docId}`);
      fetchProjectDetails();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleQuickChangeStage = async (newStatus: string) => {
    if (!project?.id) return;
    try {
      await api.put(`/api/projects/${project.id}`, { status: newStatus });
      fetchProjectDetails();
      onRefresh();
    } catch (err) {
      console.error('Failed to update project status:', err);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return null;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {project?.code || 'PROJECT'}
                </span>
                {project?.tenderNo && (
                  <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    Tender: {project.tenderNo}
                  </span>
                )}

                {/* Quick Stage Progression Dropdown */}
                {isPrivileged ? (
                  <select
                    value={project?.status || 'IN_PROGRESS'}
                    onChange={(e) => handleQuickChangeStage(e.target.value)}
                    className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-indigo-500/40 text-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="PLANNING">Planning & Survey</option>
                    <option value="MATERIAL_PROCUREMENT">Material Procurement</option>
                    <option value="IN_PROGRESS">Field Execution</option>
                    <option value="TESTING_INSPECTION">Testing & JIR Inspection</option>
                    <option value="COMMISSIONED">Commissioned & AMC</option>
                  </select>
                ) : (
                  <Badge
                    variant={
                      project?.status === 'COMMISSIONED'
                        ? 'success'
                        : project?.status === 'IN_PROGRESS'
                        ? 'default'
                        : 'secondary'
                    }
                    className="text-[10px] font-bold uppercase tracking-wider"
                  >
                    {project?.status?.replace('_', ' ')}
                  </Badge>
                )}

                <Badge
                  variant={project?.priority === 'URGENT' ? 'destructive' : 'outline'}
                  className="text-[10px] font-semibold"
                >
                  {project?.priority} SLA
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {project?.name || 'Loading Project...'}
              </h2>

              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-0.5">
                {project?.client && (
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <span className="text-slate-500">Dept/Client:</span> {project.client.companyName || project.client.name}
                  </span>
                )}
                {project?.locationName && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin size={13} className="text-amber-400" />
                    <span>{project.locationName}</span>
                  </span>
                )}
                {project?.contractValue !== null && project?.contractValue !== undefined && (
                  <span className="text-amber-400 font-bold font-mono">
                    Budget: {formatCurrency(project.contractValue)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPrivileged && (
                <button
                  onClick={() => setEditProjectModalOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-white border border-slate-800 transition shadow-sm"
                  title="Edit Project Details"
                >
                  <Edit3 size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress Bar Strip */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-400">Overall Commissioning Progress</span>
              <span className="text-indigo-400 font-mono font-bold">{project?.progress ?? 0}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${project?.progress ?? 0}%` }}
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'MILESTONES', label: 'Milestones', count: project?.milestones?.length, icon: Layers },
              { id: 'SITES', label: 'Sites & Junctions', count: project?.sites?.length, icon: Video },
              { id: 'HARDWARE', label: 'Hardware', count: project?.inventoryItems?.length, icon: Package },
              { id: 'TEAM', label: 'Team & Van', count: project?.group?.members?.length, icon: Users },
              { id: 'DOCUMENTS', label: 'Documents & JIR', count: project?.documents?.length, icon: FileText },
              { id: 'TICKETS', label: 'AMC Tickets', count: project?.tickets?.length, icon: Ticket },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/80 text-slate-300 font-mono">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-950/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* TAB 1: MILESTONES & TENDER EXECUTION PHASES */}
              {activeTab === 'MILESTONES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Execution Milestones & Quality Sign-Off</h3>
                      <p className="text-xs text-slate-400">Step-by-step progress tracking for government inspections</p>
                    </div>

                    {isPrivileged && (
                      <Button
                        size="sm"
                        onClick={() => setAddMilestoneModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <Plus size={13} />
                        <span>Add Milestone</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {project?.milestones?.map((m: any, idx: number) => {
                      const isCompleted = m.status === 'COMPLETED';
                      const isInProgress = m.status === 'IN_PROGRESS';

                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-2xl border transition ${
                            isCompleted
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : isInProgress
                              ? 'bg-indigo-500/5 border-indigo-500/30'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                  isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : isInProgress
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>{m.title}</span>
                                  {isCompleted && (
                                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                                      <CheckCircle2 size={11} /> Verified
                                    </span>
                                  )}
                                </h4>
                                {m.description && (
                                  <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Status and Action Buttons */}
                            {isPrivileged && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {!isCompleted && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateMilestone(m.id, 'COMPLETED', 100)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] h-7 px-2.5 font-semibold gap-1 shadow-sm"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Sign Off</span>
                                  </Button>
                                )}
                                {isCompleted && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateMilestone(m.id, 'IN_PROGRESS', 50)}
                                    className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 text-[11px] h-7 px-2"
                                  >
                                    Reopen
                                  </Button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMilestone(m.id, m.title)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                                  title="Delete Milestone"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Interactive Progress Slider */}
                          <div className="mt-3 flex items-center gap-3 text-xs">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={m.progress || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                handleUpdateMilestone(m.id, val === 100 ? 'COMPLETED' : val > 0 ? 'IN_PROGRESS' : 'PENDING', val);
                              }}
                              className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-slate-900 rounded-lg appearance-none"
                            />
                            <span className="text-slate-300 font-mono text-[11px] font-bold w-10 text-right">
                              {m.progress}%
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {(!project?.milestones || project?.milestones?.length === 0) && (
                      <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                        <Layers size={28} className="mx-auto text-slate-600" />
                        <p className="text-xs font-bold text-slate-400">No milestones configured yet</p>
                        <p className="text-[11px] text-slate-500">Click "+ Add Milestone" above to define inspection phases</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SITES & CAMERA JUNCTIONS */}
              {activeTab === 'SITES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Camera Junctions & Pole Locations</h3>
                      <p className="text-xs text-slate-400">
                        {project?.totalCamerasInstalled ?? 0} of {project?.totalCamerasPlanned ?? 0} CCTV cameras mounted across sites
                      </p>
                    </div>

                    {isPrivileged && (
                      <Button
                        size="sm"
                        onClick={() => setAddSiteModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <Plus size={14} />
                        <span>Add Junction Site</span>
                      </Button>
                    )}
                  </div>

                  {project?.sites?.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <Video size={28} className="mx-auto text-slate-600" />
                      <p className="text-xs font-bold text-slate-400">No junction landmarks registered yet</p>
                      <p className="text-[11px] text-slate-500">Click "Add Junction Site" to map poles and camera quantities</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {project?.sites?.map((s: any) => {
                        const isDone = s.camerasInstalled >= s.camerasPlanned;
                        return (
                          <div
                            key={s.id}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-md space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-extrabold text-white">{s.name}</h4>
                                {s.address && (
                                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                    <MapPin size={11} className="text-amber-400 shrink-0" />
                                    <span className="truncate">{s.address}</span>
                                  </p>
                                )}
                              </div>

                              {isPrivileged ? (
                                <select
                                  value={s.status}
                                  onChange={(e) => handleUpdateSiteStatus(s.id, e.target.value)}
                                  className="text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                                >
                                  <option value="SURVEYED">SURVEYED</option>
                                  <option value="POLE_ERECTED">POLE ERECTED</option>
                                  <option value="CABLING_DONE">CABLING DONE</option>
                                  <option value="CAMERA_MOUNTED">CAMERA MOUNTED</option>
                                  <option value="ONLINE_TESTED">ONLINE TESTED</option>
                                </select>
                              ) : (
                                <Badge
                                  variant={isDone ? 'success' : s.camerasInstalled > 0 ? 'default' : 'secondary'}
                                  className="text-[9px] font-bold shrink-0"
                                >
                                  {s.status}
                                </Badge>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[11px] text-slate-400 block font-medium">CCTV Cameras</span>
                                <span className="text-sm font-black font-mono text-white">
                                  {s.camerasInstalled} / {s.camerasPlanned} Mounted
                                </span>
                              </div>

                              {/* Technician / Manager Quick Increment */}
                              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSiteCameras(s, -1)}
                                  disabled={s.camerasInstalled <= 0}
                                  className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold disabled:opacity-30 text-xs flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-mono font-bold text-xs text-indigo-400">
                                  {s.camerasInstalled}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSiteCameras(s, 1)}
                                  disabled={s.camerasInstalled >= s.camerasPlanned}
                                  className="w-6 h-6 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-30 text-xs flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span className="truncate">{s.poleType?.replace('_', ' ')}</span>
                              <span className="font-mono text-slate-500">{s.powerSource?.replace('_', ' ')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HARDWARE & INVENTORY */}
              {activeTab === 'HARDWARE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Allocated Equipment & Serial Inventory</h3>
                      <p className="text-xs text-slate-400">CCTV cameras, switches, and routers linked to this project</p>
                    </div>

                    <Link
                      href="/inventory"
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                    >
                      <span>Manage Central Inventory</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>

                  {project?.inventoryItems?.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <Package size={28} className="mx-auto text-slate-600" />
                      <p className="text-xs font-bold text-slate-400">No hardware tagged to this project yet</p>
                      <p className="text-[11px] text-slate-500">Dispatch hardware from the Inventory module to link here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {project?.inventoryItems?.map((item: any) => (
                        <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-md flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-white">{item.deviceName}</h4>
                            <p className="text-[11px] font-mono text-blue-400 font-bold">{item.barcode}</p>
                            <p className="text-[10px] text-slate-400">{item.modelNumber || item.category}</p>
                          </div>
                          <Badge variant={item.status === 'IN_STOCK' ? 'success' : 'default'} className="text-[9px]">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TEAM & VEHICLE */}
              {activeTab === 'TEAM' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Assigned Group */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Field Execution Team</span>
                        {project?.group && (
                          <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700">
                            {project.group.members?.length || 0} Technicians
                          </Badge>
                        )}
                      </div>

                      {project?.group ? (
                        <div className="space-y-2">
                          <h4 className="text-base font-extrabold text-white">{project.group.name}</h4>
                          <div className="space-y-1.5 pt-2 border-t border-slate-800">
                            {project.group.members?.map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between text-xs py-1">
                                <span className="text-white font-medium">
                                  {m.user?.firstName} {m.user?.lastName}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {m.user?.designation || m.role}
                                  </span>
                                  <Link
                                    href="/chat"
                                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 transition"
                                    title="Open Chat"
                                  >
                                    <MessageSquare size={12} />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No field group assigned yet</p>
                      )}
                    </div>

                    {/* Assigned Service Van */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Service Transport Van</span>

                      {project?.vehicle || project?.group?.vehicle ? (
                        <div className="space-y-2">
                          {(() => {
                            const v = project.vehicle || project.group.vehicle;
                            return (
                              <>
                                <h4 className="text-base font-mono font-black text-white">{v.registrationNo}</h4>
                                <p className="text-xs text-slate-400">{v.make} {v.model} ({v.type})</p>
                                <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                                  <span>Fuel: {v.fuelType || 'Diesel'}</span>
                                  <span className="text-emerald-400 font-semibold">{v.status}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No transport vehicle assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENT VAULT & JIR CERTIFICATES */}
              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Tender Documents & JIR Certificates</h3>
                      <p className="text-xs text-slate-400">Work orders, survey BOQ, and government completion certificates</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setUploadDocModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <Upload size={13} />
                      <span>Record Document</span>
                    </Button>
                  </div>

                  {project?.documents?.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <FileText size={28} className="mx-auto text-slate-600" />
                      <p className="text-xs font-bold text-slate-400">No project documents recorded yet</p>
                      <p className="text-[11px] text-slate-500">Record Work Orders, JIR Joint Inspection reports, and Tax Invoices</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {project?.documents?.map((doc: any) => (
                        <div key={doc.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                              <FileText size={15} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {doc.category} • {doc.fileSize || 'PDF'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-800 transition"
                            >
                              <span>View</span>
                              <ExternalLink size={11} />
                            </a>
                            {isPrivileged && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: AMC & BREAKDOWN TICKETS */}
              {activeTab === 'TICKETS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Warranty & AMC Maintenance Tickets</h3>
                      <p className="text-xs text-slate-400">Post-commissioning breakdown and service issues</p>
                    </div>

                    <Link
                      href="/tickets"
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                    >
                      <span>Tickets Center</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>

                  {project?.tickets?.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <ShieldCheck size={28} className="mx-auto text-emerald-500/60" />
                      <p className="text-xs font-bold text-slate-400">No active maintenance issues</p>
                      <p className="text-[11px] text-slate-500">All cameras and network infrastructure operating normally</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {project?.tickets?.map((t: any) => (
                        <div key={t.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-blue-400 font-bold">{t.ticketNumber}</span>
                              <Badge variant={t.status === 'RESOLVED' ? 'success' : 'destructive'} className="text-[9px]">
                                {t.status}
                              </Badge>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-1">{t.title}</h4>
                          </div>
                          <span className="text-[11px] text-slate-400">{formatDate(t.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      {addSiteModalOpen && projectId && (
        <AddProjectSiteModal
          isOpen={addSiteModalOpen}
          onClose={() => setAddSiteModalOpen(false)}
          onSuccess={() => {
            fetchProjectDetails();
            onRefresh();
          }}
          projectId={projectId}
        />
      )}

      {editProjectModalOpen && project && (
        <EditProjectModal
          isOpen={editProjectModalOpen}
          onClose={() => setEditProjectModalOpen(false)}
          onSuccess={() => {
            fetchProjectDetails();
            onRefresh();
          }}
          project={project}
          clients={clients}
          groups={groups}
          vehicles={vehicles}
          users={users}
        />
      )}

      {/* Add Custom Milestone Modal */}
      {addMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Project Milestone</h3>
              <button onClick={() => setAddMilestoneModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomMilestone} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CCTV Camera Mounting & Cable Splicing"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Stage Category</label>
                <select
                  value={newMilestoneStage}
                  onChange={(e) => setNewMilestoneStage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="SURVEY_BOQ">Survey & BOQ</option>
                  <option value="CIVIL_FOUNDATION">Civil Foundation & Trenching</option>
                  <option value="POLE_ERECTION">Pole Erection</option>
                  <option value="POWER_CABLING">Power Cabling & Fiber</option>
                  <option value="CAMERA_MOUNTING">Camera Mounting</option>
                  <option value="NETWORK_SWITCH_CONFIG">Network Switch & NVR</option>
                  <option value="JIR_INSPECTION">JIR Joint Inspection</option>
                  <option value="HANDOVER_COMMISSIONING">Handover & Commissioning</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Description / Quality Notes</label>
                <textarea
                  placeholder="Specific inspection or quality criteria..."
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddMilestoneModalOpen(false)}
                  className="bg-slate-950 border-slate-800 text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addingMilestone}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {addingMilestone ? 'Adding...' : 'Add Milestone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadDocModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Record Project Document</h3>
              <button onClick={() => setUploadDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joint Inspection Report (JIR) Signed Copy"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="WORK_ORDER">Work Order & Sanction Letter</option>
                  <option value="TENDER_NOTICE">Tender Notice & RFP</option>
                  <option value="SURVEY_BOQ">Site Survey & BOQ Sheet</option>
                  <option value="JIR_INSPECTION">Joint Inspection Report (JIR)</option>
                  <option value="COMPLETION_CERTIFICATE">Acceptance & Commissioning Certificate</option>
                  <option value="INVOICE">Tax Invoice & Billing Document</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Choose File (Optional)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadDocModalOpen(false)}
                  className="bg-slate-950 border-slate-800 text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadingDoc}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {uploadingDoc ? 'Uploading...' : 'Save Document'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
