import { Router } from 'express';
import { getMyPayslips, getAllPayslips, createPayslip } from '../controllers/payslip.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/my-payslips', getMyPayslips);
router.get('/all', requirePermission('payslips', 'read'), getAllPayslips);
router.post('/', requirePermission('payslips', 'create'), upload.single('payslip'), createPayslip);

export default router;
