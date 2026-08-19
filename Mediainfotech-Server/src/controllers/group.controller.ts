import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const where: any = {};

    // Regular employees only see groups where they are a member
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      where.members = {
        some: {
          userId: userId,
        },
      };
    }

    const groups = await prisma.group.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true, status: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, designation: true } },
          },
        },
        announcements: {
          select: { id: true, title: true, priority: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        _count: { select: { members: true, announcements: true, inventoryItems: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groups);
  } catch (error) {
    console.error('getGroups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

export const getGroupById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true, status: true, fuelType: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, designation: true, department: true } },
          },
        },
        announcements: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
            comments: {
              include: {
                author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        },
        inventoryItems: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Access control check: If non-admin/manager, verify membership
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      const isMember = group.members.some((m: any) => m.userId === userId);
      if (!isMember) {
        res.status(403).json({ error: 'Access denied: You are not a member of this group.' });
        return;
      }
    }

    res.json(group);
  } catch (error) {
    console.error('getGroupById error:', error);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
};

export const createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      res.status(403).json({ error: 'Access denied: Strictly Admins, Managers, and HR can create groups.' });
      return;
    }

    const {
      name,
      description,
      color = '#3b82f6',
      locationName,
      locationAddress,
      latitude,
      longitude,
      clientId,
      vehicleId,
      memberIds,
      barcodes,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Group name is required' });
      return;
    }

    // Build member entries array (Creator + any chosen memberIds)
    const memberEntries: { userId: string; role: string }[] = [
      { userId: req.user!.id, role: 'leader' },
    ];
    if (Array.isArray(memberIds)) {
      memberIds.forEach((uId: string) => {
        if (uId && uId !== req.user!.id && !memberEntries.some((m) => m.userId === uId)) {
          memberEntries.push({ userId: uId, role: 'member' });
        }
      });
    }

    const group = await (prisma.group as any).create({
      data: {
        name,
        description,
        color,
        locationName,
        locationAddress,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        clientId: clientId || null,
        vehicleId: vehicleId || null,
        createdById: req.user!.id,
        members: {
          create: memberEntries,
        },
      },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, designation: true } },
          },
        },
      },
    });

    // If initial barcodes were provided during group creation, assign them
    if (Array.isArray(barcodes) && barcodes.length > 0) {
      const validCodes = barcodes.map((b: string) => b.trim().toUpperCase()).filter(Boolean);
      if (validCodes.length > 0) {
        const items = await prisma.inventoryItem.findMany({
          where: { barcode: { in: validCodes } },
        });

        for (const item of items) {
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              assignedGroupId: group.id,
              assignedUserId: null,
              assignedClientId: null,
              assignedVehicleId: null,
              status: 'ASSIGNED',
            },
          });

          await prisma.inventoryLog.create({
            data: {
              inventoryItemId: item.id,
              performedById: req.user!.id,
              action: 'CHECK_OUT',
              notes: `Equipment allocated during group creation: ${group.name}`,
            },
          });
        }
      }
    }

    res.status(201).json(group);
  } catch (error) {
    console.error('createGroup error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      res.status(403).json({ error: 'Access denied: Strictly Admins, Managers, and HR can edit groups.' });
      return;
    }

    const id = req.params.id as string;
    const {
      name,
      description,
      color,
      isActive,
      locationName,
      locationAddress,
      latitude,
      longitude,
      clientId,
      vehicleId,
      memberIds,
      barcodes,
    } = req.body;

    const group = await (prisma.group as any).update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive }),
        ...(locationName !== undefined && { locationName }),
        ...(locationAddress !== undefined && { locationAddress }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(vehicleId !== undefined && { vehicleId: vehicleId || null }),
      },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, designation: true } },
          },
        },
      },
    });

    // If memberIds are provided during update, sync members
    if (Array.isArray(memberIds)) {
      const existingMembers = await prisma.groupMember.findMany({
        where: { groupId: id },
        select: { userId: true },
      });
      const existingUserIds = existingMembers.map((m) => m.userId);

      for (const uId of memberIds) {
        if (!existingUserIds.includes(uId)) {
          await prisma.groupMember.create({
            data: { groupId: id, userId: uId, role: 'member' },
          });
        }
      }
    }

    // If barcodes were provided during update, assign them to group
    if (Array.isArray(barcodes) && barcodes.length > 0) {
      const validCodes = barcodes.map((b: string) => b.trim().toUpperCase()).filter(Boolean);
      if (validCodes.length > 0) {
        const items = await prisma.inventoryItem.findMany({
          where: { barcode: { in: validCodes } },
        });

        for (const item of items) {
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              assignedGroupId: group.id,
              assignedUserId: null,
              assignedClientId: null,
              assignedVehicleId: null,
              status: 'ASSIGNED',
            },
          });

          await prisma.inventoryLog.create({
            data: {
              inventoryItemId: item.id,
              performedById: req.user!.id,
              action: 'CHECK_OUT',
              notes: `Equipment allocated during group update: ${group.name}`,
            },
          });
        }
      }
    }

    res.json(group);
  } catch (error) {
    console.error('updateGroup error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      res.status(403).json({ error: 'Access denied: Strictly Admins, Managers, and HR can delete groups.' });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            tickets: true,
            inventoryItems: true,
            announcements: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Set assignedGroupId = null for any inventory items assigned to this group
    await prisma.inventoryItem.updateMany({
      where: { assignedGroupId: id },
      data: { assignedGroupId: null },
    });

    // Set assignedGroupId = null for any tickets assigned to this group
    await prisma.ticket.updateMany({
      where: { assignedGroupId: id },
      data: { assignedGroupId: null },
    });

    await prisma.group.delete({ where: { id } });
    res.json({ message: `Group "${existing.name}" deleted successfully` });
  } catch (error) {
    console.error('deleteGroup error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

export const addGroupMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      res.status(403).json({ error: 'Access denied: Strictly Admins, Managers, and HR can add group members.' });
      return;
    }

    const id = req.params.id as string;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Check if user is already a member of this group
    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    if (existing) {
      res.status(400).json({ error: 'User is already a member of this group' });
      return;
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId,
        role,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    res.status(201).json(member);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(400).json({ error: 'User is already a member of this group' });
      return;
    }
    console.error('addGroupMember error:', error);
    res.status(500).json({ error: 'Failed to add group member' });
  }
};

export const removeGroupMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      res.status(403).json({ error: 'Access denied: Strictly Admins, Managers, and HR can remove group members.' });
      return;
    }

    const id = req.params.id as string;
    const userId = req.params.userId as string;
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: id, userId } },
    });

    res.json({ message: 'Member removed from group' });
  } catch (error) {
    console.error('removeGroupMember error:', error);
    res.status(500).json({ error: 'Failed to remove group member' });
  }
};

// ============================================================================
// GROUP ANNOUNCEMENTS & DISCUSSION HUB
// ============================================================================

export const getGroupAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      const isMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: userId! } },
      });
      if (!isMember) {
        res.status(403).json({ error: 'Access denied: You are not a member of this group.' });
        return;
      }
    }

    const announcements = await prisma.groupAnnouncement.findMany({
      where: { groupId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(announcements);
  } catch (error) {
    console.error('getGroupAnnouncements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

export const createGroupAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.id as string;
    const authorId = req.user?.id;
    const { title, content, doList, dontList, priority = 'NORMAL', pinned = false } = req.body;

    if (!title || !content || !authorId) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const announcement = await prisma.groupAnnouncement.create({
      data: {
        groupId,
        authorId,
        title,
        content,
        doList: doList || null,
        dontList: dontList || null,
        priority: priority as any,
        pinned: Boolean(pinned),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        comments: true,
      },
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error('createGroupAnnouncement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

export const deleteGroupAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const announcementId = req.params.announcementId as string;
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user?.role || '');

    const announcement = await prisma.groupAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }

    if (announcement.authorId !== req.user?.id && !isPrivileged) {
      res.status(403).json({ error: 'Access denied: You can only delete your own announcements' });
      return;
    }

    await prisma.groupAnnouncement.delete({ where: { id: announcementId } });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('deleteGroupAnnouncement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

export const createAnnouncementComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const announcementId = req.params.announcementId as string;
    const authorId = req.user?.id;
    const { content } = req.body;

    if (!content || !authorId) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const comment = await prisma.groupAnnouncementComment.create({
      data: {
        announcementId,
        authorId,
        content,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('createAnnouncementComment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const deleteAnnouncementComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.commentId as string;
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user?.role || '');

    const comment = await prisma.groupAnnouncementComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.authorId !== req.user?.id && !isPrivileged) {
      res.status(403).json({ error: 'Access denied: You can only delete your own comments' });
      return;
    }

    await prisma.groupAnnouncementComment.delete({ where: { id: commentId } });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('deleteAnnouncementComment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
