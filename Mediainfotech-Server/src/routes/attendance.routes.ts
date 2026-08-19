import { Router } from 'express';
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getMyAttendanceHistory,
  getAllAttendance,
  updateAttendanceStatus,
  getAttendanceSettings,
  updateAttendanceSettings,
  getTodaySummary,
  getEmployeeHoursAnalytics,
  applyRegularization,
  getMyRegularizations,
  getAllRegularizations,
  reviewRegularization,
  cancelRegularization,
  getMonthlyMatrix,
  getMusterRoll,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  getShiftRoster,
  assignShiftSchedule,
  requestShiftSwap,
  getMyShiftSwaps,
  getPendingShiftSwaps,
  reviewShiftSwap,
} from '../controllers/attendance.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

// 1. Settings
router.get('/settings', getAttendanceSettings);
router.put('/settings', updateAttendanceSettings);

// 2. Check-In, Check-Out & Breaks
router.post('/check-in', upload.single('photo'), checkIn);
router.put('/check-out', upload.single('photo'), checkOut);
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);
router.get('/today', getTodayAttendance);
router.get('/today-summary', requirePermission('attendance', 'read'), getTodaySummary);

// 3. Per-Employee Hours & Extra Hours Analytics
router.get('/employee-hours', getEmployeeHoursAnalytics);

// 4. Regularization Workflow
router.post('/regularization/apply', applyRegularization);
router.get('/regularization/my-requests', getMyRegularizations);
router.get('/regularization/all', requirePermission('attendance', 'read'), getAllRegularizations);
router.put('/regularization/:id/review', requirePermission('attendance', 'approve'), reviewRegularization);
router.delete('/regularization/:id', cancelRegularization);

// 5. Monthly Matrix & Muster Roll
router.get('/monthly-matrix', getMonthlyMatrix);
router.get('/muster-roll', requirePermission('attendance', 'read'), getMusterRoll);

// 6. Shift Management & Rostering
router.get('/shifts', getShifts);
router.post('/shifts', requirePermission('attendance', 'create'), createShift);
router.put('/shifts/:id', requirePermission('attendance', 'update'), updateShift);
router.delete('/shifts/:id', requirePermission('attendance', 'delete'), deleteShift);
router.get('/shifts/roster', requirePermission('attendance', 'read'), getShiftRoster);
router.post('/shifts/assign', requirePermission('attendance', 'update'), assignShiftSchedule);

// 7. Shift Swaps
router.post('/shifts/swap/request', requestShiftSwap);
router.get('/shifts/swap/my-requests', getMyShiftSwaps);
router.get('/shifts/swap/pending', requirePermission('attendance', 'approve'), getPendingShiftSwaps);
router.put('/shifts/swap/:id/review', requirePermission('attendance', 'approve'), reviewShiftSwap);

// 8. General & Team History
router.get('/my-history', getMyAttendanceHistory);
router.get('/all', requirePermission('attendance', 'read'), getAllAttendance);
router.put('/:id/status', requirePermission('attendance', 'approve'), updateAttendanceStatus);

export default router;
