'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { History, Users, Building2, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PersonalAttendanceHistory } from '@/components/attendance/PersonalAttendanceHistory';
import { TeamAttendancePanel } from '@/components/attendance/TeamAttendancePanel';
import { EnterpriseAttendancePanel } from '@/components/attendance/EnterpriseAttendancePanel';

export default function AttendancePage() {
  const { user, hasPermission, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('history');

  const canViewTeam = hasPermission('attendance', 'read') || hasPermission('attendance', 'approve') || hasRole('MANAGER', 'HR', 'ADMIN');
  const canViewEnterprise = hasRole('HR', 'ADMIN');

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Sparkles size={14} />
            <span>Attendance & Geofencing System</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Attendance Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS geofence verification, camera photo logs, shift scheduling, and manager approvals.
          </p>
        </div>
      </div>

      {/* Role-Based Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History size={16} />
            <span>My History</span>
          </TabsTrigger>

          {canViewTeam && (
            <TabsTrigger value="team" className="flex items-center space-x-2">
              <Users size={16} />
              <span>Team Roster & Approvals</span>
            </TabsTrigger>
          )}

          {canViewEnterprise && (
            <TabsTrigger value="enterprise" className="flex items-center space-x-2">
              <Building2 size={16} />
              <span>Enterprise & Settings</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: My Personal History */}
        <TabsContent value="history" className="mt-6">
          <PersonalAttendanceHistory />
        </TabsContent>

        {/* Tab 2: Team Roster & Manager Approvals */}
        {canViewTeam && (
          <TabsContent value="team" className="mt-6">
            <TeamAttendancePanel />
          </TabsContent>
        )}

        {/* Tab 3: Enterprise Master Log & Admin Geofence Settings */}
        {canViewEnterprise && (
          <TabsContent value="enterprise" className="mt-6">
            <EnterpriseAttendancePanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

