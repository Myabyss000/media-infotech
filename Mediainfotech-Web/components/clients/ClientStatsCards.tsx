'use client';

import React from 'react';
import { Users, UserPlus, DollarSign, Wrench, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ClientStatsProps {
  stats: {
    totalClients: number;
    activeClients: number;
    prospectClients: number;
    inactiveClients: number;
    totalBilled: number;
    totalReceived: number;
    outstandingDue: number;
    activeServicesCount: number;
  } | null;
  loading?: boolean;
}

export function ClientStatsCards({ stats, loading }: ClientStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Active Accounts',
      value: stats?.activeClients ?? 0,
      subtext: `${stats?.totalClients ?? 0} total client roster`,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      gradient: 'from-emerald-600/20 via-emerald-500/5 to-transparent',
    },
    {
      title: 'Leads & Prospects',
      value: stats?.prospectClients ?? 0,
      subtext: 'Pipeline onboarding in progress',
      icon: UserPlus,
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      gradient: 'from-blue-600/20 via-blue-500/5 to-transparent',
    },
    {
      title: 'Total Revenue Received',
      value: formatCurrency(stats?.totalReceived ?? 0),
      subtext: `Billed: ${formatCurrency(stats?.totalBilled ?? 0)}`,
      icon: DollarSign,
      color: 'text-indigo-400',
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-500/10',
      gradient: 'from-indigo-600/20 via-indigo-500/5 to-transparent',
    },
    {
      title: 'Active Service Contracts',
      value: stats?.activeServicesCount ?? 0,
      subtext: stats?.outstandingDue && stats.outstandingDue > 0
        ? `Due: ${formatCurrency(stats.outstandingDue)}`
        : 'All contracts in good standing',
      icon: Wrench,
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      gradient: 'from-amber-600/20 via-amber-500/5 to-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden p-5 rounded-3xl bg-slate-900 border ${card.border} shadow-xl flex flex-col justify-between group hover:scale-[1.01] transition-all duration-200`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />

            <div className="relative z-10 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 font-mono">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-2xl border ${card.border} ${card.bg} ${card.color} shadow-md`}>
                <Icon size={20} />
              </div>
            </div>

            <div className="relative z-10 mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
