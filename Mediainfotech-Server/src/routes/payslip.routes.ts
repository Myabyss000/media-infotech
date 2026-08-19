import { Router } from 'express';
import {
  getMyPayslips,
  getAllPayslips,
  createPayslip,
  getSalaryStructure,
  setSalaryStructure,
  calculateMonthlyPayroll,
  getPayrollAnalytics,
  deletePayslip,
} from '../controllers/payslip.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

// CTC & Salary Structure
router.get('/salary-structure', getSalaryStructure);
router.post('/salary-structure', setSalaryStructure);

// Smart Analytics & 1-Click Automated Attendance-to-Payroll Calculation
router.get('/analytics', getPayrollAnalytics);
router.post('/calculate', calculateMonthlyPayroll);

// Payslip Records
router.get('/my-payslips', getMyPayslips);
router.get('/all', requirePermission('payslips', 'read'), getAllPayslips);
router.post('/', requirePermission('payslips', 'create'), upload.single('payslip'), createPayslip);
router.delete('/:id', requirePermission('payslips', 'delete'), deletePayslip);

export default router;
