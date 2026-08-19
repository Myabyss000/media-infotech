'use client';

import React from 'react';
import { Package, ShieldCheck, UserCheck, Wrench, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InventoryStatsProps {
  stats: {
    totalDevices: number;
    inStock: number;
    assigned: number;
    underMaintenance: number;
    retired: number;
    lowStockCount: number;
    warrantyExpiringSoon: number;
    warrantyExpired: number;
  } | null;
  loading?: boolean;
}

export function InventoryStatsCards({ stats, loading }: InventoryStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Assets',
      value: stats?.totalDevices ?? 0,
      icon: Package,
      color: 'text-indigo-400',
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/10',
      badge: null,
    },
    {
      title: 'In Stock',
      value: stats?.inStock ?? 0,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      badge: stats?.lowStockCount && stats.lowStockCount > 0 ? (
        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
          <AlertTriangle size={11} /> {stats.lowStockCount} Low
        </span>
      ) : null,
    },
    {
      title: 'Assigned',
      value: stats?.assigned ?? 0,
      icon: UserCheck,
      color: 'text-blue-400',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
      badge: null,
    },
    {
      title: 'Maintenance',
      value: stats?.underMaintenance ?? 0,
      icon: Wrench,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
      badge: null,
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
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{card.title}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">{card.value}</span>
                <span className="text-xs text-slate-500">Units</span>
              </div>
              {card.badge && <div className="mt-1">{card.badge}</div>}
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
