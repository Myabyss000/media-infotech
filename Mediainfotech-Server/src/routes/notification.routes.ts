import { Router } from 'express';
import {
  getNotifications,
  getNotificationStats,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
  triggerTestNotification,
} from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getNotificationStats);
router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);
router.delete('/clear-read', clearReadNotifications);
router.delete('/:id', deleteNotification);

// Testing & development trigger
router.post('/test-trigger', triggerTestNotification);

export default router;
