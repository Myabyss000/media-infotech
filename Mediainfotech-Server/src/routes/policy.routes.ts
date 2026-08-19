import { Router } from 'express';
import {
  getCompanyPolicies,
  createCompanyPolicy,
  updateCompanyPolicy,
  deleteCompanyPolicy,
  acknowledgePolicy,
} from '../controllers/policy.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getCompanyPolicies);
router.post('/', requirePermission('hr', 'create'), createCompanyPolicy);
router.put('/:id', requirePermission('hr', 'update'), updateCompanyPolicy);
router.delete('/:id', requirePermission('hr', 'delete'), deleteCompanyPolicy);
router.post('/:id/acknowledge', acknowledgePolicy);

export default router;
