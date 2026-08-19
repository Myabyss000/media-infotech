import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  getGroupAnnouncements,
  createGroupAnnouncement,
  deleteGroupAnnouncement,
  createAnnouncementComment,
  deleteAnnouncementComment,
} from '../controllers/group.controller';
import {
  getGroupInventoryItems,
  assignGroupInventoryItems,
  returnGroupInventoryItem,
} from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('groups', 'read'), getGroups);
router.get('/:id', requirePermission('groups', 'read'), getGroupById);
router.post('/', requirePermission('groups', 'create'), createGroup);
router.put('/:id', requirePermission('groups', 'update'), updateGroup);
router.delete('/:id', requirePermission('groups', 'delete'), deleteGroup);

// Member Roster
router.post('/:id/members', requirePermission('groups', 'update'), addGroupMember);
router.delete('/:id/members/:userId', requirePermission('groups', 'update'), removeGroupMember);

// Group Announcements & Q&A Discussion Hub
router.get('/:id/announcements', requirePermission('groups', 'read'), getGroupAnnouncements);
router.post('/:id/announcements', requirePermission('groups', 'update'), createGroupAnnouncement);
router.delete('/:id/announcements/:announcementId', requirePermission('groups', 'update'), deleteGroupAnnouncement);
router.post('/:id/announcements/:announcementId/comments', requirePermission('groups', 'read'), createAnnouncementComment);
router.delete('/:id/announcements/:announcementId/comments/:commentId', requirePermission('groups', 'read'), deleteAnnouncementComment);

// Group Hardware Inventory & Assets
router.get('/:id/inventory', requirePermission('groups', 'read'), getGroupInventoryItems);
router.post('/:id/inventory', requirePermission('groups', 'update'), assignGroupInventoryItems);
router.post('/:id/inventory/:itemId/return', requirePermission('groups', 'update'), returnGroupInventoryItem);

export default router;
