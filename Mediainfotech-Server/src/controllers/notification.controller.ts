import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
  getUserNotificationStats,
  sendNotification,
  broadcastNotification,
  getAllowedCategoriesForRole,
} from '../services/notification.service';
import { NotificationCategory, NotificationPriority } from '@prisma/client';
import { getIO } from '../socket';

/**
 * GET /api/notifications
 * Fast, categorized, and role-scoped notifications stream with live stats
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      category,
      priority,
      isRead,
      search,
      page = '1',
      limit = '30',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    // Enforce role-based category permissions
    const allowedCategories = getAllowedCategoriesForRole(userRole);

    // Build filter conditions
    const where: any = {
      userId,
    };

    if (category && category !== 'ALL') {
      const requestedCat = category as NotificationCategory;
      if (allowedCategories.includes(requestedCat)) {
        where.category = requestedCat;
      } else {
        // Requested category not permitted for this role -> return empty set
        res.json({
          success: true,
          data: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          stats: await getUserNotificationStats(userId, userRole),
        });
        return;
      }
    } else {
      where.category = { in: allowedCategories };
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority as NotificationPriority;
    }

    if (isRead === 'true') {
      where.isRead = true;
    } else if (isRead === 'false') {
      where.isRead = false;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { message: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Execute queries in parallel for ultra-fast response
    const [notifications, totalCount, stats] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      getUserNotificationStats(userId, userRole),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      stats,
      allowedCategories,
    });
  } catch (error: any) {
    console.error('getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
};

/**
 * GET /api/notifications/stats
 * Quick endpoint to fetch role-scoped unread counters for the navbar bell
 */
export const getNotificationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stats = await getUserNotificationStats(userId, userRole);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('getNotificationStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notification stats', error: error.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';
    const id = req.params.id as string;

    const existing = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    const stats = await getUserNotificationStats(userId!, userRole);
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification_stats_updated', stats);
    }

    res.json({ success: true, message: 'Notification marked as read', data: updated, stats });
  } catch (error: any) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification read', error: error.message });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications (or specific category) as read
 */
export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { category } = req.body || {};
    const allowedCategories = getAllowedCategoriesForRole(userRole);
    const where: any = { userId, isRead: false, category: { in: allowedCategories } };

    if (category && category !== 'ALL') {
      if (allowedCategories.includes(category as NotificationCategory)) {
        where.category = category as NotificationCategory;
      }
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    const stats = await getUserNotificationStats(userId, userRole);
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification_stats_updated', stats);
    }

    res.json({ success: true, message: 'All notifications marked as read', stats });
  } catch (error: any) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications read', error: error.message });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';
    const id = req.params.id as string;

    const existing = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({ where: { id } });

    const stats = await getUserNotificationStats(userId!, userRole);
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification_stats_updated', stats);
    }

    res.json({ success: true, message: 'Notification deleted', stats });
  } catch (error: any) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
  }
};

/**
 * DELETE /api/notifications/clear-read
 * Delete all read notifications for user
 */
export const clearReadNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'EMPLOYEE';

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    const stats = await getUserNotificationStats(userId, userRole);
    res.json({ success: true, message: 'Read notifications cleared', stats });
  } catch (error: any) {
    console.error('clearReadNotifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear read notifications', error: error.message });
  }
};

/**
 * POST /api/notifications/test-trigger
 * For testing and live demonstration of real-time push
 */
export const triggerTestNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      title = 'Critical Breakdown Alert',
      message = 'Junction 08 CCTV ANPR camera signal lost. Immediate field visit required.',
      category = 'TICKETS',
      priority = 'URGENT',
      actionUrl = '/tickets',
    } = req.body || {};

    const notification = await sendNotification({
      userId,
      title,
      message,
      category: category as any,
      priority: priority as any,
      actionUrl,
    });

    res.json({ success: true, message: 'Test notification emitted in real time', data: notification });
  } catch (error: any) {
    console.error('triggerTestNotification error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger test notification', error: error.message });
  }
};
