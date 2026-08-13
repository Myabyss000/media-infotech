import { Router } from 'express';
import { createLeaveRequest, getMyLeaveRequests, getAllLeaveRequests, updateLeaveStatus } from '../controllers/leave.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createLeaveRequest);
router.get('/my-requests', getMyLeaveRequests);
router.get('/all', requirePermission('leave', 'read'), getAllLeaveRequests);
router.put('/:id/status', requirePermission('leave', 'approve'), updateLeaveStatus);

export default router;
