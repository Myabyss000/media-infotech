import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
} from '../controllers/group.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('groups', 'read'), getGroups);
router.get('/:id', requirePermission('groups', 'read'), getGroupById);
router.post('/', requirePermission('groups', 'create'), createGroup);
router.put('/:id', requirePermission('groups', 'update'), updateGroup);
router.delete('/:id', requirePermission('groups', 'delete'), deleteGroup);

router.post('/:id/members', requirePermission('groups', 'update'), addGroupMember);
router.delete('/:id/members/:userId', requirePermission('groups', 'update'), removeGroupMember);

export default router;
