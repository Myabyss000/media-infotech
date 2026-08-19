'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  LayoutGrid,
  List,
  Filter,
  Layers,
  Sparkles,
  ArrowUpRight,
  Briefcase,
  Building,
  UserCheck,
  Eye,
  Edit,
  Clock,
  UserX,
  RotateCcw,
  ShieldCheck,
  Archive,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormField, inputClassName } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeProfileDrawer } from '@/components/hr/EmployeeProfileDrawer';
import { EmployeeOffboardModal } from '@/components/hr/EmployeeOffboardModal';

export default function EmployeesPage() {
  const { hasPermission, hasRole, user } = useAuth();
  const isPrivileged = hasRole('ADMIN', 'MANAGER', 'HR') || hasPermission('users', 'create') || hasPermission('users', 'update');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [profileDrawerUserId, setProfileDrawerUserId] = useState<string | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [offboardModalOpen, setOffboardModalOpen] = useState(false);
  const [offboardTargetEmp, setOffboardTargetEmp] = useState<any | null>(null);

  // Form State
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'EMPLOYEE',
    designation: '',
    department: '',
    employeeCode: '',
    managerId: '',
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    lateGracePeriod: '15',
    workDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
  });

  const canEditSchedule =
    user?.role === 'ADMIN' ||
    user?.role === 'HR' ||
    user?.role === 'MANAGER' ||
    hasPermission('users', 'update') ||
    hasPermission('hr', 'update');

  useEffect(() => {
    fetchEmployees();
  }, [search, departmentFilter, roleFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter !== 'ALL') params.append('department', departmentFilter);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);

      const res = await api.get(`/api/users?${params.toString()}`);
      setEmployees(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/users', form);
      setModalOpen(false);
      fetchEmployees();
      setForm({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'EMPLOYEE',
        designation: '',
        department: '',
        employeeCode: '',
        managerId: '',
        shiftStartTime: '09:30',
        shiftEndTime: '18:30',
        lateGracePeriod: '15',
        workDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleOpen360 = (userId: string) => {
    setProfileDrawerUserId(userId);
    setProfileDrawerOpen(true);
  };

  const handleOpenOffboard = (emp: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOffboardTargetEmp(emp);
    setOffboardModalOpen(true);
  };

  const handleReactivate = async (emp: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to restore active login and system access for ${emp.firstName} ${emp.lastName}?`)) return;
    try {
      const res = await api.post(`/api/users/${emp.id}/reactivate`);
      alert(res.data.message || 'Employee reactivated successfully!');
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reactivate employee');
    }
  };

  const handleOpenEdit = (emp: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEmp(emp);
    setForm({
      username: emp.username,
      email: emp.email,
      password: '',
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone || '',
      role: emp.role || 'EMPLOYEE',
      designation: emp.designation || '',
      department: emp.department || '',
      employeeCode: emp.employeeCode || '',
      managerId: emp.managerId || '',
      shiftStartTime: emp.shiftStartTime || '09:30',
      shiftEndTime: emp.shiftEndTime || '18:30',
      lateGracePeriod: emp.lateGracePeriod?.toString() || '15',
      workDays: emp.workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      await api.put(`/api/users/${selectedEmp.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        designation: form.designation,
        department: form.department,
        employeeCode: form.employeeCode,
        managerId: form.managerId || null,
        shiftStartTime: form.shiftStartTime,
        shiftEndTime: form.shiftEndTime,
        lateGracePeriod: form.lateGracePeriod,
        workDays: form.workDays,
      });
      setEditModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update employee details');
    }
  };

  const toggleWorkDay = (day: string) => {
    const daysArr = form.workDays ? form.workDays.split(',').filter(Boolean) : [];
    let updated: string[];
    if (daysArr.includes(day)) {
      updated = daysArr.filter((d) => d !== day);
    } else {
      updated = [...daysArr, day];
    }
    setForm({ ...form, workDays: updated.join(',') });
  };

  const ALL_WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  if (!isPrivileged) {
    return (
      <div className="space-y-6 max-w-4xl pb-12">
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">
                My Employment Dossier
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Full company-wide employee rosters and sensitive records are restricted to HR & Administration.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-lg">
                {user?.firstName?.[0] || ''}{user?.lastName?.[0] || ''}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-xs text-slate-400">{user?.designation || user?.role || 'Staff Member'} • {user?.department || 'Operations'}</p>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 mt-1">
                  Active Employee
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Official Email</span>
                <span className="text-white font-mono">{user?.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Department</span>
                <span className="text-white">{user?.department || 'General'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => {
                  setProfileDrawerUserId(user?.id || null);
                  setProfileDrawerOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5"
              >
                <Eye size={15} />
                <span>View My 360° Profile Details</span>
              </Button>
              <Link
                href="/hr"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
              >
                Return to HR Hub
              </Link>
            </div>
          </div>
        </div>

        {/* Profile Drawer for personal profile */}
        <EmployeeProfileDrawer
          userId={profileDrawerUserId}
          isOpen={profileDrawerOpen}
          onClose={() => {
            setProfileDrawerOpen(false);
            setProfileDrawerUserId(null);
          }}
          onUpdated={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users size={16} />
            <span>Human Resource Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Employee Directory & 360° Profiles
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Manage employee rosters, emergency contacts, bank details, document vaults, and reporting lines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/hr/org-chart"
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 font-semibold text-xs flex items-center gap-1.5 transition shadow-lg"
          >
            <Layers size={15} />
            <span>Interactive Org Tree</span>
          </Link>

          {hasPermission('users', 'create') && (
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <UserPlus size={15} />
              <span>Add Employee</span>
            </Button>
          )}
        </div>
      </div>

      {/* Top Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setStatusTab('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusTab === 'ACTIVE'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Active Workforce</span>
          <Badge variant="outline" className="text-[10px] bg-slate-950 border-emerald-500/30 text-emerald-400">
            {employees.filter((e) => e.isActive).length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('ARCHIVED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusTab === 'ARCHIVED'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Archive size={14} className="text-amber-400" />
          <span>Relieved & Archived Vault</span>
          <Badge variant="outline" className="text-[10px] bg-slate-950 border-amber-500/30 text-amber-400">
            {employees.filter((e) => !e.isActive).length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            statusTab === 'ALL'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          <span>All Personnel</span>
          <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-700 text-slate-400">
            {employees.length}
          </Badge>
        </button>
      </div>

      {/* Filter & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, designation, email..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept: any) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="HR">HR</option>
            <option value="ACCOUNTS">ACCOUNTS</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Table View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs">Loading employee directory...</span>
        </div>
      ) : employees.filter((emp) => {
          if (statusTab === 'ACTIVE') return emp.isActive;
          if (statusTab === 'ARCHIVED') return !emp.isActive;
          return true;
        }).length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-400 text-xs">
          No employees match your search or filter criteria in this tab.
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees
            .filter((emp) => {
              if (statusTab === 'ACTIVE') return emp.isActive;
              if (statusTab === 'ARCHIVED') return !emp.isActive;
              return true;
            })
            .map((emp) => (
            <div
              key={emp.id}
              onClick={() => handleOpen360(emp.id)}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:scale-105 transition flex-shrink-0">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.firstName} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-700 text-indigo-400">
                      {emp.role}
                    </Badge>
                    <Badge variant={emp.isActive ? 'success' : 'destructive'} className="text-[9px]">
                      {emp.isActive ? 'Active' : 'Relieved / Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3.5">
                  <h3 className="text-base font-extrabold text-white group-hover:text-indigo-400 transition">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">{emp.designation || 'Staff Member'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{emp.department || 'General'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center text-slate-400 gap-1.5 truncate">
                    <Mail size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center text-slate-400 gap-1.5">
                      <Phone size={13} className="text-slate-500 flex-shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-slate-400 gap-1.5 font-mono text-[11px]">
                    <Clock size={13} className="text-emerald-400 flex-shrink-0" />
                    <span>
                      {emp.shiftStartTime || '09:30'} - {emp.shiftEndTime || '18:30'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                {emp.manager ? (
                  <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Lead: {emp.manager.firstName} {emp.manager.lastName}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Direct / Lead</span>
                )}

                <div className="flex items-center gap-1.5">
                  {canEditSchedule && (
                    <>
                      <button
                        onClick={(e) => handleOpenEdit(emp, e)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Edit Shift"
                      >
                        <Edit size={13} />
                      </button>

                      {emp.isActive ? (
                        <button
                          onClick={(e) => handleOpenOffboard(emp, e)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          title="Relieve / Offboard Employee (Type-to-Confirm)"
                        >
                          <UserX size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleReactivate(emp, e)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                          title="Reactivate Employee (Restore Access)"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </>
                  )}
                  <span className="text-xs text-indigo-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                    <span>360°</span>
                    <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <DataTable
          headers={['Employee', 'Role & Department', 'Shift & Schedule', 'Reporting Manager', 'Status', 'Actions']}
        >
          {employees
            .filter((emp) => {
              if (statusTab === 'ACTIVE') return emp.isActive;
              if (statusTab === 'ARCHIVED') return !emp.isActive;
              return true;
            })
            .map((emp) => {
            const activeDaysCount = emp.workDays ? emp.workDays.split(',').filter(Boolean).length : 6;

            return (
              <tr
                key={emp.id}
                onClick={() => handleOpen360(emp.id)}
                className="hover:bg-slate-800/40 transition cursor-pointer"
              >
                {/* Employee */}
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                      {emp.firstName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {emp.employeeCode || `@${emp.username}`}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role & Department */}
                <td className="p-4">
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-semibold uppercase border border-blue-500/20">
                    {emp.role}
                  </span>
                  <p className="text-slate-300 text-xs font-medium mt-1">{emp.designation || 'Staff'}</p>
                  <p className="text-slate-500 text-[11px]">{emp.department || 'General'}</p>
                </td>

                {/* Shift Timings & Workdays */}
                <td className="p-4 text-xs font-mono">
                  <p className="text-emerald-400 font-bold">
                    {emp.shiftStartTime || '09:30'} — {emp.shiftEndTime || '18:30'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Grace: {emp.lateGracePeriod ?? 15}m • {activeDaysCount} Days/wk
                  </p>
                </td>

                {/* Reporting Manager */}
                <td className="p-4 text-xs text-slate-300">
                  {emp.manager ? (
                    <span className="text-indigo-400 font-medium">
                      {emp.manager.firstName} {emp.manager.lastName}
                    </span>
                  ) : (
                    <span className="text-slate-500">Direct to CEO</span>
                  )}
                </td>

                {/* Status */}
                <td className="p-4">
                  <StatusBadge
                    status={emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                    label={emp.isActive ? 'Active' : 'Relieved'}
                  />
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen360(emp.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold transition border border-indigo-500/30"
                    >
                      360° View
                    </button>
                    {canEditSchedule && (
                      <>
                        <button
                          onClick={(e) => handleOpenEdit(emp, e)}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                        >
                          Edit
                        </button>

                        {emp.isActive ? (
                          <button
                            onClick={(e) => handleOpenOffboard(emp, e)}
                            className="p-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition border border-rose-500/20"
                            title="Relieve / Offboard Employee (Type-to-Confirm)"
                          >
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleReactivate(emp, e)}
                            className="p-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition border border-emerald-500/20"
                            title="Reactivate Staff"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      {/* Add Employee Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Employee" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name">
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inputClassName}
                required
              />
            </FormField>
            <FormField label="Last Name">
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Username">
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={inputClassName}
                required
              />
            </FormField>
            <FormField label="Email Address">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClassName}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Password">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClassName}
                required
              />
            </FormField>
            <FormField label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputClassName}
              >
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="HR">HR</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ACCOUNTS">ACCOUNTS</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Employee Code">
              <input
                type="text"
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                className={inputClassName}
                placeholder="MI-1001"
              />
            </FormField>
            <FormField label="Department">
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputClassName}
                placeholder="Engineering"
              />
            </FormField>
            <FormField label="Designation">
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className={inputClassName}
                placeholder="Software Engineer"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Reporting Manager">
              <select
                value={form.managerId}
                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                className={inputClassName}
              >
                <option value="">-- Direct to CEO / None --</option>
                {employees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.designation || m.role})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Shift Schedule Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <p className="font-bold text-white uppercase text-[11px] text-blue-400">
              Shift Timings & Workdays (Admin/HR Only)
            </p>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Entry Time (Shift Start)">
                <input
                  type="time"
                  value={form.shiftStartTime}
                  onChange={(e) => setForm({ ...form, shiftStartTime: e.target.value })}
                  className={inputClassName}
                  disabled={!canEditSchedule}
                />
              </FormField>

              <FormField label="Exit Time (Shift End)">
                <input
                  type="time"
                  value={form.shiftEndTime}
                  onChange={(e) => setForm({ ...form, shiftEndTime: e.target.value })}
                  className={inputClassName}
                  disabled={!canEditSchedule}
                />
              </FormField>

              <FormField label="Grace Period (Mins)">
                <input
                  type="number"
                  value={form.lateGracePeriod}
                  onChange={(e) => setForm({ ...form, lateGracePeriod: e.target.value })}
                  className={inputClassName}
                  disabled={!canEditSchedule}
                />
              </FormField>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                Scheduled Workdays
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_WEEKDAYS.map((day) => {
                  const active = form.workDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => canEditSchedule && toggleWorkDay(day)}
                      disabled={!canEditSchedule}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition border ${
                        active
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <ModalFooter onClose={() => setModalOpen(false)} submitLabel="Create Employee" />
        </form>
      </Modal>

      {/* Edit Employee Schedule Modal */}
      {selectedEmp && (
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Employee Schedule: ${selectedEmp.firstName} ${selectedEmp.lastName}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Designation">
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Department">
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Employee Code">
                <input
                  type="text"
                  value={form.employeeCode}
                  onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Reporting Manager">
                <select
                  value={form.managerId}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                  className={inputClassName}
                >
                  <option value="">-- Direct to CEO / None --</option>
                  {employees
                    .filter((e) => e.id !== selectedEmp.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.designation || m.role})
                      </option>
                    ))}
                </select>
              </FormField>
            </div>

            {/* Shift Schedule Section */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <p className="font-bold text-white uppercase text-[11px] text-blue-400">
                Shift Timings & Workdays (Restricted Controls)
              </p>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Entry Time (Shift Start)">
                  <input
                    type="time"
                    value={form.shiftStartTime}
                    onChange={(e) => setForm({ ...form, shiftStartTime: e.target.value })}
                    className={inputClassName}
                    disabled={!canEditSchedule}
                  />
                </FormField>

                <FormField label="Exit Time (Shift End)">
                  <input
                    type="time"
                    value={form.shiftEndTime}
                    onChange={(e) => setForm({ ...form, shiftEndTime: e.target.value })}
                    className={inputClassName}
                    disabled={!canEditSchedule}
                  />
                </FormField>

                <FormField label="Grace Period (Mins)">
                  <input
                    type="number"
                    value={form.lateGracePeriod}
                    onChange={(e) => setForm({ ...form, lateGracePeriod: e.target.value })}
                    className={inputClassName}
                    disabled={!canEditSchedule}
                  />
                </FormField>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Scheduled Workdays
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_WEEKDAYS.map((day) => {
                    const active = form.workDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => canEditSchedule && toggleWorkDay(day)}
                        disabled={!canEditSchedule}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition border ${
                          active
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <ModalFooter onClose={() => setEditModalOpen(false)} submitLabel="Save Employee Schedule" />
          </form>
        </Modal>
      )}

      {/* 360 Profile Drawer */}
      <EmployeeProfileDrawer
        userId={profileDrawerUserId}
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        onUpdated={fetchEmployees}
      />

      {/* Employee Offboarding & Relieving Modal */}
      <EmployeeOffboardModal
        isOpen={offboardModalOpen}
        onClose={() => setOffboardModalOpen(false)}
        employee={offboardTargetEmp}
        onSuccess={fetchEmployees}
        managers={employees}
      />
    </div>
  );
}
