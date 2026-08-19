'use client';

import React from 'react';
import { FolderGit2, CheckCircle2, Video, IndianRupee, ShieldAlert, Layers } from 'lucide-react';

interface ProjectStatsProps {
  stats: {
    totalProjects: number;
    planning: number;
    inProgress: number;
    inspection: number;
    commissioned: number;
    onHold: number;
    totalContractValue: number | null;
    totalCamerasPlanned: number;
    totalCamerasInstalled: number;
  } | null;
  loading?: boolean;
}

export function ProjectStatsCards({ stats, loading }: ProjectStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return null;
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const cards = [
    {
      title: 'Active Tenders',
      value: stats?.totalProjects ?? 0,
      subvalue: `${(stats?.inProgress ?? 0) + (stats?.planning ?? 0)} in execution`,
      icon: FolderGit2,
      color: 'text-indigo-400',
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/10',
    },
    {
      title: 'Field Execution',
      value: stats?.inProgress ?? 0,
      subvalue: `${stats?.inspection ?? 0} in JIR testing`,
      icon: Layers,
      color: 'text-blue-400',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'CCTV Field Cameras',
      value: `${stats?.totalCamerasInstalled ?? 0}/${stats?.totalCamerasPlanned ?? 0}`,
      subvalue: stats?.totalCamerasPlanned
        ? `${Math.round(((stats?.totalCamerasInstalled ?? 0) / (stats.totalCamerasPlanned || 1)) * 100)}% Mounted`
        : '0 planned',
      icon: Video,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
    },
    {
      title: stats?.totalContractValue !== null ? 'Tender Contract Value' : 'Commissioned Tenders',
      value: stats?.totalContractValue !== null
        ? formatCurrency(stats?.totalContractValue || 0)
        : stats?.commissioned ?? 0,
      subvalue: stats?.totalContractValue !== null ? 'Sanctioned budget' : 'Handed over & AMC active',
      icon: stats?.totalContractValue !== null ? IndianRupee : CheckCircle2,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-slate-900 border ${card.border} shadow-lg flex items-center justify-between hover:border-slate-700 transition`}
          >
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {card.title}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">{card.value}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                {card.subvalue}
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${card.border} ${card.bg} ${card.color}`}>
              <Icon size={18} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
