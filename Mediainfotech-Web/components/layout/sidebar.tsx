'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Clock,
  Building2,
  FolderGit2,
  Ticket,
  Package,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  module?: string;
  action?: string;
  subItems?: { title: string; href: string }[];
}

export const Sidebar: React.FC<{ collapsed: boolean; setCollapsed: (c: boolean) => void }> = ({
  collapsed,
  setCollapsed,
}) => {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'NetTech';
  const companyTagline = process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Management System';

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Attendance',
      href: '/attendance',
      icon: Clock,
    },
    {
      title: 'HR Centre',
      href: '/hr',
      icon: Building2,
      subItems: [
        ...(hasPermission('users', 'read') ? [{ title: 'Employees', href: '/hr/employees' }] : []),
        { title: 'Leave Requests', href: '/hr/leave' },
        ...(hasPermission('vehicles', 'read') ? [{ title: 'Vehicles', href: '/hr/vehicles' }] : []),
        { title: 'Payslips', href: '/hr/payslips' },
      ],
    },
    ...(hasPermission('clients', 'read')
      ? [
          {
            title: 'Clients',
            href: '/clients',
            icon: UserCheck,
          },
        ]
      : []),
    {
      title: 'Groups',
      href: '/groups',
      icon: UsersRound,
    },
    {
      title: 'Tickets',
      href: '/tickets',
      icon: Ticket,
    },
    {
      title: 'Inventory',
      href: '/inventory',
      icon: Package,
    },
    {
      title: 'Internal Chat',
      href: '/chat',
      icon: MessageSquare,
    },
    {
      title: 'Projects',
      href: '/projects',
      icon: FolderGit2,
      badge: 'Soon',
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    },
    {
      title: 'Notifications',
      href: '/notifications',
      icon: Bell,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={cn(
        'relative z-20 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-lg shadow-lg shadow-blue-500/20 shrink-0">
            {companyName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="font-bold text-white tracking-wide text-sm truncate">{companyName}</h1>
              <p className="text-[10px] text-slate-400 font-medium truncate">{companyTagline}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User Badge */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-semibold text-white text-xs shrink-0">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono uppercase tracking-wider font-semibold border border-blue-500/20 mt-0.5">
                {user?.role}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                )}
                title={collapsed ? item.title : undefined}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>

              {/* Sub items if expanded */}
              {!collapsed && item.subItems && isActive && (
                <div className="ml-9 mt-1 space-y-1 border-l-2 border-slate-800 pl-3">
                  {item.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          'block py-1.5 px-2 rounded-lg text-xs transition',
                          isSubActive
                            ? 'text-blue-400 font-semibold bg-blue-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        )}
                      >
                        {sub.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        {!collapsed ? <p>© 2026 {companyName}</p> : <p>v1.0</p>}
      </div>
    </aside>
  );
};
