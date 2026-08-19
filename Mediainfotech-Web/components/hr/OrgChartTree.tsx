'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Users,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Building,
  UserCheck,
  Briefcase,
  Layers,
  ArrowDown,
  Wand2,
  AlertCircle,
  CheckCircle2,
  X,
  Network,
  Plus,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';

interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  designation?: string;
  department?: string;
  employeeCode?: string;
  managerId?: string;
  children?: OrgNode[];
}

export function OrgChartTree() {
  const { hasRole, user: authUser } = useAuth();
  const canManageOrg = hasRole('ADMIN', 'HR', 'MANAGER');

  const [treeData, setTreeData] = useState<OrgNode[]>([]);
  const [allUsers, setAllUsers] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoLinking, setAutoLinking] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Assign Manager Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<OrgNode | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [assigningManager, setAssigningManager] = useState(false);

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users/org-chart');
      setTreeData(res.data.data || []);
      setAllUsers(res.data.allUsers || []);
    } catch (e) {
      console.error('Failed to fetch org chart:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoStructure = async () => {
    if (!confirm('Auto-structure the organization? This will automatically link employees to Managers and Managers/HR to Executive Leadership.')) {
      return;
    }
    try {
      setAutoLinking(true);
      const res = await api.post('/api/users/org-chart/auto-link');
      alert(res.data.message || 'Org chart auto-structured successfully!');
      fetchOrgChart();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to auto-structure org chart');
    } finally {
      setAutoLinking(false);
    }
  };

  const handleOpenAssignModal = (node: OrgNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetEmployee(node);
    setSelectedManagerId(node.managerId || '');
    setAssignModalOpen(true);
  };

  const handleSaveReportingLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployee) return;
    try {
      setAssigningManager(true);
      await api.put(`/api/users/${targetEmployee.id}/manager`, {
        managerId: selectedManagerId || null,
      });
      setAssignModalOpen(false);
      fetchOrgChart();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update reporting line');
    } finally {
      setAssigningManager(false);
    }
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenProfile = (id: string) => {
    setSelectedUserId(id);
    setDrawerOpen(true);
  };

  const isMatched = (node: OrgNode) => {
    if (!search) return false;
    const q = search.toLowerCase();
    return (
      node.firstName?.toLowerCase().includes(q) ||
      node.lastName?.toLowerCase().includes(q) ||
      node.designation?.toLowerCase().includes(q) ||
      node.department?.toLowerCase().includes(q) ||
      node.employeeCode?.toLowerCase().includes(q)
    );
  };

  const getRoleBorder = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'border-amber-500/70 shadow-amber-500/10 bg-slate-900/95';
      case 'MANAGER':
        return 'border-blue-500/70 shadow-blue-500/10 bg-slate-900/95';
      case 'HR':
        return 'border-purple-500/70 shadow-purple-500/10 bg-slate-900/95';
      case 'ACCOUNTS':
        return 'border-emerald-500/70 shadow-emerald-500/10 bg-slate-900/95';
      default:
        return 'border-slate-800 hover:border-slate-700 bg-slate-900/85';
    }
  };

  // Find unassigned employees (non-admin members who have no manager assigned)
  const unassignedEmployees = allUsers.filter(
    (u) => !u.managerId && u.role !== 'ADMIN'
  );

  const departments = Array.from(new Set(allUsers.map((u) => u.department).filter(Boolean)));

  const renderNode = (node: OrgNode) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const matched = isMatched(node);

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          onClick={() => handleOpenProfile(node.id)}
          className={`relative z-10 w-64 p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xl group hover:scale-[1.02] ${getRoleBorder(
            node.role
          )} ${matched ? 'ring-2 ring-amber-400 border-amber-400 shadow-amber-500/30' : ''}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-white/10 flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0">
              {node.avatar ? (
                <img
                  src={node.avatar}
                  alt={node.firstName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                `${node.firstName?.[0] || ''}${node.lastName?.[0] || ''}`
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-extrabold text-white truncate group-hover:text-blue-400 transition">
                  {node.firstName} {node.lastName}
                </h4>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800/80 border-slate-700">
                  {node.role}
                </Badge>
              </div>

              <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                {node.designation || 'Staff Member'}
              </p>

              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {node.department && (
                  <span className="text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800 truncate">
                    {node.department}
                  </span>
                )}
                {node.employeeCode && (
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                    {node.employeeCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Row & Direct Reports */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {canManageOrg && (
              <button
                type="button"
                onClick={(e) => handleOpenAssignModal(node, e)}
                className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold flex items-center gap-1 transition border border-indigo-500/20"
                title="Change Reporting Line / Manager"
              >
                <GitBranch size={11} />
                <span>{node.managerId ? 'Reassign' : '+ Manager'}</span>
              </button>
            )}

            {hasChildren && (
              <button
                onClick={(e) => toggleCollapse(node.id, e)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition ml-auto"
              >
                <span className="font-mono text-[9px] mr-0.5">({node.children!.length})</span>
                {isCollapsed ? (
                  <>
                    <ChevronRight size={12} />
                    <span>Expand</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Child Subtree Branches */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center">
            {/* Vertical connector line down from parent */}
            <div className="w-0.5 h-6 bg-slate-700"></div>

            {/* Horizontal branch bar and children */}
            <div className="relative flex justify-center pt-6">
              {/* Horizontal line spanning across children */}
              {node.children!.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-slate-700"
                  style={{
                    left: `calc(${100 / (node.children!.length * 2)}%)`,
                    right: `calc(${100 / (node.children!.length * 2)}%)`,
                  }}
                />
              )}

              <div className="flex gap-8 items-start">
                {node.children!.map((child) => (
                  <div key={child.id} className="relative flex flex-col items-center">
                    {/* Vertical connector line up to horizontal bar */}
                    <div className="absolute -top-6 w-0.5 h-6 bg-slate-700"></div>
                    {renderNode(child)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Organizational Hierarchy & Reporting Tree
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic company structure mapping leadership to managers and team reporting lines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManageOrg && (
            <Button
              onClick={handleAutoStructure}
              disabled={autoLinking}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Wand2 size={14} className={autoLinking ? 'animate-spin' : ''} />
              <span>{autoLinking ? 'Structuring...' : 'Auto-Structure Tree'}</span>
            </Button>
          )}

          <Button
            onClick={fetchOrgChart}
            variant="outline"
            size="sm"
            className="text-xs border-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </Button>

          {/* Search */}
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Zoom controls */}
          <div className="inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-2 font-semibold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
              title="Reset Zoom"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Unassigned Members Quick Assignment Dock */}
      {unassignedEmployees.length > 0 && canManageOrg && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle size={18} />
              <h4 className="text-xs sm:text-sm font-bold">
                {unassignedEmployees.length} Team Member{unassignedEmployees.length > 1 ? 's' : ''} Without an Assigned Manager
              </h4>
            </div>
            <span className="text-[11px] text-amber-300/80">
              Click &apos;Assign Manager&apos; or use &apos;Auto-Structure Tree&apos; to link them.
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {unassignedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white flex-shrink-0"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white">
                  {emp.firstName?.[0] || 'U'}
                </div>
                <span className="font-semibold">{emp.firstName} {emp.lastName}</span>
                <span className="text-[10px] text-slate-400">({emp.role})</span>
                <button
                  type="button"
                  onClick={(e) => handleOpenAssignModal(emp, e)}
                  className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white ml-1 transition"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-950/90 border border-slate-800/80 shadow-2xl overflow-x-auto min-h-[600px] flex justify-center items-start">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-500 space-y-3">
            <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Building organization hierarchy...</span>
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-28 text-slate-500 space-y-3">
            <Layers className="mx-auto text-slate-700" size={40} />
            <p className="text-sm font-semibold">No organizational hierarchy records found.</p>
            {canManageOrg && (
              <Button
                onClick={handleAutoStructure}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white"
              >
                Initialize Reporting Hierarchy
              </Button>
            )}
          </div>
        ) : (
          <div
            className="flex gap-16 items-start justify-center transition-transform duration-200 origin-top"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {treeData.map((rootNode) => renderNode(rootNode))}
          </div>
        )}
      </div>

      {/* Assign Manager Modal */}
      {assignModalOpen && targetEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <GitBranch size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Assign Reporting Line</h4>
                  <p className="text-xs text-slate-400">
                    Set who {targetEmployee.firstName} {targetEmployee.lastName} reports to.
                  </p>
                </div>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReportingLine} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Select Manager / Supervisor
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Direct Manager (Top Leadership / Root)</option>
                  {allUsers
                    .filter((u) => u.id !== targetEmployee.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role} — {u.designation || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={assigningManager}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {assigningManager ? 'Saving...' : 'Save Reporting Line'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile Drawer */}
      <EmployeeProfileDrawer
        userId={selectedUserId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={fetchOrgChart}
      />
    </div>
  );
}
