'use client';

import React, { useState, useEffect } from 'react';
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
  Search,
  RefreshCw,
  ArrowUpRight,
  Layers,
  Inbox,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'TICKETS' | 'PROJECTS' | 'INVENTORY' | 'CHAT' | 'ATTENDANCE_HR' | 'SYSTEM';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Audio Chime
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

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
      osc.frequency.setValueAtTime(isUrgent ? 880 : 587.33, now);
      osc.frequency.exponentialRampToValueAtTime(isUrgent ? 440 : 880, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // Ignore
    }
  };

  const fetchNotifications = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params: any = { limit: 50 };

      if (activeTab === 'UNREAD') {
        params.isRead = 'false';
      } else if (activeTab !== 'ALL') {
        params.category = activeTab;
      }

      if (priorityFilter !== 'ALL') {
        params.priority = priorityFilter;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get('/api/notifications', { params });
      setNotifications(res.data?.data || []);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const savedSound = localStorage.getItem('mediainfotech_notif_sound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
  }, [activeTab, priorityFilter]);

  // Real-Time WebSocket Listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data: { notification: NotificationItem; stats: any }) => {
      setNotifications((prev) => [data.notification, ...prev.filter((n) => n.id !== data.notification.id)]);
      if (data.stats) {
        setStats(data.stats);
      }
      playNotificationChime(data.notification.priority === 'URGENT');
    };

    const handleStatsUpdated = (newStats: any) => {
      setStats(newStats);
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('notification_stats_updated', handleStatsUpdated);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('notification_stats_updated', handleStatsUpdated);
    };
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('mediainfotech_notif_sound', String(next));
    if (next) playNotificationChime(false);
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setStats((prev) => ({
        ...prev,
        totalUnread: Math.max(0, prev.totalUnread - 1),
      }));

      await api.put(`/api/notifications/${id}/read`);
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
        countsByCategory: { ALL: 0, TICKETS: 0, PROJECTS: 0, INVENTORY: 0, CHAT: 0, ATTENDANCE_HR: 0, SYSTEM: 0 },
      }));

      const cat = activeTab !== 'ALL' && activeTab !== 'UNREAD' ? activeTab : undefined;
      await api.put('/api/notifications/read-all', { category: cat });
      fetchNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await api.delete(`/api/notifications/${id}`);
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const handleClearRead = async () => {
    if (!confirm('Are you sure you want to clear read notifications?')) return;
    try {
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      await api.delete('/api/notifications/clear-read');
      fetchNotifications();
    } catch (err) {
      console.error('Clear read error:', err);
    }
  };

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'TICKETS':
        return { label: 'Tickets', icon: Ticket, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'PROJECTS':
        return { label: 'Projects', icon: FolderGit2, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' };
      case 'INVENTORY':
        return { label: 'Inventory', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'CHAT':
        return { label: 'Chat', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
      case 'ATTENDANCE_HR':
        return { label: 'HR', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
      default:
        return { label: 'System', icon: ShieldAlert, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Clean, Elegant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Notifications
            </h1>
            {stats.totalUnread > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold font-mono text-xs border border-indigo-500/30">
                {stats.totalUnread} new
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-xs border border-emerald-500/20 flex items-center gap-1">
                <Check size={12} />
                <span>All caught up</span>
              </span>
            )}

            {stats.urgentCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 flex items-center gap-1 animate-pulse">
                <AlertTriangle size={11} />
                <span>{stats.urgentCount} Urgent</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time activity stream for CCTV breakdown tickets, tender milestones, and team updates.
          </p>
        </div>

        {/* Clean Header Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Chime Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              soundEnabled
                ? 'bg-slate-900 text-indigo-300 border-slate-800 hover:bg-slate-800'
                : 'bg-slate-950 text-slate-500 border-slate-900 hover:bg-slate-900'
            }`}
            title={soundEnabled ? 'Mute Sound Chimes' : 'Enable Sound Chimes'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Mark All Read */}
          {stats.totalUnread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Check size={13} />
              <span>Mark all as read</span>
            </button>
          )}

          {/* Clear Read */}
          <button
            type="button"
            onClick={handleClearRead}
            className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/20 border border-slate-800 transition flex items-center gap-1"
            title="Remove read notifications"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Clear read</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing || loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh stream"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
          </button>
        </div>
      </div>

      {/* Dedicated Category Tabs Row (Full Width, Horizontal Scroll) */}
      <div className="border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(() => {
            const role = (user?.role || 'EMPLOYEE').toUpperCase();
            let roleTabs: { id: string; label: string; count?: number }[] = [];

            if (role === 'ADMIN' || role === 'MANAGER') {
              roleTabs = [
                { id: 'ALL', label: 'All Activities' },
                { id: 'UNREAD', label: 'Unread', count: stats.totalUnread },
                { id: 'TICKETS', label: 'Tickets & SLA', count: stats.countsByCategory.TICKETS },
                { id: 'PROJECTS', label: 'Projects & Sites', count: stats.countsByCategory.PROJECTS },
                { id: 'INVENTORY', label: 'Hardware & Inventory', count: stats.countsByCategory.INVENTORY },
                { id: 'CHAT', label: 'Team Chat', count: stats.countsByCategory.CHAT },
                { id: 'ATTENDANCE_HR', label: 'HR & Attendance', count: stats.countsByCategory.ATTENDANCE_HR },
                { id: 'SYSTEM', label: 'System & Security', count: stats.countsByCategory.SYSTEM },
              ];
            } else if (role === 'HR') {
              roleTabs = [
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: 'Unread', count: stats.totalUnread },
                { id: 'ATTENDANCE_HR', label: 'HR & Attendance', count: stats.countsByCategory.ATTENDANCE_HR },
                { id: 'CHAT', label: 'Team Chat', count: stats.countsByCategory.CHAT },
                { id: 'SYSTEM', label: 'System Policy', count: stats.countsByCategory.SYSTEM },
              ];
            } else if (role === 'CLIENT') {
              roleTabs = [
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: 'Unread', count: stats.totalUnread },
                { id: 'TICKETS', label: 'My Support Tickets', count: stats.countsByCategory.TICKETS },
                { id: 'PROJECTS', label: 'Project Sites', count: stats.countsByCategory.PROJECTS },
                { id: 'CHAT', label: 'Support Chat', count: stats.countsByCategory.CHAT },
              ];
            } else {
              // EMPLOYEE / Technician
              roleTabs = [
                { id: 'ALL', label: 'All My Alerts' },
                { id: 'UNREAD', label: 'Unread', count: stats.totalUnread },
                { id: 'TICKETS', label: 'My Field Tickets', count: stats.countsByCategory.TICKETS },
                { id: 'PROJECTS', label: 'My Projects', count: stats.countsByCategory.PROJECTS },
                { id: 'INVENTORY', label: 'My Field Kit', count: stats.countsByCategory.INVENTORY },
                { id: 'CHAT', label: 'Team Chat', count: stats.countsByCategory.CHAT },
                { id: 'ATTENDANCE_HR', label: 'My Attendance', count: stats.countsByCategory.ATTENDANCE_HR },
              ];
            }

            return roleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-950 text-indigo-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Dedicated Search & Filter Toolbar (Zero Overlap) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNotifications()}
            placeholder="Search alerts, tickets, milestones, equipment..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">🚨 Critical Only</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>
      </div>

      {/* Main Notification Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Inbox size={24} />
          </div>
          <h3 className="text-sm font-bold text-white">No notifications</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || priorityFilter !== 'ALL' || activeTab !== 'ALL'
              ? 'No notifications matching your filter.'
              : 'You have no new alerts. Everything is operating smoothly.'}
          </p>
          {(search || priorityFilter !== 'ALL' || activeTab !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                setPriorityFilter('ALL');
                setSearch('');
              }}
              className="text-xs text-indigo-400 hover:underline font-semibold mt-2 inline-block"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const meta = getCategoryMeta(n.category);
            const CategoryIcon = meta.icon;
            const isUrgent = n.priority === 'URGENT';
            const isHigh = n.priority === 'HIGH';

            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                className={`p-4 rounded-2xl border transition duration-150 flex items-start justify-between gap-4 group ${
                  !n.isRead
                    ? isUrgent
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm'
                      : isHigh
                      ? 'bg-slate-900 border-amber-500/30'
                      : 'bg-slate-900 border-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/40'
                }`}
              >
                {/* Left: Icon & Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      isUrgent
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : meta.bg
                    }`}
                  >
                    <CategoryIcon size={16} className={isUrgent ? 'text-rose-400' : meta.color} />
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border font-mono ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>

                      {isUrgent && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase animate-pulse">
                          CRITICAL SLA
                        </span>
                      )}

                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}

                      <span className="text-[10px] text-slate-500 font-mono ml-auto sm:ml-0">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>

                    <h3
                      className={`text-xs sm:text-sm font-bold leading-tight ${
                        !n.isRead ? (isUrgent ? 'text-rose-300' : 'text-white') : 'text-slate-300'
                      }`}
                    >
                      {n.title}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                      {n.message}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 border ${
                        isUrgent
                          ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 font-bold'
                          : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border-indigo-500/30'
                      }`}
                    >
                      <span>Open</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  )}

                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition"
                      title="Mark as read"
                    >
                      <Check size={13} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotification(n.id, e)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
