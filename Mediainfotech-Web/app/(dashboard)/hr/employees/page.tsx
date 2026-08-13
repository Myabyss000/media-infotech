'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Users, UserPlus, Search, Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { DataTable, EmptyRow } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FormField, inputClassName } from '@/components/ui/FormField';

export default function EmployeesPage() {
  const { hasPermission, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

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
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    lateGracePeriod: '15',
    workDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
  });

  const canEditSchedule =
    user?.role === 'ADMIN' ||
    user?.role === 'HR' ||
    hasPermission('users', 'update') ||
    hasPermission('hr', 'update');

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get(`/api/users?search=${search}`);
      setEmployees(res.data.data);
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
        shiftStartTime: '09:30',
        shiftEndTime: '18:30',
        lateGracePeriod: '15',
        workDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleOpenEdit = (emp: any) => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        subtitle="Manage company staff, designations, shift entry/exit timings, workdays, and access."
        action={
          hasPermission('users', 'create') ? (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-lg shadow-blue-500/20"
            >
              <UserPlus size={16} />
              <span>Add New Employee</span>
            </button>
          ) : undefined
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, username..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Employees Table */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading employee roster...</div>
      ) : (
        <DataTable headers={['Employee', 'Role & Designation', 'Shift Timings & Workdays', 'Contact', 'Status', 'Actions']}>
          {employees.length === 0 ? (
            <EmptyRow colSpan={6} message="No employees found." />
          ) : (
            employees.map((emp) => {
              const activeDaysCount = emp.workDays ? emp.workDays.split(',').filter(Boolean).length : 6;

              return (
                <tr key={emp.id} className="hover:bg-slate-800/40 transition">
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
                        <p className="text-[11px] text-slate-500 font-mono">@{emp.username}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role & Designation */}
                  <td className="p-4">
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono font-semibold uppercase border border-blue-500/20">
                      {emp.role}
                    </span>
                    <p className="text-slate-400 text-[11px] mt-1">{emp.designation || 'Staff'}</p>
                  </td>

                  {/* Shift Timings & Workdays */}
                  <td className="p-4 text-xs font-mono">
                    <p className="text-emerald-400 font-bold">
                      In: {emp.shiftStartTime || '09:30'} — Out: {emp.shiftEndTime || '18:30'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Grace: {emp.lateGracePeriod ?? 15}m • {activeDaysCount} Days/wk
                    </p>
                  </td>

                  {/* Contact */}
                  <td className="p-4 text-slate-300">
                    <p className="flex items-center space-x-1 text-xs">
                      <Mail size={12} className="text-slate-500 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </p>
                    {emp.phone && (
                      <p className="flex items-center space-x-1 text-slate-500 text-[11px] mt-0.5">
                        <Phone size={12} className="shrink-0" />
                        <span>{emp.phone}</span>
                      </p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <StatusBadge
                      status={emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                      label={emp.isActive ? 'Active' : 'Inactive'}
                    />
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    {canEditSchedule && (
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold transition border border-slate-700"
                      >
                        Edit Schedule
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      )}

      {/* Add Employee Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Employee"
        maxWidth="max-w-xl"
      >
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

          {/* Shift Schedule Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <p className="font-bold text-white uppercase text-[11px] text-blue-400">Shift Timings & Workdays (Admin/HR Only)</p>
            
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
              <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Scheduled Workdays</label>
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

          <ModalFooter
            onClose={() => setModalOpen(false)}
            submitLabel="Create Employee"
          />
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

            {/* Shift Schedule Section */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <p className="font-bold text-white uppercase text-[11px] text-blue-400">Shift Timings & Workdays (Restricted Controls)</p>
              
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
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Scheduled Workdays</label>
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

            <ModalFooter
              onClose={() => setEditModalOpen(false)}
              submitLabel="Save Employee Schedule"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
