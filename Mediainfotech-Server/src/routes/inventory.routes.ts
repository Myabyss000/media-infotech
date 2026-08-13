import { Router } from 'express';
import {
  getInventoryItems,
  getInventoryItemByBarcode,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('inventory', 'read'), getInventoryItems);
router.get('/barcode/:barcode', requirePermission('inventory', 'read'), getInventoryItemByBarcode);
router.get('/:id', requirePermission('inventory', 'read'), getInventoryItemById);
router.post('/', requirePermission('inventory', 'create'), createInventoryItem);
router.put('/:id', requirePermission('inventory', 'update'), updateInventoryItem);
router.delete('/:id', requirePermission('inventory', 'delete'), deleteInventoryItem);

export default router;
