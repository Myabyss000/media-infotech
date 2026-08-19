import { Router } from 'express';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignVehicle,
  returnVehicle,
} from '../controllers/vehicle.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('vehicles', 'read'), getVehicles);
router.post('/', requirePermission('vehicles', 'create'), createVehicle);
router.put('/:id', requirePermission('vehicles', 'update'), updateVehicle);
router.delete('/:id', requirePermission('vehicles', 'delete'), deleteVehicle);
router.post('/:id/assign', requirePermission('vehicles', 'update'), assignVehicle);
router.put('/:id/return', requirePermission('vehicles', 'update'), returnVehicle);

export default router;
