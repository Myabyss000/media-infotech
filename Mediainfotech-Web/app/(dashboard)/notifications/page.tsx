'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Bell } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle="System updates, leave request alerts, and attendance notifications."
        action={
          <button
            onClick={markAllRead}
            className="text-xs text-blue-400 hover:text-blue-300 transition font-semibold"
          >
            Mark all as read
          </button>
        }
      />

      {loading ? (
        <div className="text-xs text-slate-400">Loading notifications...</div>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800 text-xs">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition flex items-start space-x-3 ${
                  n.isRead ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-900 border-blue-500/30 text-white'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
