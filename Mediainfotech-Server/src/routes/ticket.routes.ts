import { Router } from 'express';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  updateTicket,
  deleteTicket,
  addTicketComment,
  deleteTicketComment,
  consumeTicketInventory,
  markTicketItemForReturn,
  retrieveAndReplaceTicketItem,
} from '../controllers/ticket.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('tickets', 'read'), getTickets);
router.get('/:id', requirePermission('tickets', 'read'), getTicketById);
router.post('/', requirePermission('tickets', 'create'), createTicket);
// Ticket Status Update with Proof Photo upload support
router.put('/:id/status', upload.single('proofPhoto'), requirePermission('tickets', 'update'), updateTicketStatus);
router.put('/:id', requirePermission('tickets', 'update'), updateTicket);
router.delete('/:id', requirePermission('tickets', 'delete'), deleteTicket);

// Ticket Comments & Activity Timeline with Photo Upload Support
router.post('/:id/comments', upload.single('photo'), requirePermission('tickets', 'read'), addTicketComment);
router.delete('/:id/comments/:commentId', requirePermission('tickets', 'read'), deleteTicketComment);

// In-Field Equipment Consumption & Barcode Installation on Ticket
router.post('/:id/consume-inventory', upload.single('photo'), requirePermission('tickets', 'read'), consumeTicketInventory);
router.post('/:id/inventory/:itemId/mark-return', requirePermission('tickets', 'update'), markTicketItemForReturn);
router.post('/:id/retrieve-and-replace', requirePermission('tickets', 'update'), retrieveAndReplaceTicketItem);

export default router;
