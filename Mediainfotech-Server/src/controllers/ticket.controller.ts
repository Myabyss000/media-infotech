import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { TicketPriority, TicketStatus, InventoryStatus } from '@prisma/client';

export const getTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const {
      status,
      priority,
      assignedGroupId,
      assignedUserId,
      clientId,
      vehicleId,
      search,
      timeRange,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: any = {};
    if (status && status !== 'ALL') where.status = status as TicketStatus;
    if (priority && priority !== 'ALL') where.priority = priority as TicketPriority;
    if (assignedGroupId && assignedGroupId !== 'ALL') where.assignedGroupId = assignedGroupId as string;
    if (assignedUserId && assignedUserId !== 'ALL') where.assignedUserId = assignedUserId as string;
    if (clientId) where.clientId = clientId as string;
    if (vehicleId) where.vehicleId = vehicleId as string;

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'HR') {
      where.OR = [
        { assignedUserId: userId },
        { assignedGroup: { members: { some: { userId } } } },
        { createdById: userId },
      ];
    }

    if (search) {
      const searchConditions = [
        { ticketNumber: { contains: search as string, mode: 'insensitive' } },
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { client: { name: { contains: search as string, mode: 'insensitive' } } },
        { client: { companyName: { contains: search as string, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (timeRange || (startDate && endDate)) {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (timeRange === 'TODAY') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (timeRange === 'THIS_WEEK') {
        const temp = new Date();
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(temp.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
      } else if (timeRange === 'THIS_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date();
      } else if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
      }

      if (start && end) {
        where.createdAt = {
          gte: start,
          lte: end,
        };
      }
    }

    const [tickets, total, counts] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
          assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, designation: true } },
          resolvedBy: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, role: true, designation: true } },
          assignedGroup: {
            select: {
              id: true,
              name: true,
              color: true,
              locationName: true,
              locationAddress: true,
              members: {
                select: {
                  user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                },
              },
            },
          },
          client: { select: { id: true, name: true, companyName: true, phone: true, address: true, city: true } },
          vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
          inventoryItems: {
            include: {
              inventoryItem: { select: { id: true, deviceName: true, barcode: true, category: true, condition: true, status: true } },
            },
          },
          comments: {
            include: {
              author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { comments: true, inventoryItems: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
    ]);

    const statusCounts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    counts.forEach((c) => {
      statusCounts[c.status as keyof typeof statusCounts] = c._count.status;
    });

    const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    // Non-managers/employees cannot see GPS coordinates
    const sanitizedTickets = tickets.map((t) => {
      if (!isManagerOrAdmin) {
        const { resolveLat, resolveLng, resolveAddress, resolveAccuracy, ...rest } = t;
        return rest;
      }
      return t;
    });

    res.json({
      data: sanitizedTickets,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      statusCounts,
    });
  } catch (error) {
    console.error('getTickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getTicketById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatar: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, designation: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, role: true, designation: true } },
        assignedGroup: {
          include: {
            members: {
              include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, avatar: true } } },
            },
          },
        },
        client: true,
        vehicle: true,
        inventoryItems: {
          include: {
            inventoryItem: true,
          },
        },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // Access control check: If non-admin/manager, verify membership/assignment
    if (!isManagerOrAdmin) {
      const isAssignedUser = ticket.assignedUserId === userId;
      const isCreator = ticket.createdById === userId;
      const isGroupMember = ticket.assignedGroup?.members.some((m: any) => m.userId === userId);
      if (!isAssignedUser && !isCreator && !isGroupMember) {
        res.status(403).json({ error: 'Access denied: You are not assigned to this ticket.' });
        return;
      }

      // Hide GPS audit log from employees
      const { resolveLat, resolveLng, resolveAddress, resolveAccuracy, ...rest } = ticket;
      res.json(rest);
      return;
    }

    res.json(ticket);
  } catch (error) {
    console.error('getTicketById error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
};

export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedGroupId,
      assignedUserId,
      clientId,
      vehicleId,
      inventoryItemIds,
      proofPhoto,
    } = req.body;
    const userId = req.user?.id;

    if (!title || !description || !userId) {
      res.status(400).json({ error: 'Title and description are required' });
      return;
    }

    const count = await prisma.ticket.count();
    const year = new Date().getFullYear();
    const ticketNumber = `TCK-${year}-${String(count + 1).padStart(4, '0')}`;

    const itemIdsToAttach: string[] = Array.isArray(inventoryItemIds) ? inventoryItemIds : [];

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        priority: (priority as TicketPriority) || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: userId,
        assignedGroupId: assignedGroupId || null,
        assignedUserId: assignedUserId || null,
        clientId: clientId || null,
        vehicleId: vehicleId || null,
        proofPhoto: proofPhoto || null,
        inventoryItems: {
          create: itemIdsToAttach.map((itemId: string) => ({
            inventoryItemId: itemId,
            quantity: 1,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        assignedGroup: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, companyName: true } },
        vehicle: { select: { id: true, registrationNo: true } },
        inventoryItems: { include: { inventoryItem: true } },
      },
    });

    // Mark inventory items as ASSIGNED
    if (itemIdsToAttach.length > 0) {
      await prisma.inventoryItem.updateMany({
        where: { id: { in: itemIdsToAttach } },
        data: { status: InventoryStatus.ASSIGNED },
      });
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error('createTicket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const updateTicketStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      status,
      resolutionNote,
      resolveLat,
      resolveLng,
      resolveAddress,
      resolveAccuracy,
      inventoryItemIds,
    } = req.body;

    if (!status || !Object.values(TicketStatus).includes(status)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }

    const userRole = req.user?.role;
    const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentTicket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const currentStatus = currentTicket.status;

    // Strict Status Rules:
    // - Employees can ONLY move forward: OPEN -> IN_PROGRESS or IN_PROGRESS -> RESOLVED
    // - Only Product Managers and Admins can reverse or close tickets
    if (!isManagerOrAdmin) {
      const isForwardOpenToProgress = currentStatus === 'OPEN' && status === 'IN_PROGRESS';
      const isForwardProgressToResolved = currentStatus === 'IN_PROGRESS' && status === 'RESOLVED';

      if (!isForwardOpenToProgress && !isForwardProgressToResolved) {
        res.status(403).json({
          error: 'Permission denied: Employees can only move tickets from Open to In Progress, or In Progress to Resolved. Only Product Managers and Admins can reverse or close tickets.',
        });
        return;
      }
    }

    let photoUrl = req.body.proofPhoto;
    if (req.file) {
      photoUrl = `/uploads/ticket-photos/${req.file.filename}`;
    }

    let itemIdsToAttach: string[] = [];
    if (Array.isArray(inventoryItemIds)) {
      itemIdsToAttach = inventoryItemIds;
    } else if (typeof inventoryItemIds === 'string') {
      try {
        itemIdsToAttach = JSON.parse(inventoryItemIds);
      } catch {
        itemIdsToAttach = inventoryItemIds ? [inventoryItemIds] : [];
      }
    }

    if (itemIdsToAttach.length > 0) {
      for (const itemId of itemIdsToAttach) {
        await prisma.ticketInventoryItem.upsert({
          where: { ticketId_inventoryItemId: { ticketId: id, inventoryItemId: itemId } },
          update: {},
          create: { ticketId: id, inventoryItemId: itemId, quantity: 1 },
        });
      }

      await prisma.inventoryItem.updateMany({
        where: { id: { in: itemIdsToAttach } },
        data: { status: InventoryStatus.ASSIGNED },
      });
    }

    const updateData: any = {
      status: status as TicketStatus,
    };

    if (resolutionNote !== undefined) {
      updateData.resolutionNote = resolutionNote;
    }
    if (photoUrl !== undefined) {
      updateData.proofPhoto = photoUrl;
    }

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = req.user?.id;
      if (resolveLat !== undefined && resolveLat !== null && resolveLat !== '') {
        updateData.resolveLat = parseFloat(resolveLat);
      }
      if (resolveLng !== undefined && resolveLng !== null && resolveLng !== '') {
        updateData.resolveLng = parseFloat(resolveLng);
      }
      if (resolveAddress) {
        updateData.resolveAddress = resolveAddress;
      }
      if (resolveAccuracy !== undefined && resolveAccuracy !== null && resolveAccuracy !== '') {
        updateData.resolveAccuracy = parseFloat(resolveAccuracy);
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true, designation: true } },
        assignedGroup: { select: { id: true, name: true } },
        inventoryItems: { include: { inventoryItem: true } },
      },
    });

    res.json({ message: `Ticket status updated to ${status}`, data: ticket });
  } catch (error) {
    console.error('updateTicketStatus error:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
};

export const updateTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      title,
      description,
      priority,
      dueDate,
      assignedGroupId,
      assignedUserId,
      clientId,
      vehicleId,
      resolutionNote,
      proofPhoto,
    } = req.body;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority: priority as TicketPriority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assignedGroupId !== undefined && { assignedGroupId: assignedGroupId || null }),
        ...(assignedUserId !== undefined && { assignedUserId: assignedUserId || null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(vehicleId !== undefined && { vehicleId: vehicleId || null }),
        ...(resolutionNote !== undefined && { resolutionNote }),
        ...(proofPhoto !== undefined && { proofPhoto }),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        assignedGroup: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, companyName: true } },
        vehicle: { select: { id: true, registrationNo: true } },
      },
    });

    res.json(ticket);
  } catch (error) {
    console.error('updateTicket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

export const deleteTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied: Only System Admins can delete tickets.' });
      return;
    }

    const id = req.params.id as string;
    await prisma.ticket.delete({ where: { id } });
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('deleteTicket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};

export const addTicketComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.id as string;
    const { content } = req.body;
    const authorId = req.user?.id;

    let photoUrl: string | null = null;
    if (req.file) {
      photoUrl = `/uploads/ticket-photos/${req.file.filename}`;
    } else if (req.body.photo) {
      photoUrl = req.body.photo;
    }

    const trimmedContent = content ? content.trim() : '';

    if (!trimmedContent && !photoUrl) {
      res.status(400).json({ error: 'Comment message or photo is required' });
      return;
    }

    if (!authorId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        content: trimmedContent || (photoUrl ? 'Attached photo' : ''),
        photo: photoUrl,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('addTicketComment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const deleteTicketComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.commentId as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const comment = await prisma.ticketComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Only author or admin/manager can delete
    if (comment.authorId !== userId && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      res.status(403).json({ error: 'Access denied to delete this comment' });
      return;
    }

    await prisma.ticketComment.delete({
      where: { id: commentId },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('deleteTicketComment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
