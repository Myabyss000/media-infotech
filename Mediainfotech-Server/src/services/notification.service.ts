import { prisma } from '../lib/prisma';
import { getIO } from '../socket';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  metadata?: any;
}

export interface BroadcastNotificationParams {
  role?: string;
  roles?: string[];
  userIds?: string[];
  excludeUserId?: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  metadata?: any;
}

/**
 * Strict Role-Based Category Access Permissions Matrix
 * - ADMIN & MANAGER: Full unrestricted access to all 6 notification segments
 * - HR: Attendance, HR, Leave, Chat, and System
 * - EMPLOYEE (Technicians): Field tickets, project site milestones, kit inventory, personal HR/attendance, and team chat
 * - CLIENT: Service tickets, commissioned project sites, and direct chat
 */
export const ROLE_ALLOWED_CATEGORIES: Record<string, NotificationCategory[]> = {
  ADMIN: [
    NotificationCategory.TICKETS,
    NotificationCategory.PROJECTS,
    NotificationCategory.INVENTORY,
    NotificationCategory.CHAT,
    NotificationCategory.ATTENDANCE_HR,
    NotificationCategory.SYSTEM,
  ],
  MANAGER: [
    NotificationCategory.TICKETS,
    NotificationCategory.PROJECTS,
    NotificationCategory.INVENTORY,
    NotificationCategory.CHAT,
    NotificationCategory.ATTENDANCE_HR,
    NotificationCategory.SYSTEM,
  ],
  HR: [
    NotificationCategory.ATTENDANCE_HR,
    NotificationCategory.CHAT,
    NotificationCategory.SYSTEM,
  ],
  EMPLOYEE: [
    NotificationCategory.TICKETS,
    NotificationCategory.PROJECTS,
    NotificationCategory.INVENTORY,
    NotificationCategory.CHAT,
    NotificationCategory.ATTENDANCE_HR,
  ],
  CLIENT: [
    NotificationCategory.TICKETS,
    NotificationCategory.PROJECTS,
    NotificationCategory.CHAT,
  ],
};

/**
 * Get allowed categories for a given user role
 */
export const getAllowedCategoriesForRole = (role?: string): NotificationCategory[] => {
  const normalized = (role || 'EMPLOYEE').toUpperCase();
  return ROLE_ALLOWED_CATEGORIES[normalized] || ROLE_ALLOWED_CATEGORIES.EMPLOYEE;
};

/**
 * Get accurate, high-speed categorized notification stats for a user scoped to their role permissions
 */
export const getUserNotificationStats = async (userId: string, userRole?: string) => {
  const allowedCategories = getAllowedCategoriesForRole(userRole);

  const baseWhere: any = {
    userId,
    isRead: false,
    category: { in: allowedCategories },
  };

  const [totalUnread, urgentCount, categorizedCounts] = await Promise.all([
    prisma.notification.count({
      where: baseWhere,
    }),
    prisma.notification.count({
      where: {
        ...baseWhere,
        priority: NotificationPriority.URGENT,
      },
    }),
    prisma.notification.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: { id: true },
    }),
  ]);

  const countsByCategory: Record<string, number> = {
    ALL: totalUnread,
  };

  allowedCategories.forEach((cat) => {
    countsByCategory[cat] = 0;
  });

  categorizedCounts.forEach((c) => {
    if (allowedCategories.includes(c.category)) {
      countsByCategory[c.category] = c._count.id;
    }
  });

  return {
    totalUnread,
    urgentCount,
    countsByCategory,
    allowedCategories,
  };
};

/**
 * Create a notification in DB and instantly emit to the user's WebSocket room
 */
export const sendNotification = async (params: CreateNotificationParams) => {
  try {
    const {
      userId,
      title,
      message,
      category = NotificationCategory.SYSTEM,
      priority = NotificationPriority.NORMAL,
      actionUrl,
      entityId,
      entityType,
      metadata,
    } = params;

    // 1. Create DB Record
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        category,
        priority,
        actionUrl,
        entityId,
        entityType,
        metadata: metadata || undefined,
        type: priority === NotificationPriority.URGENT ? 'error' : priority === NotificationPriority.HIGH ? 'warning' : 'info',
      },
    });

    // 2. Fetch user's role to compute role-scoped stats
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // 3. Fetch updated stats
    const stats = await getUserNotificationStats(userId, recipient?.role);

    // 4. Emit real-time WebSocket push
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('new_notification', {
          notification,
          stats,
        });

        if (priority === NotificationPriority.URGENT || priority === NotificationPriority.HIGH) {
          io.to(`user:${userId}`).emit('notification_chime', {
            priority,
            category,
            title,
          });
        }
      }
    } catch (e) {
      // Socket may not be initialized in test runner, ignore gracefully
    }

    return notification;
  } catch (error: any) {
    console.error('sendNotification error:', error);
    return null;
  }
};

/**
 * Broadcast notification to all users matching role or IDs
 */
export const broadcastNotification = async (params: BroadcastNotificationParams) => {
  try {
    let targetUserIds: string[] = [];

    if (params.userIds && params.userIds.length > 0) {
      targetUserIds = params.userIds;
    } else if (params.roles && params.roles.length > 0) {
      const users = await prisma.user.findMany({
        where: { role: { in: params.roles as any } },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    } else if (params.role) {
      const users = await prisma.user.findMany({
        where: { role: params.role as any },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    } else {
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    }

    if (params.excludeUserId) {
      targetUserIds = targetUserIds.filter((id) => id !== params.excludeUserId);
    }

    if (targetUserIds.length === 0) return [];

    const createdNotifications = await Promise.all(
      targetUserIds.map((userId) =>
        sendNotification({
          userId,
          title: params.title,
          message: params.message,
          category: params.category || NotificationCategory.SYSTEM,
          priority: params.priority || NotificationPriority.NORMAL,
          actionUrl: params.actionUrl,
          entityId: params.entityId,
          entityType: params.entityType,
          metadata: params.metadata,
        })
      )
    );

    return createdNotifications.filter(Boolean);
  } catch (error: any) {
    console.error('broadcastNotification error:', error);
    return [];
  }
};

/**
 * Convenience Helper: Notify all Admins and Managers
 */
export const notifyAdminsAndManagers = async (params: Omit<BroadcastNotificationParams, 'roles' | 'role'>) => {
  return broadcastNotification({
    ...params,
    roles: ['ADMIN', 'MANAGER'],
  });
};

/**
 * Convenience Helper: Notify all members of a Field Group
 */
export const notifyGroupMembers = async (groupId: string, params: Omit<BroadcastNotificationParams, 'userIds'>) => {
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);
    return broadcastNotification({
      ...params,
      userIds,
    });
  } catch (e) {
    console.error('notifyGroupMembers error:', e);
    return [];
  }
};
