'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { User, Shield, Building, Mail } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'NetTech Solutions';
  const companyTagline = process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Internal Operations System';

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">System Settings & User Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your account details and view system settings.</p>
      </div>

      {/* User Profile Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/20">
            {user?.firstName?.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-slate-400">@{user?.username}</p>
            <div className="mt-1 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold uppercase border border-blue-500/20">
              <Shield size={12} />
              <span>{user?.role}</span>
            </div>
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
              {user?.department || 'Operations'} — {user?.designation || 'Staff'}
            </p>
          </div>
        </div>
      </div>

      {/* System Environment Branding Settings */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Building size={18} className="text-blue-400" />
          <span>System Environment Branding</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <p className="text-slate-500 font-semibold uppercase text-[10px]">Configured Company Name</p>
            <p className="text-white font-bold mt-1">{companyName}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <p className="text-slate-500 font-semibold uppercase text-[10px]">Configured Tagline</p>
            <p className="text-white mt-1">{companyTagline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
