import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { LeaveStatus, LeaveType, NotificationCategory, NotificationPriority } from '@prisma/client';
import { notifyAdminsAndManagers, sendNotification } from '../services/notification.service';

export const getMyLeaveBalances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const currentYear = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);

    let balances = await prisma.leaveBalance.findMany({
      where: { userId, year: currentYear },
    });

    // If balances don't exist yet for this year, auto-seed defaults
    if (balances.length === 0) {
      const defaultLeaveTypes: { type: LeaveType; total: number }[] = [
        { type: LeaveType.CASUAL, total: 12 },
        { type: LeaveType.SICK, total: 12 },
        { type: LeaveType.EARNED, total: 15 },
        { type: LeaveType.COMPENSATORY, total: 0 },
      ];

      balances = await Promise.all(
        defaultLeaveTypes.map((d) =>
          prisma.leaveBalance.create({
            data: {
              userId,
              type: d.type,
              year: currentYear,
              total: d.total,
              used: 0,
              remaining: d.total,
            },
          })
        )
      );
    }

    res.json({ data: balances, year: currentYear });
  } catch (error) {
    console.error('getMyLeaveBalances error:', error);
    res.status(500).json({ error: 'Failed to fetch leave balances' });
  }
};

export const getAllLeaveBalances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentYear = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);
    const department = req.query.department as string | undefined;

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(department && department !== 'ALL' ? { department } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        designation: true,
        department: true,
        employeeCode: true,
        leaveBalances: {
          where: { year: currentYear },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    res.json({ data: users, year: currentYear });
  } catch (error) {
    console.error('getAllLeaveBalances error:', error);
    res.status(500).json({ error: 'Failed to fetch employee leave balances' });
  }
};

export const setEmployeeLeaveQuota = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAuthorized = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isAuthorized) {
      res.status(403).json({ error: 'Only HR, Admin, and Managers can set annual leave quotas' });
      return;
    }

    const { userId, userIds, target, department, departments, type, total, quotas, year, note } = req.body;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    // 1. Resolve Target User IDs
    let targetUserIds: string[] = [];
    if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else if (userId) {
      targetUserIds = [userId];
    } else if (target === 'ALL') {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    } else if (target === 'DEPARTMENT' || department || (departments && departments.length > 0)) {
      const deptList = departments && departments.length > 0 ? departments : department ? [department] : [];
      const deptUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(deptList.length > 0 ? { department: { in: deptList } } : {}),
        },
        select: { id: true },
      });
      targetUserIds = deptUsers.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      res.status(400).json({ error: 'No target employees selected to apply leave quotas' });
      return;
    }

    // 2. Resolve Quota Items (Single or Multi-Category Package)
    let quotaItems: Array<{ type: LeaveType; total: number }> = [];
    if (Array.isArray(quotas) && quotas.length > 0) {
      quotaItems = quotas
        .filter((q: any) => q.type && q.total !== undefined && q.enabled !== false)
        .map((q: any) => ({
          type: q.type as LeaveType,
          total: parseFloat(q.total.toString()),
        }));
    } else if (type && total !== undefined) {
      quotaItems = [{ type: type as LeaveType, total: parseFloat(total.toString()) }];
    }

    if (quotaItems.length === 0) {
      res.status(400).json({ error: 'No leave quotas specified or enabled' });
      return;
    }

    // 3. Process Quota Upserts for all resolved users
    for (const uid of targetUserIds) {
      for (const q of quotaItems) {
        const existing = await prisma.leaveBalance.findUnique({
          where: { userId_type_year: { userId: uid, type: q.type, year: targetYear } },
        });

        const usedDays = existing?.used || 0;
        const remainingDays = Math.max(0, q.total - usedDays);

        await prisma.leaveBalance.upsert({
          where: { userId_type_year: { userId: uid, type: q.type, year: targetYear } },
          update: {
            total: q.total,
            remaining: remainingDays,
            lastUpdatedBy: req.user?.id,
            lastAdjustedAt: new Date(),
            adjustmentNote: note || `Quota updated by ${req.user?.role || 'Admin'}`,
          },
          create: {
            userId: uid,
            type: q.type,
            year: targetYear,
            total: q.total,
            used: 0,
            remaining: q.total,
            lastUpdatedBy: req.user?.id,
            lastAdjustedAt: new Date(),
            adjustmentNote: note || `Initial quota allocated by ${req.user?.role || 'Admin'}`,
          },
        });
      }
    }

    res.json({
      message: `Successfully allocated leave quotas for ${targetUserIds.length} employee(s) across ${quotaItems.length} categories.`,
      affectedEmployees: targetUserIds.length,
      categoriesCount: quotaItems.length,
    });
  } catch (error) {
    console.error('setEmployeeLeaveQuota error:', error);
    res.status(500).json({ error: 'Failed to set leave quota' });
  }
};

export const creditEmployeeLeave = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAuthorized = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isAuthorized) {
      res.status(403).json({ error: 'Only HR, Admin, and Managers can grant leave credits' });
      return;
    }

    const { userId, userIds, target, department, departments, type, types, days, year, reason } = req.body;
    if (!days || !reason) {
      res.status(400).json({ error: 'days and reason are required' });
      return;
    }

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const creditDays = parseFloat(days.toString());

    // 1. Resolve Target User IDs
    let targetUserIds: string[] = [];
    if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else if (userId) {
      targetUserIds = [userId];
    } else if (target === 'ALL') {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    } else if (target === 'DEPARTMENT' || department || (departments && departments.length > 0)) {
      const deptList = departments && departments.length > 0 ? departments : department ? [department] : [];
      const deptUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(deptList.length > 0 ? { department: { in: deptList } } : {}),
        },
        select: { id: true },
      });
      targetUserIds = deptUsers.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      res.status(400).json({ error: 'No target employees selected to credit leaves' });
      return;
    }

    // 2. Resolve Target Leave Types
    const targetTypes: LeaveType[] = Array.isArray(types) && types.length > 0
      ? (types as LeaveType[])
      : [(type || 'COMPENSATORY') as LeaveType];

    for (const uid of targetUserIds) {
      for (const t of targetTypes) {
        const existing = await prisma.leaveBalance.findUnique({
          where: { userId_type_year: { userId: uid, type: t, year: targetYear } },
        });

        const currentTotal = existing?.total || 0;
        const currentUsed = existing?.used || 0;
        const newTotal = currentTotal + creditDays;
        const newRemaining = Math.max(0, newTotal - currentUsed);

        await prisma.leaveBalance.upsert({
          where: { userId_type_year: { userId: uid, type: t, year: targetYear } },
          update: {
            total: newTotal,
            remaining: newRemaining,
            lastUpdatedBy: req.user?.id,
            lastAdjustedAt: new Date(),
            adjustmentNote: `Granted +${creditDays} days: ${reason}`,
          },
          create: {
            userId: uid,
            type: t,
            year: targetYear,
            total: creditDays,
            used: 0,
            remaining: creditDays,
            lastUpdatedBy: req.user?.id,
            lastAdjustedAt: new Date(),
            adjustmentNote: `Granted +${creditDays} days: ${reason}`,
          },
        });
      }
    }

    res.json({
      message: `Successfully credited +${creditDays} days to ${targetUserIds.length} employee(s).`,
      affectedEmployees: targetUserIds.length,
    });
  } catch (error) {
    console.error('creditEmployeeLeave error:', error);
    res.status(500).json({ error: 'Failed to credit leave' });
  }
};

export const createLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

  try {
    const userId = req.user?.id;
    if (!userId) return;

    const { type, startDate, endDate, totalDays, reason, isHalfDay, halfDayPeriod, documentUrl } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      res.status(400).json({ error: 'type, startDate, endDate, and reason are required' });
      return;
    }

    const calculatedDays = isHalfDay ? 0.5 : totalDays ? parseFloat(totalDays) : 1;

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        type: type as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: calculatedDays,
        reason,
        isHalfDay: Boolean(isHalfDay),
        halfDayPeriod: halfDayPeriod || null,
        documentUrl: documentUrl || null,
        status: LeaveStatus.PENDING,
      },
    });

    // Real-Time Notification on Leave Request
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const requesterName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Employee';

      await notifyAdminsAndManagers({
        title: `🌴 New Leave Request: ${requesterName}`,
        message: `${requesterName} requested ${calculatedDays} day(s) (${type}): "${reason}"`,
        category: NotificationCategory.ATTENDANCE_HR,
        priority: NotificationPriority.HIGH,
        actionUrl: '/hr/leave',
        entityId: leave.id,
        entityType: 'LeaveRequest',
        excludeUserId: userId,
      });
    } catch (notifErr) {
      console.error('Leave request notification error:', notifErr);
    }

    res.status(201).json({ message: 'Leave request submitted', data: leave });
  } catch (error) {
    console.error('createLeaveRequest error:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
};

export const getMyLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const leaves = await prisma.leaveRequest.findMany({
      where: { userId },
      include: {
        approver: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const getAllLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, department } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status as LeaveStatus;
    if (department && department !== 'ALL') {
      where.user = { department };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            department: true,
            designation: true,
            employeeCode: true,
          },
        },
        approver: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all leave requests' });
  }
};

export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, rejectionNote } = req.body;
    const approverId = req.user?.id;

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const existingLeave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existingLeave) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }

    // Segregation of duties: Prevent users from approving their own leave requests
    if (existingLeave.userId === approverId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Segregation of duties violation: You cannot approve your own leave request' });
      return;
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionNote: rejectionNote || null,
      },
    });

    // If approved, decrement the remaining balance
    if (status === 'APPROVED' && existingLeave.status !== 'APPROVED') {
      const year = new Date(existingLeave.startDate).getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          userId_type_year: {
            userId: existingLeave.userId,
            type: existingLeave.type,
            year,
          },
        },
      });

      if (balance) {
        const newUsed = balance.used + existingLeave.totalDays;
        const newRemaining = Math.max(0, balance.total - newUsed);
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { used: newUsed, remaining: newRemaining },
        });
      }
    }

    // Real-Time Notification on Leave Decision
    try {
      const isApproved = status === 'APPROVED';
      await sendNotification({
        userId: existingLeave.userId,
        title: isApproved ? `✅ Leave Request Approved` : `❌ Leave Request ${status}`,
        message: isApproved
          ? `Your ${existingLeave.type} leave request (${existingLeave.totalDays} day(s)) has been approved.`
          : `Your ${existingLeave.type} leave request was ${status.toLowerCase()}${rejectionNote ? `: "${rejectionNote}"` : '.'}`,
        category: NotificationCategory.ATTENDANCE_HR,
        priority: NotificationPriority.NORMAL,
        actionUrl: '/hr/leave',
        entityId: leave.id,
        entityType: 'LeaveRequest',
      });
    } catch (notifErr) {
      console.error('Leave decision notification error:', notifErr);
    }

    res.json({ message: `Leave request ${status.toLowerCase()}`, data: leave });
  } catch (error) {
    console.error('updateLeaveStatus error:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
};

export const getTeamLeaveCalendar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const month = parseInt((req.query.month as string) || (new Date().getMonth() + 1).toString(), 10);
    const year = parseInt((req.query.year as string) || new Date().getFullYear().toString(), 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json({ data: leaves, month, year });
  } catch (error) {
    console.error('getTeamLeaveCalendar error:', error);
    res.status(500).json({ error: 'Failed to fetch team out-of-office calendar' });
  }
};

