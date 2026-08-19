'use client';

import React from 'react';
import { Calendar, HeartPulse, Sparkles, Award, Plus, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeaveBalance {
  id: string;
  type: string;
  year: number;
  total: number;
  used: number;
  remaining: number;
}

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
  loading?: boolean;
  onOpenQuotaModal?: () => void;
  canManageQuotas?: boolean;
}

export function LeaveBalanceCards({
  balances,
  loading,
  onOpenQuotaModal,
  canManageQuotas,
}: LeaveBalanceCardsProps) {
  const getLeaveMeta = (type: string) => {
    switch (type) {
      case 'CASUAL':
        return {
          title: 'Casual Leave (CL)',
          desc: 'Urgent personal matters & events',
          gradient: 'from-blue-600/20 via-blue-500/10 to-transparent',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          barColor: 'bg-blue-500',
          icon: Calendar,
        };
      case 'SICK':
        return {
          title: 'Sick Leave (SL)',
          desc: 'Medical & health recovery',
          gradient: 'from-rose-600/20 via-rose-500/10 to-transparent',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          barColor: 'bg-rose-500',
          icon: HeartPulse,
        };
      case 'EARNED':
        return {
          title: 'Earned Leave (EL)',
          desc: 'Annual planned vacation & travel',
          gradient: 'from-emerald-600/20 via-emerald-500/10 to-transparent',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          barColor: 'bg-emerald-500',
          icon: Sparkles,
        };
      case 'COMPENSATORY':
        return {
          title: 'Compensatory Off',
          desc: 'Weekend / holiday extra work',
          gradient: 'from-amber-600/20 via-amber-500/10 to-transparent',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          barColor: 'bg-amber-500',
          icon: Award,
        };
      default:
        return {
          title: `${type} Leave`,
          desc: 'General time-off',
          gradient: 'from-purple-600/20 via-purple-500/10 to-transparent',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          barColor: 'bg-purple-500',
          icon: Calendar,
        };
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Annual Leave Quota Wallets ({new Date().getFullYear()})
          </h3>
        </div>
        {canManageQuotas && onOpenQuotaModal && (
          <button
            onClick={onOpenQuotaModal}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <Plus size={14} />
            <span>Allocate / Credit Leaves</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((b) => {
          const meta = getLeaveMeta(b.type);
          const Icon = meta.icon;
          const percentageUsed = b.total > 0 ? Math.min(100, Math.round((b.used / b.total) * 100)) : 0;

          return (
            <div
              key={b.id}
              className={`relative overflow-hidden p-5 rounded-3xl bg-slate-900 border ${meta.border} shadow-xl flex flex-col justify-between group hover:scale-[1.01] transition-all duration-200`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`} />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2.5 rounded-2xl bg-slate-950/80 border ${meta.border} ${meta.text}`}>
                    <Icon size={18} />
                  </div>
                  <Badge variant="outline" className={`text-[11px] font-bold ${meta.text} ${meta.border}`}>
                    {b.remaining} Days Left
                  </Badge>
                </div>

                <div className="mt-3.5">
                  <h4 className="text-sm font-extrabold text-white">{meta.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{meta.desc}</p>
                </div>
              </div>

              <div className="relative z-10 mt-5 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`${meta.barColor} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentageUsed}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Used: {b.used}d</span>
                  <span>Total: {b.total}d</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
