import { Router } from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  addClientService,
  addClientTransaction,
  addBusinessHistory,
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

// Clients
router.get('/', requirePermission('clients', 'read'), getClients);
router.get('/:id', requirePermission('clients', 'read'), getClientById);
router.post('/', requirePermission('clients', 'create'), createClient);
router.put('/:id', requirePermission('clients', 'update'), updateClient);

// Client Sub-resources
router.post('/:id/services', requirePermission('clients', 'update'), addClientService);
router.post('/:id/transactions', requirePermission('clients', 'update'), addClientTransaction);
router.post('/:id/history', requirePermission('clients', 'update'), addBusinessHistory);

export default router;
