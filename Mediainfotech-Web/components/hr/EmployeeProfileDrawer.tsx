'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import {
  X,
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  Calendar,
  Clock,
  Shield,
  FileText,
  CheckSquare,
  DollarSign,
  CreditCard,
  HeartHandshake,
  MapPin,
  Upload,
  Trash2,
  Edit3,
  Save,
  Plus,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Camera,
  UserX,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EmployeeOffboardModal } from '@/components/hr/EmployeeOffboardModal';

interface EmployeeProfileDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function EmployeeProfileDrawer({
  userId,
  isOpen,
  onClose,
  onUpdated,
}: EmployeeProfileDrawerProps) {
  const { user: authUser, hasRole } = useAuth();
  const isHRorAdmin = hasRole('ADMIN', 'HR', 'MANAGER');

  const [activeTab, setActiveTab] = useState<
    'overview' | 'personal' | 'bank' | 'documents' | 'onboarding' | 'leaves'
  >('overview');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState<any>({});

  // Avatar Upload State
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Document Upload State
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('OTHER');
  const [docUrl, setDocUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

  // Onboarding Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('HR_ORIENTATION');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Manager List for dropdown
  const [allManagers, setAllManagers] = useState<any[]>([]);
  const [offboardModalOpen, setOffboardModalOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
      fetchManagers();
    } else {
      setProfile(null);
      setEditing(false);
      setOffboardModalOpen(false);
    }
  }, [isOpen, userId]);

  const handleReactivate = async () => {
    if (!profile?.id) return;
    try {
      setReactivating(true);
      const res = await api.post(`/api/users/${profile.id}/reactivate`);
      alert(res.data.message || 'Employee reactivated successfully!');
      fetchProfile();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reactivate employee');
    } finally {
      setReactivating(false);
    }
  };

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/users/${userId}/profile`);
      const data = res.data.data;
      setProfile(data);
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        avatar: data.avatar || '',
        designation: data.designation || '',
        department: data.department || '',
        employeeCode: data.employeeCode || '',
        gender: data.gender || '',
        dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
        maritalStatus: data.maritalStatus || '',
        bloodGroup: data.bloodGroup || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactRelation: data.emergencyContactRelation || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        panNumber: data.panNumber || '',
        aadhaarNumber: data.aadhaarNumber || '',
        bankName: data.bankName || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankIfsc: data.bankIfsc || '',
        bankBranch: data.bankBranch || '',
        employmentType: data.employmentType || 'FULL_TIME',
        probationPeriodMonths: data.probationPeriodMonths || 3,
        joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString().split('T')[0] : '',
        confirmationDate: data.confirmationDate ? new Date(data.confirmationDate).toISOString().split('T')[0] : '',
        ctcAnnual: data.ctcAnnual || '',
        managerId: data.managerId || '',
        shiftStartTime: data.shiftStartTime || '09:30',
        shiftEndTime: data.shiftEndTime || '18:30',
        workDays: data.workDays || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
        lateGracePeriod: data.lateGracePeriod || 15,
      });
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/api/users?limit=100');
      const list = res.data.data || [];
      setAllManagers(list.filter((u: any) => u.id !== userId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    try {
      setSaving(true);
      await api.put(`/api/users/${userId}/profile`, form);
      setEditing(false);
      fetchProfile();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');

      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const avatarUrl = res.data.url;
      await api.put(`/api/users/${userId}/profile`, { avatar: avatarUrl });
      fetchProfile();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!docTitle && !selectedDocFile && !docUrl) {
      alert('Please provide a document title and file or link');
      return;
    }

    try {
      setUploadingDoc(true);
      if (selectedDocFile) {
        const formData = new FormData();
        formData.append('file', selectedDocFile);
        formData.append('title', docTitle || selectedDocFile.name.replace(/\.[^/.]+$/, ''));
        formData.append('type', docType);
        formData.append('fileSize', `${Math.round(selectedDocFile.size / 1024)} KB`);

        await api.post(`/api/users/${userId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (docUrl) {
        await api.post(`/api/users/${userId}/documents`, {
          title: docTitle,
          type: docType,
          fileUrl: docUrl,
        });
      } else {
        alert('Please choose a file or specify a link');
        return;
      }

      setDocTitle('');
      setDocUrl('');
      setSelectedDocFile(null);
      setShowDocModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await api.delete(`/api/users/documents/${docId}`);
      fetchProfile();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTaskTitle) return;
    try {
      setAddingTask(true);
      await api.post(`/api/users/${userId}/onboarding`, {
        title: newTaskTitle,
        category: newTaskCategory,
        dueDate: newTaskDueDate || undefined,
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setShowTaskModal(false);
      fetchProfile();
    } catch (err) {
      alert('Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/users/onboarding/${taskId}`, {
        isCompleted: !currentStatus,
      });
      fetchProfile();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/api/users/onboarding/${taskId}`);
      fetchProfile();
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  if (!isOpen) return null;

  const completedTasks = profile?.onboardingTasks?.filter((t: any) => t.isCompleted)?.length || 0;
  const totalTasks = profile?.onboardingTasks?.length || 0;
  const onboardingProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading employee profile...</div>
          ) : profile ? (
            <div className="flex items-center gap-4">
              <div className="relative group/avatar">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-indigo-400/30 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-600/30 flex-shrink-0 overflow-hidden">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.firstName}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`
                  )}
                </div>
                {isHRorAdmin && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border-2 border-slate-900 transition"
                      title="Upload profile picture"
                    >
                      {uploadingAvatar ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={11} />
                      )}
                    </button>
                  </>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-xs">
                    {profile.role}
                  </Badge>
                  {profile.employeeCode && (
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {profile.employeeCode}
                    </Badge>
                  )}
                  <Badge
                    variant={profile.isActive ? 'success' : 'destructive'}
                    className="text-[10px]"
                  >
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{profile.designation || 'Staff Member'}</span>
                  {profile.department && <span>• {profile.department}</span>}
                  <span>• {profile.email}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">No profile data</div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {isHRorAdmin && profile && !editing && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs gap-1.5"
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </Button>

                {profile.isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOffboardModalOpen(true)}
                    className="bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs gap-1.5"
                    title="Relieve or Archive Employee"
                  >
                    <UserX size={14} />
                    <span>Relieve / Offboard</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs gap-1.5"
                    title="Restore active access for this employee"
                  >
                    <RotateCcw size={14} className={reactivating ? 'animate-spin' : ''} />
                    <span>{reactivating ? 'Restoring...' : 'Reactivate Staff'}</span>
                  </Button>
                )}
              </>
            )}
            {editing && (
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-xs gap-1.5 text-white"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
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
        <div className="px-6 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Job', icon: Briefcase },
            { id: 'personal', label: 'Personal & Emergency', icon: User },
            { id: 'bank', label: 'Bank & Statutory', icon: CreditCard },
            { id: 'documents', label: `Documents (${profile?.documents?.length || 0})`, icon: FileText },
            { id: 'onboarding', label: `Onboarding (${completedTasks}/${totalTasks})`, icon: CheckSquare },
            { id: 'leaves', label: 'Leave Quotas', icon: Calendar },
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
              Loading 360° dossier...
            </div>
          ) : !profile ? (
            <div className="text-center py-20 text-slate-500 text-sm">Profile not found.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & JOB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Archived / Relieved Compliance Banner */}
                  {!profile.isActive && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 flex-shrink-0 mt-0.5">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-300">
                            Employee Status: Relieved & Archived
                          </span>
                          {profile.exitDate && (
                            <Badge variant="outline" className="text-[10px] bg-slate-950 border-amber-500/40 text-amber-200">
                              Exit Date: {formatDate(profile.exitDate)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300">
                          This employee is offboarded and login access is disabled. In compliance with Statutory Labor Laws and Tax Regulations (IT Act / EPFO), all personal identity records, PAN, bank credentials, historical payslips, and attendance logs are securely preserved in the vault.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Employment Type</div>
                      <div className="text-sm font-bold text-white mt-1 capitalize">
                        {profile.employmentType?.replace('_', ' ') || 'Full Time'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Joining Date</div>
                      <div className="text-sm font-bold text-white mt-1">
                        {profile.joiningDate ? formatDate(profile.joiningDate) : 'Not specified'}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <div className="text-xs text-slate-400">Reporting Manager</div>
                      <div className="text-sm font-bold text-indigo-400 mt-1">
                        {profile.manager ? `${profile.manager.firstName} ${profile.manager.lastName}` : 'Direct to CEO / None'}
                      </div>
                    </div>
                  </div>

                  {/* Form or Details */}
                  {editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Employee Code</label>
                        <input
                          type="text"
                          value={form.employeeCode}
                          onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. MI-1001"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Department</label>
                        <input
                          type="text"
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. Engineering, Sales"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Designation</label>
                        <input
                          type="text"
                          value={form.designation}
                          onChange={(e) => setForm({ ...form, designation: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. Senior Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Reporting Manager</label>
                        <select
                          value={form.managerId}
                          onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        >
                          <option value="">-- No Manager (Top Level) --</option>
                          {allManagers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.firstName} {m.lastName} ({m.designation || m.role})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Employment Type</label>
                        <select
                          value={form.employmentType}
                          onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        >
                          <option value="FULL_TIME">Full Time</option>
                          <option value="PART_TIME">Part Time</option>
                          <option value="CONTRACT">Contract</option>
                          <option value="INTERN">Intern</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Annual CTC (₹)</label>
                        <input
                          type="number"
                          value={form.ctcAnnual}
                          onChange={(e) => setForm({ ...form, ctcAnnual: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. 600000"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Joining Date</label>
                        <input
                          type="date"
                          value={form.joiningDate}
                          onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Confirmation Date</label>
                        <input
                          type="date"
                          value={form.confirmationDate}
                          onChange={(e) => setForm({ ...form, confirmationDate: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Shift Timings (Start - End)</label>
                        <div className="flex gap-2 mt-1.5">
                          <input
                            type="time"
                            value={form.shiftStartTime}
                            onChange={(e) => setForm({ ...form, shiftStartTime: e.target.value })}
                            className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                          <input
                            type="time"
                            value={form.shiftEndTime}
                            onChange={(e) => setForm({ ...form, shiftEndTime: e.target.value })}
                            className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Late Grace Period (Mins)</label>
                        <input
                          type="number"
                          value={form.lateGracePeriod}
                          onChange={(e) => setForm({ ...form, lateGracePeriod: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Work Schedule & Shift Configuration
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Shift Timing:</span>
                            <span className="font-semibold text-white">
                              {profile.shiftStartTime || '09:30'} - {profile.shiftEndTime || '18:30'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Late Grace:</span>
                            <span className="font-semibold text-white">
                              {profile.lateGracePeriod || 15} mins
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Work Days:</span>
                            <span className="font-semibold text-white">
                              {profile.workDays ? profile.workDays.split(',').length : 6} Days/Week
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Annual CTC:</span>
                            <span className="font-semibold text-emerald-400">
                              {profile.ctcAnnual ? formatCurrency(profile.ctcAnnual) : 'Not configured'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Reports */}
                      {profile.directReports && profile.directReports.length > 0 && (
                        <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                            <span>Direct Reports ({profile.directReports.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {profile.directReports.map((dr: any) => (
                              <div
                                key={dr.id}
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-white">
                                    {dr.firstName} {dr.lastName}
                                  </div>
                                  <div className="text-slate-400 text-[11px]">
                                    {dr.designation || dr.department || 'Employee'}
                                  </div>
                                </div>
                                <span className="text-slate-500 text-[11px]">{dr.email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PERSONAL & EMERGENCY */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  {editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Gender</label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Date of Birth</label>
                        <input
                          type="date"
                          value={form.dob}
                          onChange={(e) => setForm({ ...form, dob: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Blood Group</label>
                        <input
                          type="text"
                          value={form.bloodGroup}
                          onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. O+, A+, B+"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Marital Status</label>
                        <select
                          value={form.maritalStatus}
                          onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        >
                          <option value="">Select Status</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-400">Address</label>
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="Street address, Apartment / House No."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">City</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">State & Postal Code</label>
                        <div className="flex gap-2 mt-1.5">
                          <input
                            type="text"
                            value={form.state}
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                            className="w-1/2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                            placeholder="State"
                          />
                          <input
                            type="text"
                            value={form.postalCode}
                            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                            className="w-1/2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                            placeholder="PIN Code"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-amber-400 mb-2">Emergency Contact</h4>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Contact Person Name</label>
                        <input
                          type="text"
                          value={form.emergencyContactName}
                          onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. Spouse / Parent name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Relation & Phone</label>
                        <div className="flex gap-2 mt-1.5">
                          <input
                            type="text"
                            value={form.emergencyContactRelation}
                            onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
                            className="w-1/2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                            placeholder="Relation (e.g. Mother)"
                          />
                          <input
                            type="text"
                            value={form.emergencyContactPhone}
                            onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                            className="w-1/2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                            placeholder="Phone Number"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Personal Information
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Date of Birth:</span>
                            <span className="font-semibold text-white">
                              {profile.dob ? formatDate(profile.dob) : 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Gender:</span>
                            <span className="font-semibold text-white">{profile.gender || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Blood Group:</span>
                            <span className="font-semibold text-white">{profile.bloodGroup || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Marital Status:</span>
                            <span className="font-semibold text-white">{profile.maritalStatus || 'Not specified'}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 text-xs">
                          <span className="text-slate-500 block">Address:</span>
                          <span className="font-semibold text-white">
                            {profile.address || 'Address not added'}
                            {profile.city && `, ${profile.city}`}
                            {profile.state && `, ${profile.state}`}
                            {profile.postalCode && ` - ${profile.postalCode}`}
                          </span>
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <AlertCircle size={14} />
                          <span>Emergency Contact</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Contact Name:</span>
                            <span className="font-semibold text-white">
                              {profile.emergencyContactName || 'None listed'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Relationship:</span>
                            <span className="font-semibold text-white">
                              {profile.emergencyContactRelation || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Emergency Phone:</span>
                            <span className="font-semibold text-amber-400">
                              {profile.emergencyContactPhone || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BANK & STATUTORY */}
              {activeTab === 'bank' && (
                <div className="space-y-6">
                  {editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-400">PAN Number</label>
                        <input
                          type="text"
                          value={form.panNumber}
                          onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                          placeholder="ABCDE1234F"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Aadhaar Number</label>
                        <input
                          type="text"
                          value={form.aadhaarNumber}
                          onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                          placeholder="XXXX XXXX XXXX"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Bank Name</label>
                        <input
                          type="text"
                          value={form.bankName}
                          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="e.g. HDFC Bank, ICICI Bank"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Account Number</label>
                        <input
                          type="text"
                          value={form.bankAccountNumber}
                          onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                          placeholder="Account No."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">IFSC Code</label>
                        <input
                          type="text"
                          value={form.bankIfsc}
                          onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                          placeholder="HDFC0001234"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Branch Name</label>
                        <input
                          type="text"
                          value={form.bankBranch}
                          onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                          placeholder="Branch City / Area"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          Statutory Tax Identification
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">PAN Number:</span>
                            <span className="font-mono font-bold text-white">
                              {profile.panNumber || 'Not submitted'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Aadhaar Number:</span>
                            <span className="font-mono font-bold text-white">
                              {profile.aadhaarNumber
                                ? `${profile.aadhaarNumber.slice(0, 4)} XXXX ${profile.aadhaarNumber.slice(-4)}`
                                : 'Not submitted'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                          Direct Salary Bank Account
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Bank Name:</span>
                            <span className="font-semibold text-white">{profile.bankName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Account Number:</span>
                            <span className="font-mono font-semibold text-white">
                              {profile.bankAccountNumber || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">IFSC Code:</span>
                            <span className="font-mono font-semibold text-white">
                              {profile.bankIfsc || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Branch:</span>
                            <span className="font-semibold text-white">{profile.bankBranch || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DOCUMENT VAULT */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Employee Document Vault</h3>
                      <p className="text-xs text-slate-400">
                        Securely store signed contracts, offer letters, academic certificates, and IDs.
                      </p>
                    </div>
                    {isHRorAdmin && (
                      <Button
                        size="sm"
                        onClick={() => setShowDocModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-xs text-white gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Upload Document</span>
                      </Button>
                    )}
                  </div>

                  {profile.documents?.length === 0 ? (
                    <div className="p-10 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              <FileText size={18} />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-white">{doc.title}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">
                                  {doc.type}
                                </Badge>
                                <span className="text-[10px] text-slate-500">
                                  {formatDate(doc.uploadedAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition"
                              title="Open Document"
                            >
                              <ExternalLink size={14} />
                            </a>
                            {isHRorAdmin && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                                title="Delete Document"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Document Modal */}
                  {showDocModal && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">Add Document to Vault</h4>
                          <button onClick={() => { setShowDocModal(false); setSelectedDocFile(null); }} className="text-slate-400 hover:text-white">
                            <X size={18} />
                          </button>
                        </div>
                        <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
                          <div>
                            <label className="text-slate-400 font-semibold">Select File from Device</label>
                            <div
                              onClick={() => docFileInputRef.current?.click()}
                              className="mt-1.5 p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center hover:border-indigo-500 transition cursor-pointer"
                            >
                              <input
                                ref={docFileInputRef}
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setSelectedDocFile(file);
                                    if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                                  }
                                }}
                                className="hidden"
                              />
                              <Upload size={22} className="text-indigo-400 mb-2" />
                              {selectedDocFile ? (
                                <div>
                                  <p className="font-bold text-white text-xs">{selectedDocFile.name}</p>
                                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                    {Math.round(selectedDocFile.size / 1024)} KB
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-semibold text-slate-300">Click to choose PDF, Image, or DOC</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Supports PDF, JPG, PNG, DOCX up to 50MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-slate-400 font-semibold">Document Title</label>
                            <input
                              type="text"
                              value={docTitle}
                              onChange={(e) => setDocTitle(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                              placeholder="e.g. Signed Offer Letter, PAN Copy, Aadhaar"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-semibold">Document Type</label>
                            <select
                              value={docType}
                              onChange={(e) => setDocType(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                            >
                              <option value="OFFER_LETTER">Offer Letter</option>
                              <option value="ID_PROOF">Government ID Proof</option>
                              <option value="ACADEMIC">Academic Certificate</option>
                              <option value="EXPERIENCE">Experience / Relieving</option>
                              <option value="CONTRACT">Contract / Agreement</option>
                              <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-slate-400 font-semibold">Or File URL / Storage Link (Optional)</label>
                            <input
                              type="url"
                              value={docUrl}
                              onChange={(e) => setDocUrl(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                              placeholder="https://drive.google.com/... or cloud storage URL"
                            />
                          </div>

                          <div className="pt-2 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => { setShowDocModal(false); setSelectedDocFile(null); }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={uploadingDoc}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                            >
                              {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ONBOARDING CHECKLIST */}
              {activeTab === 'onboarding' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Onboarding & Induction Progress
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {completedTasks} of {totalTasks} tasks completed ({onboardingProgress}%)
                      </p>
                    </div>
                    <div className="w-full sm:w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${onboardingProgress}%` }}
                      />
                    </div>
                    {isHRorAdmin && (
                      <Button
                        size="sm"
                        onClick={() => setShowTaskModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white gap-1"
                      >
                        <Plus size={14} />
                        <span>Add Task</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {profile.onboardingTasks?.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        No onboarding tasks created yet.
                      </div>
                    ) : (
                      profile.onboardingTasks?.map((t: any) => (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                            t.isCompleted
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={t.isCompleted}
                              onChange={() => handleToggleTask(t.id, t.isCompleted)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 cursor-pointer"
                            />
                            <div>
                              <div
                                className={`text-xs font-bold ${
                                  t.isCompleted ? 'line-through text-slate-500' : 'text-white'
                                }`}
                              >
                                {t.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] bg-slate-800 text-slate-400">
                                  {t.category}
                                </Badge>
                                {t.dueDate && (
                                  <span className="text-[10px] text-slate-500">
                                    Due: {formatDate(t.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isHRorAdmin && (
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Task Modal */}
                  {showTaskModal && (
                    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">Add Onboarding / Exit Task</h4>
                          <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-white">
                            <X size={18} />
                          </button>
                        </div>
                        <form onSubmit={handleAddTask} className="space-y-3 text-xs">
                          <div>
                            <label className="text-slate-400 font-semibold">Task Title</label>
                            <input
                              type="text"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                              placeholder="e.g. Issue ID Card, Software Credentials"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 font-semibold">Category</label>
                            <select
                              value={newTaskCategory}
                              onChange={(e) => setNewTaskCategory(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                            >
                              <option value="IT_SETUP">IT & Hardware Setup</option>
                              <option value="DOCUMENTATION">Documentation & KYC</option>
                              <option value="HR_ORIENTATION">HR Orientation & Briefing</option>
                              <option value="TRAINING">Role Training</option>
                              <option value="OFFBOARDING">Exit Clearance</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-slate-400 font-semibold">Due Date (Optional)</label>
                            <input
                              type="date"
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                            />
                          </div>
                          <div className="pt-2 flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowTaskModal(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={addingTask} className="bg-indigo-600 text-white">
                              {addingTask ? 'Adding...' : 'Create Task'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: LEAVE QUOTAS */}
              {activeTab === 'leaves' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Annual Leave Quotas & Utilization ({new Date().getFullYear()})
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Allocated annual balance wallet and current remaining days.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {profile.leaveBalances?.map((b: any) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{b.type} LEAVE</span>
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                            {b.remaining} Days Left
                          </Badge>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((b.used / (b.total || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Used: {b.used} days</span>
                          <span>Total Quota: {b.total} days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Employee Offboarding & Relieving Modal */}
      <EmployeeOffboardModal
        isOpen={offboardModalOpen}
        onClose={() => setOffboardModalOpen(false)}
        employee={profile}
        onSuccess={() => {
          fetchProfile();
          if (onUpdated) onUpdated();
        }}
        managers={allManagers}
      />
    </div>
  );
}
