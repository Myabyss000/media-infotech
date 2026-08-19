import { Router } from 'express';
import {
  getMyExpenses,
  getAllExpenses,
  createExpenseClaim,
  updateExpenseStatus,
} from '../controllers/expense.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/my-claims', getMyExpenses);
router.get('/all', requirePermission('payroll', 'read'), getAllExpenses);
router.post('/', createExpenseClaim);
router.put('/:id/status', requirePermission('payroll', 'update'), updateExpenseStatus);

export default router;
