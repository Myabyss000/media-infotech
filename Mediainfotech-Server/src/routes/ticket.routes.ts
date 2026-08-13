import { Router } from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  updateTicket,
  deleteTicket,
} from '../controllers/ticket.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('tickets', 'read'), getTickets);
router.get('/:id', requirePermission('tickets', 'read'), getTicketById);
router.post('/', requirePermission('tickets', 'create'), createTicket);
router.put('/:id/status', requirePermission('tickets', 'update'), updateTicketStatus);
router.put('/:id', requirePermission('tickets', 'update'), updateTicket);
router.delete('/:id', requirePermission('tickets', 'delete'), deleteTicket);

export default router;
