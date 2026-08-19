import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getNormalizedDate } from './attendance.controller';

export const getDashboardOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGER', 'HR'].includes(userRole);

    const today = getNormalizedDate();

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (isPrivileged) {
      // ===== ADMIN / MANAGER / HR COMPLETE OPERATIONS DATA =====
      const [
        activeStaffCount,
        todayAttendanceRecords,
        totalTickets,
        openTicketsCount,
        inProgressTicketsCount,
        urgentTicketsCount,
        urgentTicketsList,
        totalInventoryItems,
        inStockItemsCount,
        assignedInFieldCount,
        mustReturnInventoryCount,
        totalClientsCount,
        activeClientsCount,
        monitoredSitesCount,
        totalVehiclesCount,
        assignedVehiclesCount,
        pendingAttendanceCount,
        pendingRegularizationsCount,
        pendingLeavesCount,
        pendingRegularizationsList,
        pendingLeavesList,
        myTodayAttendance,
        myAssignedTickets,
        myGroups,
        myCustodyEquipment,
        recentInventoryLogs,
      ] = await Promise.all([
        // Staff count
        prisma.user.count({ where: { isActive: true } }),

        // Today attendance
        prisma.attendance.findMany({
          where: { date: today },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true, department: true } },
            breaks: true,
          },
          orderBy: { checkInTime: 'desc' },
        }),

        // Tickets metrics
        prisma.ticket.count(),
        prisma.ticket.count({ where: { status: 'OPEN' } }),
        prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.ticket.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.ticket.findMany({
          where: { priority: { in: ['HIGH', 'URGENT'] }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          include: {
            client: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
            assignedGroup: { select: { id: true, name: true } },
            assignedUser: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: 6,
        }),

        // Inventory metrics
        prisma.inventoryItem.count(),
        prisma.inventoryItem.count({ where: { status: 'IN_STOCK' } }),
        prisma.inventoryItem.count({ where: { status: 'ASSIGNED' } }),
        prisma.inventoryItem.count({
          where: {
            OR: [
              { condition: { in: ['DAMAGED', 'DEFECTIVE'] } },
              { status: { in: ['UNDER_MAINTENANCE', 'RETIRED'] } },
            ],
          },
        }),

        // Clients & Sites
        prisma.client.count(),
        prisma.client.count({ where: { status: 'ACTIVE' } }),
        prisma.group.count({ where: { locationName: { not: null } } }),

        // Vehicles
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { status: 'ASSIGNED' } }),

        // Pending Approvals
        prisma.attendance.count({ where: { status: 'PENDING' } }),
        prisma.attendanceRegularization.count({ where: { status: 'PENDING' } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),

        // Pending items preview
        prisma.attendanceRegularization.findMany({
          where: { status: 'PENDING' },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, department: true } } },
          orderBy: { createdAt: 'desc' },
          take: 4,
        }),
        prisma.leaveRequest.findMany({
          where: { status: 'PENDING' },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, department: true } } },
          orderBy: { createdAt: 'desc' },
          take: 4,
        }),

        // Personal Hub
        prisma.attendance.findFirst({
          where: { userId, date: today },
          include: { breaks: true },
        }),
        prisma.ticket.findMany({
          where: {
            OR: [
              { assignedUserId: userId },
              { assignedGroup: { members: { some: { userId } } } },
            ],
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          include: {
            client: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
            assignedGroup: {
              select: {
                id: true,
                name: true,
                vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
              },
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: 6,
        }),
        (prisma.group as any).findMany({
          where: { members: { some: { userId } } },
          include: {
            vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
            client: { select: { id: true, name: true, companyName: true } },
            members: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true, designation: true } },
              },
            },
            inventoryItems: {
              select: { id: true, deviceName: true, barcode: true, condition: true, location: true, category: true },
            },
            _count: { select: { inventoryItems: true, announcements: true } },
          },
          take: 4,
        }),
        prisma.inventoryItem.findMany({
          where: { assignedUserId: userId, status: 'ASSIGNED' },
          select: { id: true, deviceName: true, barcode: true, condition: true, location: true, category: true, updatedAt: true },
          take: 10,
        }),

        // Recent Activity Log
        prisma.inventoryLog.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            inventoryItem: { select: { id: true, deviceName: true, barcode: true } },
            performedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
      ]);

      const presentStaffToday = todayAttendanceRecords.length;
      const absentStaffToday = Math.max(0, activeStaffCount - presentStaffToday);
      const lateStaffToday = todayAttendanceRecords.filter((r) => r.isLate).length;
      const attendanceRate = activeStaffCount > 0 ? Math.round((presentStaffToday / activeStaffCount) * 100) : 0;
      const totalPendingApprovals = pendingAttendanceCount + pendingRegularizationsCount + pendingLeavesCount;

      res.json({
        isPrivileged: true,
        attendance: {
          totalStaff: activeStaffCount,
          presentToday: presentStaffToday,
          absentToday: absentStaffToday,
          lateToday: lateStaffToday,
          attendanceRate,
          todayRecords: todayAttendanceRecords.slice(0, 6),
        },
        tickets: {
          totalTickets,
          openTickets: openTicketsCount,
          inProgressTickets: inProgressTicketsCount,
          activeTickets: openTicketsCount + inProgressTicketsCount,
          urgentTickets: urgentTicketsCount,
          urgentList: urgentTicketsList,
        },
        inventory: {
          totalItems: totalInventoryItems,
          inStockItems: inStockItemsCount,
          assignedInField: assignedInFieldCount,
          mustReturnCount: mustReturnInventoryCount,
        },
        clients: {
          totalClients: totalClientsCount,
          activeClients: activeClientsCount,
          monitoredSites: monitoredSitesCount,
        },
        vehicles: {
          totalVehicles: totalVehiclesCount,
          assignedVehicles: assignedVehiclesCount,
        },
        pendingApprovals: {
          totalPending: totalPendingApprovals,
          pendingAttendanceCount,
          pendingRegularizationsCount,
          pendingLeavesCount,
          pendingRegularizationsList,
          pendingLeavesList,
        },
        myDailyHub: {
          myTodayAttendance,
          myAssignedTickets,
          myGroups,
          myCustodyEquipment,
        },
        recentActivity: recentInventoryLogs.map((log) => ({
          id: log.id,
          type: 'INVENTORY',
          title: `${log.action === 'CHECK_OUT' ? 'Dispatched' : 'Returned'}: ${log.inventoryItem?.deviceName}`,
          subtitle: log.notes || `Serial: ${log.inventoryItem?.barcode}`,
          performedBy: log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System',
          timestamp: log.createdAt,
        })),
      });
      return;
    }

    // ===== REGULAR EMPLOYEE / TECHNICIAN PERSONAL WORKSPACE DATA =====
    const [
      myTodayAttendance,
      myAssignedTickets,
      myGroups,
      myCustodyEquipment,
      myPendingRegularizations,
      myPendingLeaves,
    ] = await Promise.all([
      // 1. My attendance
      prisma.attendance.findFirst({
        where: { userId, date: today },
        include: { breaks: true },
      }),

      // 2. My assigned tickets
      prisma.ticket.findMany({
        where: {
          OR: [
            { assignedUserId: userId },
            { assignedGroup: { members: { some: { userId } } } },
          ],
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        include: {
          client: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
          assignedGroup: {
            select: {
              id: true,
              name: true,
              vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),

      // 3. My groups & group assigned products
      (prisma.group as any).findMany({
        where: { members: { some: { userId } } },
        include: {
          vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
          client: { select: { id: true, name: true, companyName: true } },
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true, designation: true } },
            },
          },
          inventoryItems: {
            select: { id: true, deviceName: true, barcode: true, condition: true, location: true, category: true },
          },
          _count: { select: { inventoryItems: true, announcements: true } },
        },
        take: 4,
      }),

      // 4. Products checked out to my individual custody (Toolbag)
      prisma.inventoryItem.findMany({
        where: { assignedUserId: userId, status: 'ASSIGNED' },
        select: { id: true, deviceName: true, barcode: true, condition: true, location: true, category: true, updatedAt: true },
        take: 15,
      }),

      // 5. My pending regularizations
      prisma.attendanceRegularization.count({
        where: { userId, status: 'PENDING' },
      }),

      // 6. My pending leaves
      prisma.leaveRequest.count({
        where: { userId, status: 'PENDING' },
      }),
    ]);

    // Calculate group inventory count
    const totalGroupEquipmentCount = myGroups.reduce((acc: number, g: any) => acc + (g.inventoryItems?.length || 0), 0);

    res.json({
      isPrivileged: false,
      personalOverview: {
        checkedIn: !!myTodayAttendance,
        checkInTime: myTodayAttendance?.checkInTime || null,
        checkOutTime: myTodayAttendance?.checkOutTime || null,
        isLate: myTodayAttendance?.isLate || false,
        totalBreaksCount: myTodayAttendance?.breaks?.length || 0,
        activeTicketsCount: myAssignedTickets.length,
        urgentTicketsCount: myAssignedTickets.filter((t) => t.priority === 'URGENT').length,
        custodyEquipmentCount: myCustodyEquipment.length,
        groupEquipmentCount: totalGroupEquipmentCount,
        totalAssignedProductsCount: myCustodyEquipment.length + totalGroupEquipmentCount,
        myPendingRegularizations,
        myPendingLeaves,
      },
      myDailyHub: {
        myTodayAttendance,
        myAssignedTickets,
        myGroups,
        myCustodyEquipment,
      },
    });
  } catch (error) {
    console.error('getDashboardOverview error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard overview' });
  }
};
