import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, designation: true } },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

export const getGroupById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, designation: true, department: true } },
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};

export const createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, color, memberIds } = req.body;
    const userId = req.user?.id;

    if (!name || !userId) {
      res.status(400).json({ error: 'Group name is required' });
      return;
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
        color: color || '#3b82f6',
        createdById: userId,
        members: {
          create: [
            { userId, role: 'admin' },
            ...(Array.isArray(memberIds)
              ? memberIds
                  .filter((mId: string) => mId !== userId)
                  .map((mId: string) => ({ userId: mId, role: 'member' }))
              : []),
          ],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const updateGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, color, isActive } = req.body;

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' });
  }
};

export const deleteGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.group.delete({ where: { id } });
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

export const addGroupMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to add group member' });
  }
};

export const removeGroupMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.params.userId as string;
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: id, userId } },
    });

    res.json({ message: 'Member removed from group' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove group member' });
  }
};
