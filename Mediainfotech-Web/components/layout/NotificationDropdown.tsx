'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/auth-context';
import {
  Bell,
  Ticket,
  FolderGit2,
  Package,
  MessageSquare,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Check,
  Trash2,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'TICKETS' | 'PROJECTS' | 'INVENTORY' | 'CHAT' | 'ATTENDANCE_HR' | 'SYSTEM';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<{
    totalUnread: number;
    urgentCount: number;
    countsByCategory: Record<string, number>;
  }>({
    totalUnread: 0,
    urgentCount: 0,
    countsByCategory: { ALL: 0, TICKETS: 0, PROJECTS: 0, INVENTORY: 0, CHAT: 0, ATTENDANCE_HR: 0, SYSTEM: 0 },
  });

  const [activeSegment, setActiveSegment] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Play synthesized web audio chime for zero-dependency high-speed audio alerts
  const playNotificationChime = (isUrgent = false) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isUrgent ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 880 : 587.33, now); // A5 or D5
      osc.frequency.exponentialRampToValueAtTime(isUrgent ? 440 : 880, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // Ignore audio failure
    }
  };

  const fetchNotificationStats = async () => {
    try {
      const res = await api.get('/api/notifications/stats');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      // Ignore if unauthenticated
    }
  };

  const fetchDropdownNotifications = async () => {
    try {
      const params: any = { limit: 8 };
      if (activeSegment !== 'ALL') params.category = activeSegment;
      const res = await api.get('/api/notifications', { params });
      setNotifications(res.data?.data || []);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch dropdown notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotificationStats();
    fetchDropdownNotifications();

    // Check sound preference from local storage
    const savedSound = localStorage.getItem('mediainfotech_notif_sound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDropdownNotifications();
    }
  }, [isOpen, activeSegment]);

  // Real-Time WebSocket Handlers
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data: { notification: NotificationItem; stats: any }) => {
      setNotifications((prev) => [data.notification, ...prev.filter((n) => n.id !== data.notification.id)].slice(0, 10));
      if (data.stats) {
        setStats(data.stats);
      }
      playNotificationChime(data.notification.priority === 'URGENT');
    };

    const handleStatsUpdated = (newStats: any) => {
      setStats(newStats);
    };

    const handleChime = (data: any) => {
      playNotificationChime(data.priority === 'URGENT');
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_stats_updated', handleStatsUpdated);
    socket.on('notification_chime', handleChime);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_stats_updated', handleStatsUpdated);
      socket.off('notification_chime', handleChime);
    };
  }, [soundEnabled]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('mediainfotech_notif_sound', String(next));
    if (next) playNotificationChime(false);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setStats((prev) => ({
        ...prev,
        totalUnread: Math.max(0, prev.totalUnread - 1),
      }));

      await api.put(`/api/notifications/${id}/read`);
      fetchNotificationStats();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setStats((prev) => ({
        ...prev,
        totalUnread: 0,
        urgentCount: 0,
        countsByCategory: { ...prev.countsByCategory, ALL: 0, [activeSegment]: 0 },
      }));

      await api.put('/api/notifications/read-all', {
        category: activeSegment !== 'ALL' ? activeSegment : undefined,
      });
      fetchNotificationStats();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await api.put(`/api/notifications/${notif.id}/read`);
        fetchNotificationStats();
      } catch (e) {
        // Ignore
      }
    }
    setIsOpen(false);
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    } else {
      router.push('/notifications');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'TICKETS':
        return <Ticket size={13} className="text-amber-400" />;
      case 'PROJECTS':
        return <FolderGit2 size={13} className="text-indigo-400" />;
      case 'INVENTORY':
        return <Package size={13} className="text-emerald-400" />;
      case 'CHAT':
        return <MessageSquare size={13} className="text-blue-400" />;
      case 'ATTENDANCE_HR':
        return <Calendar size={13} className="text-purple-400" />;
      default:
        return <ShieldAlert size={13} className="text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white dark:hover:text-white light:text-slate-600 light:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition group focus:outline-none"
        title="Notifications & Activity Stream"
      >
        <Bell size={20} className="group-hover:text-indigo-400 transition" />

        {/* Dynamic Unread Badge */}
        {stats.totalUnread > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-white font-extrabold text-[9px] flex items-center justify-center border border-slate-900 font-mono shadow-md ${
              stats.urgentCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600'
            }`}
          >
            {stats.totalUnread > 99 ? '99+' : stats.totalUnread}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[550px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>Notifications</span>
                  {stats.totalUnread > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono font-bold border border-indigo-500/30">
                      {stats.totalUnread} new
                    </span>
                  )}
                </span>
                {stats.urgentCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 flex items-center gap-0.5 animate-pulse">
                    <AlertTriangle size={10} />
                    <span>{stats.urgentCount} Urgent</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg text-xs transition border ${
                    soundEnabled
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                  title={soundEnabled ? 'Mute Chime Sound' : 'Enable Chime Sound'}
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>

                {/* Mark All Read */}
                {stats.totalUnread > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>

            {/* Quick Segment Filter Strip (Role Based) */}
            <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar pt-1">
              {(() => {
                const role = (user?.role || 'EMPLOYEE').toUpperCase();
                let segs: { id: string; label: string; count?: number }[] = [];

                if (role === 'ADMIN' || role === 'MANAGER') {
                  segs = [
                    { id: 'ALL', label: 'All', count: stats.countsByCategory.ALL },
                    { id: 'TICKETS', label: 'Tickets', count: stats.countsByCategory.TICKETS },
                    { id: 'PROJECTS', label: 'Projects', count: stats.countsByCategory.PROJECTS },
                    { id: 'INVENTORY', label: 'Hardware', count: stats.countsByCategory.INVENTORY },
                    { id: 'CHAT', label: 'Chat', count: stats.countsByCategory.CHAT },
                  ];
                } else if (role === 'HR') {
                  segs = [
                    { id: 'ALL', label: 'All', count: stats.countsByCategory.ALL },
                    { id: 'ATTENDANCE_HR', label: 'HR', count: stats.countsByCategory.ATTENDANCE_HR },
                    { id: 'CHAT', label: 'Chat', count: stats.countsByCategory.CHAT },
                  ];
                } else if (role === 'CLIENT') {
                  segs = [
                    { id: 'ALL', label: 'All', count: stats.countsByCategory.ALL },
                    { id: 'TICKETS', label: 'Tickets', count: stats.countsByCategory.TICKETS },
                    { id: 'PROJECTS', label: 'Sites', count: stats.countsByCategory.PROJECTS },
                    { id: 'CHAT', label: 'Chat', count: stats.countsByCategory.CHAT },
                  ];
                } else {
                  // EMPLOYEE / Field Technician
                  segs = [
                    { id: 'ALL', label: 'All', count: stats.countsByCategory.ALL },
                    { id: 'TICKETS', label: 'My Tickets', count: stats.countsByCategory.TICKETS },
                    { id: 'PROJECTS', label: 'Projects', count: stats.countsByCategory.PROJECTS },
                    { id: 'INVENTORY', label: 'My Kit', count: stats.countsByCategory.INVENTORY },
                    { id: 'CHAT', label: 'Chat', count: stats.countsByCategory.CHAT },
                  ];
                }

                return segs.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setActiveSegment(seg.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 flex items-center gap-1 ${
                      activeSegment === seg.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    <span>{seg.label}</span>
                    {seg.count !== undefined && seg.count > 0 && (
                      <span className="text-[9px] px-1 rounded-full bg-slate-950 font-mono text-indigo-300 font-bold">
                        {seg.count}
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500/60" />
                <p className="text-xs font-bold text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-500">No unread notifications in this segment.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUrgent = n.priority === 'URGENT';
                const isHigh = n.priority === 'HIGH';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-slate-800/60 transition cursor-pointer flex items-start gap-3 relative group ${
                      !n.isRead ? (isUrgent ? 'bg-rose-950/20' : 'bg-slate-950/40') : 'opacity-70'
                    }`}
                  >
                    {/* Left Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isUrgent
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {getCategoryIcon(n.category)}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            !n.isRead ? (isUrgent ? 'text-rose-300' : 'text-white') : 'text-slate-300'
                          }`}
                        >
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isUrgent ? 'bg-rose-500' : 'bg-indigo-500'
                            }`}
                          />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                        <span className="uppercase text-[9px] font-bold text-slate-400">
                          {n.category.replace('_', ' ')}
                        </span>
                        <span>{formatDateTime(n.createdAt)}</span>
                      </div>
                    </div>

                    {/* Inline Mark Read action */}
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Mark as read"
                      >
                        <Check size={11} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/90 text-center shrink-0">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center gap-1"
            >
              <span>Open Full Notifications Hub</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
