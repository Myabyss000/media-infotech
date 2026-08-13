import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, updateUserRole, deleteUser } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('users', 'read'), getUsers);
router.get('/:id', requirePermission('users', 'read'), getUserById);
router.post('/', requirePermission('users', 'create'), createUser);
router.put('/:id', requirePermission('users', 'update'), updateUser);
router.put('/:id/role', requirePermission('users', 'update'), updateUserRole);
router.delete('/:id', requirePermission('users', 'delete'), deleteUser);

export default router;
