import { Router } from 'express';
import {
  getInventoryStats,
  getDevicePresets,
  seedInventoryPresets,
  bulkCreateInventoryItems,
  createInventoryWithSerials,
  lookupBarcodesForDispatch,
  getReturnCandidates,
  batchDispatchInventory,
  batchReturnInventory,
  getInventoryItems,
  getInventoryItemByBarcode,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  assignInventoryCustody,
  returnInventoryCustody,
  addInventoryLog,
  deleteInventoryItem,
  bulkDeleteInventoryItems,
  getInventoryAuditDocument,
  retrieveInstalledInventoryItem,
} from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Presets & Batch Catalog
router.get('/presets', requirePermission('inventory', 'read'), getDevicePresets);
router.post('/seed-presets', requirePermission('inventory', 'create'), seedInventoryPresets);
router.post('/bulk', requirePermission('inventory', 'create'), bulkCreateInventoryItems);
router.post('/batch-serials', requirePermission('inventory', 'create'), createInventoryWithSerials);
router.post('/lookup-serials', requirePermission('inventory', 'read'), lookupBarcodesForDispatch);
router.get('/return-candidates', requirePermission('inventory', 'read'), getReturnCandidates);
router.post('/batch-dispatch', requirePermission('inventory', 'update'), batchDispatchInventory);
router.post('/batch-return', requirePermission('inventory', 'update'), batchReturnInventory);
router.post('/bulk-delete', requirePermission('inventory', 'delete'), bulkDeleteInventoryItems);

// Financial & Status Metrics & Audit Documents
router.get('/stats', requirePermission('inventory', 'read'), getInventoryStats);
router.get('/reports/audit-document', requirePermission('inventory', 'read'), getInventoryAuditDocument);

// Field Retrieval & RMA Replacement
router.post('/retrieve-installed', requirePermission('inventory', 'update'), retrieveInstalledInventoryItem);

// Items CRUD
router.get('/', requirePermission('inventory', 'read'), getInventoryItems);
router.get('/barcode/:barcode', requirePermission('inventory', 'read'), getInventoryItemByBarcode);
router.get('/:id', requirePermission('inventory', 'read'), getInventoryItemById);
router.post('/', requirePermission('inventory', 'create'), createInventoryItem);
router.put('/:id', requirePermission('inventory', 'update'), updateInventoryItem);
router.delete('/:id', requirePermission('inventory', 'delete'), deleteInventoryItem);

// Custody Check-Out & Return Actions
router.post('/:id/assign', requirePermission('inventory', 'update'), assignInventoryCustody);
router.post('/:id/return', requirePermission('inventory', 'update'), returnInventoryCustody);
router.post('/:id/logs', requirePermission('inventory', 'update'), addInventoryLog);

export default router;
