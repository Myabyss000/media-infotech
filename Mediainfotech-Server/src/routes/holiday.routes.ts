import { Router } from 'express';
import {
  getHolidays,
  getUpcomingHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../controllers/holiday.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('holidays', 'read'), getHolidays);
router.get('/upcoming', getUpcomingHolidays); // All logged in employees can view upcoming holidays
router.post('/', requirePermission('holidays', 'create'), createHoliday);
router.put('/:id', requirePermission('holidays', 'update'), updateHoliday);
router.delete('/:id', requirePermission('holidays', 'delete'), deleteHoliday);

export default router;
