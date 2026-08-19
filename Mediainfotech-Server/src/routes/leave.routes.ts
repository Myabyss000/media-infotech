import { Router } from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
  getMyLeaveBalances,
  getAllLeaveBalances,
  setEmployeeLeaveQuota,
  creditEmployeeLeave,
  getTeamLeaveCalendar,
} from '../controllers/leave.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Leave Quota & Balances
router.get('/balances', getMyLeaveBalances);
router.get('/all-balances', requirePermission('leave', 'read'), getAllLeaveBalances);
router.put('/set-quota', setEmployeeLeaveQuota);
router.post('/credit-leave', creditEmployeeLeave);

// Team Out-of-Office Calendar
router.get('/team-calendar', getTeamLeaveCalendar);

// Applications & Approvals
router.post('/', createLeaveRequest);
router.get('/my-requests', getMyLeaveRequests);
router.get('/all', requirePermission('leave', 'read'), getAllLeaveRequests);
router.put('/:id/status', requirePermission('leave', 'approve'), updateLeaveStatus);

export default router;

