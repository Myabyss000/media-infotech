import { Router } from 'express';
import {
  getClients,
  getClientStats,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  addClientService,
  deleteClientService,
  addClientTransaction,
  deleteClientTransaction,
  addBusinessHistory,
  deleteBusinessHistory,
  getServiceTypes,
  createServiceType,
} from '../controllers/client.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Service types
router.get('/service-types', requirePermission('clients', 'read'), getServiceTypes);
router.post('/service-types', requirePermission('clients', 'create'), createServiceType);

// Client Stats / Overview
router.get('/stats', requirePermission('clients', 'read'), getClientStats);

// Clients CRUD
router.get('/', requirePermission('clients', 'read'), getClients);
router.get('/:id', requirePermission('clients', 'read'), getClientById);
router.post('/', requirePermission('clients', 'create'), createClient);
router.put('/:id', requirePermission('clients', 'update'), updateClient);
router.delete('/:id', requirePermission('clients', 'delete'), deleteClient);

// Client Sub-resources
router.post('/:id/services', requirePermission('clients', 'update'), addClientService);
router.delete('/:id/services/:serviceId', requirePermission('clients', 'update'), deleteClientService);

router.post('/:id/transactions', requirePermission('clients', 'update'), addClientTransaction);
router.delete('/:id/transactions/:transactionId', requirePermission('clients', 'update'), deleteClientTransaction);

router.post('/:id/history', requirePermission('clients', 'update'), addBusinessHistory);
router.delete('/:id/history/:historyId', requirePermission('clients', 'update'), deleteBusinessHistory);

export default router;
