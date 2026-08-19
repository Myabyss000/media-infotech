'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import {
  User,
  Shield,
  Building,
  Mail,
  Phone,
  Globe,
  FileText,
  Save,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  Lock,
  Clock,
  Bell,
  Headphones,
  KeyRound,
  MapPin,
  Laptop,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type SettingsTab = 'company' | 'profile' | 'security' | 'shifts' | 'notifications' | 'support';

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  const canManageCompany = hasRole('ADMIN', 'HR', 'MANAGER');
  const isAdmin = hasRole('ADMIN');

  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  // 1. Company Profile State
  const [companyForm, setCompanyForm] = useState({
    name: 'Media Infotech Private Limited',
    tagline: 'Enterprise IT Solutions, Software Engineering & Cloud Infrastructure',
    address: 'Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091',
    cin: 'U72200WB2020PTC239871',
    gstin: '19AAECM4920M1Z8',
    email: 'hr@mediainfotech.com',
    website: 'www.mediainfotech.com',
    phone: '+91 33 4000 1234',
    logoUrl: '/Icon.png',
    authorizedSigner: 'Authorized Signatory / HR & Accounts Dept.',
  });

  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [saveCompanySuccess, setSaveCompanySuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Personal Profile State
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: (user as any)?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);

  // 3. Security & Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 4. Shift & Attendance Settings State
  const [attendanceSettings, setAttendanceSettings] = useState({
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    graceMinutes: 15,
    halfDayThresholdHours: 4,
    geofenceRadius: 200,
    geofenceMode: 'RADIUS',
    officeLat: 22.5804,
    officeLng: 88.4378,
  });
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveAttendanceSuccess, setSaveAttendanceSuccess] = useState(false);

  // 5. Sound & Notifications Preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const [ticketSound, setTicketSound] = useState(true);
  const [prefSaved, setPrefSaved] = useState(false);

  // 6. Helpdesk & Support Contacts
  const [supportContacts, setSupportContacts] = useState({
    helpdeskEmail: 'support@mediainfotech.com',
    dispatchHotline: '+91 33 4000 9999',
    inventoryStorePhone: '+91 33 4000 8888',
    hrEmergencyContact: '+91 98300 12345',
  });

  useEffect(() => {
    fetchCompanySettings();
    if (canManageCompany) {
      fetchAttendanceSettings();
    }
    // Load local notification preferences
    const savedSound = localStorage.getItem('sound_enabled');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: (user as any)?.phone || '',
      });
    }
  }, [user]);

  const fetchCompanySettings = async () => {
    try {
      setLoadingCompany(true);
      const res = await api.get('/api/company');
      if (res.data?.data) {
        setCompanyForm((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (e) {
      console.error('Failed to fetch company settings:', e);
    } finally {
      setLoadingCompany(false);
    }
  };

  const fetchAttendanceSettings = async () => {
    try {
      setLoadingAttendance(true);
      const res = await api.get('/api/attendance/settings');
      if (res.data?.data) {
        setAttendanceSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (e) {
      console.error('Failed to fetch attendance settings:', e);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCompany) return;
    try {
      setSavingCompany(true);
      setSaveCompanySuccess(false);
      await api.put('/api/company', companyForm);
      setSaveCompanySuccess(true);
      setTimeout(() => setSaveCompanySuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update company settings');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');

      const res = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newLogoUrl = res.data.fileUrl || res.data.url;
      setCompanyForm((prev) => ({ ...prev, logoUrl: newLogoUrl }));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload company logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      await api.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveAttendanceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCompany) return;
    try {
      setSavingAttendance(true);
      setSaveAttendanceSuccess(false);
      await api.put('/api/attendance/settings', attendanceSettings);
      setSaveAttendanceSuccess(true);
      setTimeout(() => setSaveAttendanceSuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update shift settings');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveNotificationPrefs = () => {
    localStorage.setItem('sound_enabled', String(soundEnabled));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your organization profile, personal credentials, shift timings, and system preferences.
        </p>
      </div>

      {/* Minimalist Segment Tabs (Non-Cockpit, Clean & Responsive) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-800/80">
        {[
          { id: 'company', label: 'Company & Branding', icon: Building, show: true },
          { id: 'profile', label: 'My Account', icon: User, show: true },
          { id: 'security', label: 'Security & Password', icon: Shield, show: true },
          { id: 'shifts', label: 'Work Timings & Geofence', icon: Clock, show: canManageCompany },
          { id: 'notifications', label: 'Alerts & Sounds', icon: Bell, show: true },
          { id: 'support', label: 'Helpdesk & Hotlines', icon: Headphones, show: true },
        ]
          .filter((t) => t.show)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* TAB 1: COMPANY PROFILE & BRANDING */}
      {activeTab === 'company' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building size={18} className="text-indigo-400" />
                <span>Official Organization Profile</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                These statutory details appear automatically on all official Salary Slips, PDF exports, and HR letters.
              </p>
            </div>
            {canManageCompany && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCompanySettings}
                disabled={loadingCompany}
                className="text-xs text-slate-300 border-slate-800 hover:text-white"
              >
                <RefreshCw size={13} className={loadingCompany ? 'animate-spin mr-1' : 'mr-1'} />
                <span>Reload</span>
              </Button>
            )}
          </div>

          {saveCompanySuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Company settings saved successfully! Official prints will use this updated info.</span>
            </div>
          )}

          <form onSubmit={handleSaveCompany} className="space-y-5 text-xs">
            {/* Logo & Company Name */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="relative group/logo flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-700 flex items-center justify-center p-2 shadow-md overflow-hidden">
                  <img
                    src={companyForm.logoUrl || '/Icon.png'}
                    alt="Company Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/Icon.png';
                    }}
                  />
                </div>
                {canManageCompany && (
                  <>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border-2 border-slate-900 transition"
                      title="Upload Logo"
                    >
                      {uploadingLogo ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={12} />
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                    placeholder="e.g. Media Infotech Private Limited"
                    disabled={!canManageCompany}
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={companyForm.tagline}
                    onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300"
                    placeholder="e.g. Enterprise IT Solutions & Cloud Infrastructure"
                    disabled={!canManageCompany}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Registered Office Address *</label>
              <input
                type="text"
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                placeholder="Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091"
                disabled={!canManageCompany}
                required
              />
            </div>

            {/* Registration IDs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Corporate Identity Number (CIN)</label>
                <input
                  type="text"
                  value={companyForm.cin}
                  onChange={(e) => setCompanyForm({ ...companyForm, cin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  placeholder="U72200WB2020PTC239871"
                  disabled={!canManageCompany}
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={companyForm.gstin}
                  onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  placeholder="19AAECM4920M1Z8"
                  disabled={!canManageCompany}
                />
              </div>
            </div>

            {/* Contact & Web */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">HR / Payroll Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  placeholder="hr@mediainfotech.com"
                  disabled={!canManageCompany}
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Website URL</label>
                <input
                  type="text"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  placeholder="www.mediainfotech.com"
                  disabled={!canManageCompany}
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Corporate Phone</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  placeholder="+91 33 4000 1234"
                  disabled={!canManageCompany}
                />
              </div>
            </div>

            {/* Signatory */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Authorized Signatory Title (For Payslip Seal)</label>
              <input
                type="text"
                value={companyForm.authorizedSigner}
                onChange={(e) => setCompanyForm({ ...companyForm, authorizedSigner: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                placeholder="Authorized Signatory / HR & Accounts Dept."
                disabled={!canManageCompany}
              />
            </div>

            {canManageCompany && (
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingCompany}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Save size={14} />
                  <span>{savingCompany ? 'Saving...' : 'Save Organization Profile'}</span>
                </Button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: MY ACCOUNT & PROFILE */}
      {activeTab === 'profile' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20 border border-white/10">
              {user?.firstName?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {user?.firstName} {user?.lastName}
                </h2>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                  {user?.role}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">@{user?.username || 'user'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <p className="text-slate-500 font-semibold uppercase text-[10px] flex items-center space-x-1">
                <Mail size={12} />
                <span>Email Address</span>
              </p>
              <p className="text-white font-mono mt-1">{user?.email}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <p className="text-slate-500 font-semibold uppercase text-[10px] flex items-center space-x-1">
                <Building size={12} />
                <span>Department & Designation</span>
              </p>
              <p className="text-white mt-1">
                {user?.department || 'Operations'} — {user?.designation || 'Specialist'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock size={18} className="text-indigo-400" />
              <span>Change Account Password</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ensure your account is using a strong password to protect platform access and data.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Your password has been changed successfully!</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Current Password *</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">New Password *</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Confirm New Password *</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={changingPassword}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2"
              >
                <KeyRound size={14} />
                <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: WORK TIMINGS & GEOFENCE */}
      {activeTab === 'shifts' && canManageCompany && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-indigo-400" />
              <span>Default Shift & Attendance Rules</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set standard working hours, late-check-in grace limits, and headquarters geofence radius.
            </p>
          </div>

          {saveAttendanceSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Work shift and geofence rules updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveAttendanceSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Standard Shift Start Time</label>
                <input
                  type="time"
                  value={attendanceSettings.shiftStartTime}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, shiftStartTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Standard Shift End Time</label>
                <input
                  type="time"
                  value={attendanceSettings.shiftEndTime}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, shiftEndTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Late Check-In Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={attendanceSettings.graceMinutes}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, graceMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  min={0}
                  max={60}
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Geofence Radius (Meters from HQ)</label>
                <input
                  type="number"
                  value={attendanceSettings.geofenceRadius}
                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, geofenceRadius: parseInt(e.target.value, 10) || 100 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  min={50}
                  max={2000}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button
                type="submit"
                disabled={savingAttendance}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2"
              >
                <Save size={14} />
                <span>{savingAttendance ? 'Saving...' : 'Save Shift Settings'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: ALERTS & NOTIFICATIONS PREFERENCES */}
      {activeTab === 'notifications' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-indigo-400" />
              <span>Notification & Audio Preferences</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize real-time audio chimes and visual alert notifications across your session.
            </p>
          </div>

          {prefSaved && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Preferences saved for this device!</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <Volume2 size={14} className="text-indigo-400" />
                  <span>Real-Time Notification Audio Chime</span>
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Play an instant gentle chime sound when a critical breakdown ticket or urgent dispatch arrives.
                </p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <Laptop size={14} className="text-indigo-400" />
                  <span>In-App Activity Popover Alerts</span>
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Show top navbar badge updates instantly over WebSockets.
                </p>
              </div>
              <input
                type="checkbox"
                checked={desktopAlerts}
                onChange={(e) => setDesktopAlerts(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveNotificationPrefs}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2"
              >
                <Check size={14} />
                <span>Save Preferences</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HELPDESK & FIELD HOTLINES */}
      {activeTab === 'support' && (
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Headphones size={18} className="text-indigo-400" />
              <span>Internal Helpdesk & Field Support Contacts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Emergency contacts for field engineers, service van drivers, and operations dispatchers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">CCTV Breakdown Field Dispatch</p>
              <p className="text-white font-bold text-sm mt-1">{supportContacts.dispatchHotline}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">24/7 Hotline for Optical Fiber & Camera outages</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Central Store & Hardware Depot</p>
              <p className="text-white font-bold text-sm mt-1">{supportContacts.inventoryStorePhone}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Spare Transceivers, PoE Switches & NVR stock</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">HR & Payroll Helpdesk</p>
              <p className="text-white font-bold text-sm mt-1">{companyForm.email}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Salary queries, leave approvals & tax forms</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Field Emergency Coordinator</p>
              <p className="text-white font-bold text-sm mt-1">{supportContacts.hrEmergencyContact}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Urgent vehicle breakdowns & on-road support</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
