'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Clock,
  History,
  Users,
  Building2,
  Sparkles,
  BarChart3,
  CalendarDays,
  FileEdit,
  Repeat,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AttendanceCheckWidget } from '@/components/attendance/AttendanceCheckWidget';
import { PersonalAttendanceHistory } from '@/components/attendance/PersonalAttendanceHistory';
import { TeamAttendancePanel } from '@/components/attendance/TeamAttendancePanel';
import { EnterpriseAttendancePanel } from '@/components/attendance/EnterpriseAttendancePanel';
import { EmployeeHoursChart } from '@/components/attendance/EmployeeHoursChart';
import { AttendanceRegularizationPanel } from '@/components/attendance/AttendanceRegularizationPanel';
import { ShiftRosteringPanel } from '@/components/attendance/ShiftRosteringPanel';
import { AttendanceAnalyticsPanel } from '@/components/attendance/AttendanceAnalyticsPanel';

export default function AttendancePage() {
  const { user, hasPermission, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('checkin');
  const [regularizeTargetDate, setRegularizeTargetDate] = useState<string | null>(null);

  const isPrivileged = hasRole('ADMIN', 'HR', 'MANAGER') || hasPermission('attendance', 'approve');
  const canViewEnterprise = hasRole('ADMIN', 'HR');
  const canViewTeam = isPrivileged;
  const canViewAnalytics = hasRole('ADMIN', 'HR', 'MANAGER');

  const handleOpenRegularization = (date?: string) => {
    if (date) setRegularizeTargetDate(date);
    setActiveTab('regularization');
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Sparkles size={14} />
            <span>Attendance, Hours Analytics & Rostering Suite</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Attendance Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS geofence clock-in, break tracking, work hours vs. overtime analytics, monthly muster roll, and shift rostering.
          </p>
        </div>
      </div>

      {/* Role-Based Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max bg-slate-900 border border-slate-800 p-1 rounded-2xl">
            {/* Tab 1: Clock-In & Today */}
            <TabsTrigger value="checkin" className="flex items-center space-x-2">
              <Zap size={14} className="text-emerald-400" />
              <span>My Attendance</span>
            </TabsTrigger>

            {/* Tab 2: My Hours & Calendar */}
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <CalendarDays size={14} className="text-blue-400" />
              <span>My Work Calendar</span>
            </TabsTrigger>

            {/* Tab 3: Regularization */}
            <TabsTrigger value="regularization" className="flex items-center space-x-2">
              <FileEdit size={14} className="text-amber-400" />
              <span>Time Correction Requests</span>
            </TabsTrigger>

            {/* Tab 4: Team Approvals & Inspection */}
            {canViewTeam && (
              <TabsTrigger value="team" className="flex items-center space-x-2">
                <Users size={14} className="text-indigo-400" />
                <span>Daily Team Roll Call</span>
              </TabsTrigger>
            )}

            {/* Tab 5: Staff Hours vs Extra Hours Drilldown (Manager/HR) */}
            {canViewAnalytics && (
              <TabsTrigger value="staff_hours" className="flex items-center space-x-2">
                <BarChart3 size={14} className="text-purple-400" />
                <span>Staff Hours & Overtime</span>
              </TabsTrigger>
            )}

            {/* Tab 6: Shift Rostering */}
            {canViewTeam && (
              <TabsTrigger value="shifts" className="flex items-center space-x-2">
                <Repeat size={14} className="text-cyan-400" />
                <span>Shift Schedules</span>
              </TabsTrigger>
            )}

            {/* Tab 7: Muster Roll & Payroll Analytics */}
            {canViewAnalytics && (
              <TabsTrigger value="muster_roll" className="flex items-center space-x-2">
                <FileSpreadsheet size={14} className="text-emerald-400" />
                <span>Muster Roll & Payroll</span>
              </TabsTrigger>
            )}

            {/* Tab 8: Enterprise Settings */}
            {canViewEnterprise && (
              <TabsTrigger value="enterprise" className="flex items-center space-x-2">
                <Building2 size={14} className="text-rose-400" />
                <span>Office Geofence & Setup</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* TAB 1: TODAY'S CLOCK-IN & BREAKS */}
        <TabsContent value="checkin" className="mt-6 space-y-6">
          <AttendanceCheckWidget
            onOpenRegularization={() => handleOpenRegularization()}
          />
        </TabsContent>

        {/* TAB 2: MY HOURS & CALENDAR */}
        <TabsContent value="history" className="mt-6">
          <PersonalAttendanceHistory
            onOpenRegularizationForDate={(date) => handleOpenRegularization(date)}
          />
        </TabsContent>

        {/* TAB 3: REGULARIZATION & DISPUTES */}
        <TabsContent value="regularization" className="mt-6">
          <AttendanceRegularizationPanel
            initialApplyDate={regularizeTargetDate}
          />
        </TabsContent>

        {/* TAB 4: TEAM ROSTER & MANAGER APPROVALS */}
        {canViewTeam && (
          <TabsContent value="team" className="mt-6">
            <TeamAttendancePanel />
          </TabsContent>
        )}

        {/* TAB 5: STAFF WORK HOURS & OVERTIME DRILLDOWN */}
        {canViewAnalytics && (
          <TabsContent value="staff_hours" className="mt-6">
            <EmployeeHoursChart
              showUserSelector={true}
              title="Employee Work Hours vs. Extra Hours Analytics"
              subtitle="Select any team member to view their daily regular shift hours, extra overtime hours, breaks, and shift targets."
            />
          </TabsContent>
        )}

        {/* TAB 6: SHIFT ROSTERING & SWAPS */}
        {canViewTeam && (
          <TabsContent value="shifts" className="mt-6">
            <ShiftRosteringPanel />
          </TabsContent>
        )}

        {/* TAB 7: MUSTER ROLL & PAYROLL ANALYTICS */}
        {canViewAnalytics && (
          <TabsContent value="muster_roll" className="mt-6">
            <AttendanceAnalyticsPanel />
          </TabsContent>
        )}

        {/* TAB 8: ENTERPRISE SETTINGS & GEOFENCE */}
        {canViewEnterprise && (
          <TabsContent value="enterprise" className="mt-6">
            <EnterpriseAttendancePanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
