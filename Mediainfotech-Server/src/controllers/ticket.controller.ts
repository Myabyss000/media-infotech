import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { TicketPriority, TicketStatus, InventoryStatus } from '@prisma/client';

export const getTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      priority,
      assignedGroupId,
      clientId,
      vehicleId,
      search,
      timeRange,
      startDate,
      endDate,
      page = '1',
      limit = '15',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: any = {};
    if (status) where.status = status as TicketStatus;
    if (priority) where.priority = priority as TicketPriority;
    if (assignedGroupId) where.assignedGroupId = assignedGroupId as string;
    if (clientId) where.clientId = clientId as string;
    if (vehicleId) where.vehicleId = vehicleId as string;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search as string, mode: 'insensitive' } },
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Time Range & Date Filter
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
          createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedGroup: { select: { id: true, name: true, color: true } },
          client: { select: { id: true, name: true, companyName: true, phone: true } },
          vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
          inventoryItems: {
            include: {
              inventoryItem: { select: { id: true, deviceName: true, barcode: true, category: true, condition: true, status: true } },
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
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
      statusCounts[c.status] = c._count.status;
    });

    res.json({
      data: tickets,
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
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        assignedGroup: {
          include: {
            members: {
              include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
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
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
};

export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, priority, assignedGroupId, clientId, vehicleId, inventoryItemIds } = req.body;
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
        createdById: userId,
        assignedGroupId: assignedGroupId || null,
        clientId: clientId || null,
        vehicleId: vehicleId || null,
        inventoryItems: {
          create: itemIdsToAttach.map((itemId: string) => ({
            inventoryItemId: itemId,
            quantity: 1,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
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
    const { status, resolutionNote, inventoryItemIds } = req.body;

    if (!status || !Object.values(TicketStatus).includes(status)) {
      res.status(400).json({ error: 'Valid status is required' });
      return;
    }

    const itemIdsToAttach: string[] = Array.isArray(inventoryItemIds) ? inventoryItemIds : [];

    if (itemIdsToAttach.length > 0) {
      // Connect new inventory items used during resolution/solution
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

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: status as TicketStatus,
        ...(resolutionNote !== undefined && { resolutionNote }),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedGroup: { select: { id: true, name: true } },
        inventoryItems: { include: { inventoryItem: true } },
      },
    });

    res.json({ message: `Ticket status updated to ${status}`, data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
};

export const updateTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, description, priority, assignedGroupId, clientId, vehicleId, resolutionNote } = req.body;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(priority && { priority: priority as TicketPriority }),
        ...(assignedGroupId !== undefined && { assignedGroupId }),
        ...(clientId !== undefined && { clientId }),
        ...(vehicleId !== undefined && { vehicleId }),
        ...(resolutionNote !== undefined && { resolutionNote }),
      },
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

export const deleteTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.ticket.delete({ where: { id } });
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};
