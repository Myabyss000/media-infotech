'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Bell, LogOut, User, Search, Shield, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    fetchUpcomingHolidaysCount();
  }, []);

  const fetchUpcomingHolidaysCount = async () => {
    try {
      const res = await api.get('/api/holidays/upcoming');
      setUpcomingCount(res.data?.length || 0);
    } catch (e) {
      // Ignore if unauthenticated
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Search Input */}
      <div className="relative w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search employees, clients, tickets..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Internal Chat Icon */}
        <Link
          href="/chat"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition group"
          title="Internal Team Chat"
        >
          <MessageSquare size={20} className="group-hover:text-emerald-400 transition" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </Link>

        {/* Holiday Calendar Icon Button */}
        <Link
          href="/hr/holidays"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition group"
          title="Holiday Calendar"
        >
          <CalendarIcon size={20} className="group-hover:text-blue-400 transition" />
          {upcomingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[9px] flex items-center justify-center border border-slate-900">
              {upcomingCount}
            </span>
          )}
        </Link>

        {/* Notification Bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user?.firstName?.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-white leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{user?.designation || user?.role}</p>
            </div>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-bold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1 inline-flex items-center space-x-1 text-[10px] text-blue-400 font-mono">
                  <Shield size={10} />
                  <span>{user?.role}</span>
                </div>
              </div>

              <Link
                href="/settings"
                className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <User size={14} />
                <span>My Profile & Settings</span>
              </Link>

              <button
                onClick={logout}
                className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition text-left"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
