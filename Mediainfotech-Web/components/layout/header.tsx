'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Bell, LogOut, User, Search, Shield, Calendar as CalendarIcon, MessageSquare, Sun, Moon } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { NotificationDropdown } from './NotificationDropdown';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <header className="h-16 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      {/* Search Input */}
      <div className="relative w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search employees, clients, tickets..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-200 dark:text-slate-200 light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-3">
        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-amber-400 dark:hover:text-amber-400 light:text-slate-600 light:hover:text-amber-500 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-amber-400 animate-in spin-in-90 duration-300" />
          ) : (
            <Moon size={20} className="text-indigo-600 animate-in spin-in-90 duration-300" />
          )}
        </button>

        {/* Internal Chat Icon */}
        <Link
          href="/chat"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white dark:hover:text-white light:text-slate-600 light:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition group"
          title="Internal Team Chat"
        >
          <MessageSquare size={20} className="group-hover:text-emerald-400 transition" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </Link>

        {/* Holiday Calendar Icon Button */}
        <Link
          href="/hr/holidays"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white dark:hover:text-white light:text-slate-600 light:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition group"
          title="Holiday Calendar"
        >
          <CalendarIcon size={20} className="group-hover:text-blue-400 transition" />
          {upcomingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[9px] flex items-center justify-center border border-slate-900">
              {upcomingCount}
            </span>
          )}
        </Link>

        {/* Real-time Categorized Notification Dropdown */}
        <NotificationDropdown />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {user?.firstName?.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-white dark:text-white light:text-slate-900 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono">{user?.designation || user?.role}</p>
            </div>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
                <p className="text-xs font-bold text-white dark:text-white light:text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1 inline-flex items-center space-x-1 text-[10px] text-blue-400 font-mono">
                  <Shield size={10} />
                  <span>{user?.role}</span>
                </div>
              </div>

              <Link
                href="/settings"
                className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition"
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
