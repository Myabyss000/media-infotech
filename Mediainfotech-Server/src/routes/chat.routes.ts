import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
  getChannels,
  getOrCreateDirectChannel,
  createChannel,
  getChannelMessages,
  sendMessage,
  markChannelAsRead,
  getChatUsers,
} from '../controllers/chat.controller';

const router = Router();

// All chat routes require JWT authentication
router.use(authenticateToken);

// Channel & DM Routes
router.get('/channels', getChannels);
router.post('/channels', createChannel);
router.post('/direct', getOrCreateDirectChannel);
router.get('/users', getChatUsers);

// Messages Routes
router.get('/channels/:id/messages', getChannelMessages);
router.post('/channels/:id/messages', sendMessage);
router.post('/channels/:id/read', markChannelAsRead);

export default router;
