'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Clock, ShieldCheck, MapPin } from 'lucide-react';

export default function AttendanceHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/attendance/my-history')
      .then((res) => {
        const records = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setHistory(records);
      })
      .catch((err) => {
        console.error('Fetch history error:', err);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
          <Clock className="text-blue-400" size={24} />
          <span>My Attendance History</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Your past check-in and check-out verification logs.</p>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400">Loading history...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4">Date</th>
                <th className="p-4">Check-In</th>
                <th className="p-4">Check-Out</th>
                <th className="p-4">Total Hours</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {!Array.isArray(history) || history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-medium text-white">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-emerald-400 font-bold">{formatDateTime(rec.checkInTime)}</span>
                        {rec.isLate && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                            +{rec.lateMinutes}m Late
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin size={10} />
                        <span>
                          {rec.checkInLat ? rec.checkInLat.toFixed(2) : 0}, {rec.checkInLng ? rec.checkInLng.toFixed(2) : 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {rec.checkOutTime ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-blue-400">{formatDateTime(rec.checkOutTime)}</span>
                          {rec.isEarlyExit && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">
                              -{rec.earlyExitMinutes}m Early
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4 font-mono font-semibold text-blue-400">
                      {rec.totalHours ? `${rec.totalHours} hrs` : '-'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          rec.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rec.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
