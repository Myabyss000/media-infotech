import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendanceHistory,
  getAllAttendance,
  updateAttendanceStatus,
  getAttendanceSettings,
  updateAttendanceSettings,
  getTodaySummary,
} from '../controllers/attendance.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/settings', getAttendanceSettings);
router.put('/settings', updateAttendanceSettings);

router.post('/check-in', upload.single('photo'), checkIn);
router.put('/check-out', upload.single('photo'), checkOut);
router.get('/today', getTodayAttendance);
router.get('/today-summary', requirePermission('attendance', 'read'), getTodaySummary);
router.get('/my-history', getMyAttendanceHistory);
router.get('/all', requirePermission('attendance', 'read'), getAllAttendance);
router.put('/:id/status', requirePermission('attendance', 'approve'), updateAttendanceStatus);

export default router;


