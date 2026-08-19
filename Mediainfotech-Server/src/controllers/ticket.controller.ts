import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { TicketPriority, TicketStatus, InventoryStatus, InventoryLogAction, NotificationCategory, NotificationPriority } from '@prisma/client';
import { extractGpsFromPhoto } from '../utils/exif.utils';
import { notifyAdminsAndManagers, sendNotification, notifyGroupMembers } from '../services/notification.service';

export const getTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toUpperCase();

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
    if (status && status !== 'ALL' && status !== 'null' && status !== 'undefined') where.status = status as TicketStatus;
    if (priority && priority !== 'ALL' && priority !== 'null' && priority !== 'undefined') where.priority = priority as TicketPriority;
    if (assignedGroupId && assignedGroupId !== 'ALL' && assignedGroupId !== 'null' && assignedGroupId !== 'undefined') where.assignedGroupId = assignedGroupId as string;
    if (assignedUserId && assignedUserId !== 'ALL' && assignedUserId !== 'null' && assignedUserId !== 'undefined') where.assignedUserId = assignedUserId as string;
    if (clientId && clientId !== 'ALL' && clientId !== 'null' && clientId !== 'undefined') where.clientId = clientId as string;
    if (vehicleId && vehicleId !== 'ALL' && vehicleId !== 'null' && vehicleId !== 'undefined') where.vehicleId = vehicleId as string;

    const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR';

    if (!isManagerOrAdmin) {
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
              parent: {
                include: {
                  author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
                },
              },
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

    // Non-managers/employees cannot see GPS coordinates
    const sanitizedTickets = tickets.map((t) => {
      if (!isManagerOrAdmin) {
        const { resolveLat, resolveLng, resolveAddress, resolveAccuracy, comments, ...rest } = t;
        const sanitizedComments = (comments as any[])?.map((c: any) => {
          const { lat, lng, accuracy, address, ...cRest } = c;
          return cRest;
        });
        return { ...rest, comments: sanitizedComments };
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
    const userRole = (req.user?.role || '').toUpperCase();
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
            parent: {
              include: {
                author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
              },
            },
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
      const { resolveLat, resolveLng, resolveAddress, resolveAccuracy, comments, ...rest } = ticket;
      const sanitizedComments = (comments as any[])?.map((c: any) => {
        const { lat, lng, accuracy, address, ...cRest } = c;
        return cRest;
      });
      res.json({ ...rest, comments: sanitizedComments });
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

    let rawItemIdsToAttach: string[] = Array.isArray(inventoryItemIds) ? [...inventoryItemIds] : [];

    // If an assignedGroupId is provided, automatically find and attach all equipment items allocated to that group
    if (assignedGroupId) {
      const groupItems = await prisma.inventoryItem.findMany({
        where: { assignedGroupId },
        select: { id: true },
      });
      for (const gi of groupItems) {
        if (!rawItemIdsToAttach.includes(gi.id)) {
          rawItemIdsToAttach.push(gi.id);
        }
      }
    }

    // Deduplicate and verify all item IDs exist
    const uniqueIds = Array.from(new Set(rawItemIdsToAttach.filter(Boolean)));
    const validExistingItems = uniqueIds.length > 0
      ? await prisma.inventoryItem.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true },
        })
      : [];
    const validItemIds = validExistingItems.map((i) => i.id);

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
          create: validItemIds.map((itemId: string) => ({
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
    if (validItemIds.length > 0) {
      await prisma.inventoryItem.updateMany({
        where: { id: { in: validItemIds } },
        data: { status: InventoryStatus.ASSIGNED },
      });
    }

    // Real-Time Notification Dispatch
    try {
      const isUrgent = ticket.priority === TicketPriority.URGENT;
      const isHigh = ticket.priority === TicketPriority.HIGH;
      const notifPriority = isUrgent ? NotificationPriority.URGENT : isHigh ? NotificationPriority.HIGH : NotificationPriority.NORMAL;

      // 1. Notify Admins and Managers
      await notifyAdminsAndManagers({
        title: isUrgent ? `🚨 Critical Ticket Logged: ${ticket.ticketNumber}` : `🎫 New Ticket Logged: ${ticket.ticketNumber}`,
        message: `${ticket.title} (Priority: ${ticket.priority}) logged by ${ticket.createdBy?.firstName || 'User'}.`,
        category: NotificationCategory.TICKETS,
        priority: notifPriority,
        actionUrl: '/tickets',
        entityId: ticket.id,
        entityType: 'Ticket',
        excludeUserId: userId,
      });

      // 2. Notify Assigned Technician
      if (assignedUserId && assignedUserId !== userId) {
        await sendNotification({
          userId: assignedUserId,
          title: `🎫 Ticket #${ticket.ticketNumber} Assigned to You`,
          message: `You have been assigned: ${ticket.title}`,
          category: NotificationCategory.TICKETS,
          priority: notifPriority,
          actionUrl: '/tickets',
          entityId: ticket.id,
          entityType: 'Ticket',
        });
      }

      // 3. Notify Assigned Group Members
      if (assignedGroupId) {
        await notifyGroupMembers(assignedGroupId, {
          title: `🎫 Team Ticket #${ticket.ticketNumber} Assigned`,
          message: `New ticket assigned to your field team: ${ticket.title}`,
          category: NotificationCategory.TICKETS,
          priority: notifPriority,
          actionUrl: '/tickets',
          entityId: ticket.id,
          entityType: 'Ticket',
          excludeUserId: userId,
        });
      }
    } catch (notifErr) {
      console.error('Ticket creation notification error:', notifErr);
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
      const validItems = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIdsToAttach } },
        select: { id: true },
      });
      for (const item of validItems) {
        await prisma.ticketInventoryItem.upsert({
          where: { ticketId_inventoryItemId: { ticketId: id, inventoryItemId: item.id } },
          update: {},
          create: { ticketId: id, inventoryItemId: item.id, quantity: 1 },
        });
      }

      const validIds = validItems.map((i) => i.id);
      if (validIds.length > 0) {
        await prisma.inventoryItem.updateMany({
          where: { id: { in: validIds } },
          data: { status: InventoryStatus.ASSIGNED },
        });
      }
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

    // Real-time Notification on status update
    try {
      const isResolved = status === 'RESOLVED' || status === 'CLOSED';
      const actorName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'User';

      // 1. Notify Admins and Managers
      await notifyAdminsAndManagers({
        title: isResolved ? `✅ Ticket #${ticket.ticketNumber} ${status}` : `🔄 Ticket #${ticket.ticketNumber} Updated: ${status}`,
        message: `${ticket.title} updated to "${status}" by ${actorName}.`,
        category: NotificationCategory.TICKETS,
        priority: isResolved ? NotificationPriority.NORMAL : NotificationPriority.HIGH,
        actionUrl: '/tickets',
        entityId: ticket.id,
        entityType: 'Ticket',
        excludeUserId: req.user?.id,
      });

      // 2. Notify Ticket Creator if not the updater
      if (ticket.createdById && ticket.createdById !== req.user?.id) {
        await sendNotification({
          userId: ticket.createdById,
          title: `🎫 Your Ticket #${ticket.ticketNumber} is now ${status}`,
          message: `Update by ${actorName}: ${resolutionNote || ticket.title}`,
          category: NotificationCategory.TICKETS,
          priority: isResolved ? NotificationPriority.NORMAL : NotificationPriority.HIGH,
          actionUrl: '/tickets',
          entityId: ticket.id,
          entityType: 'Ticket',
        });
      }

      // 3. Notify Assigned User if not the updater
      if (ticket.assignedUserId && ticket.assignedUserId !== req.user?.id && ticket.assignedUserId !== ticket.createdById) {
        await sendNotification({
          userId: ticket.assignedUserId,
          title: `🎫 Assigned Ticket #${ticket.ticketNumber} Status: ${status}`,
          message: `${ticket.title} was updated by ${actorName}.`,
          category: NotificationCategory.TICKETS,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/tickets',
          entityId: ticket.id,
          entityType: 'Ticket',
        });
      }
    } catch (notifErr) {
      console.error('Ticket status notification error:', notifErr);
    }

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
    const { content, parentId, lat, lng, accuracy, address } = req.body;
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

    let parsedLat = lat !== undefined && lat !== null && lat !== '' && !isNaN(Number(lat)) ? Number(lat) : null;
    let parsedLng = lng !== undefined && lng !== null && lng !== '' && !isNaN(Number(lng)) ? Number(lng) : null;
    let parsedAccuracy = accuracy !== undefined && accuracy !== null && accuracy !== '' && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    let finalAddress = address ? String(address).trim() : null;

    // 1. If GPS not provided in request body, extract from uploaded photo's EXIF metadata
    if ((parsedLat === null || parsedLng === null) && req.file) {
      const exifGps = extractGpsFromPhoto(req.file.path);
      if (exifGps) {
        parsedLat = exifGps.lat;
        parsedLng = exifGps.lng;
        parsedAccuracy = 5;
      }
    }

    // 2. If coordinates are available but physical address is missing, perform server-side reverse geocoding
    if (parsedLat !== null && parsedLng !== null && !finalAddress) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'MediaInfotechServer/1.0' } }
        );
        if (geoRes.ok) {
          const geoData: any = await geoRes.json();
          if (geoData?.display_name) {
            finalAddress = geoData.display_name;
          }
        }
      } catch (e) {
        // reverse geocoding fallback
      }
    }

    // 3. Fallback for mobile devices and text updates if browser location or camera EXIF was restricted
    if (parsedLat === null || parsedLng === null) {
      try {
        const ticketInfo = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { client: true },
        });

        if (ticketInfo?.client?.address) {
          finalAddress = finalAddress || ticketInfo.client.address;
          try {
            const searchRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ticketInfo.client.address)}&limit=1`,
              { headers: { 'User-Agent': 'MediaInfotechServer/1.0' } }
            );
            if (searchRes.ok) {
              const searchData: any = await searchRes.json();
              if (searchData && searchData[0]) {
                parsedLat = parseFloat(searchData[0].lat);
                parsedLng = parseFloat(searchData[0].lon);
                parsedAccuracy = 15;
              }
            }
          } catch (e) {}
        } else if (ticketInfo?.resolveLat && ticketInfo?.resolveLng) {
          parsedLat = ticketInfo.resolveLat;
          parsedLng = ticketInfo.resolveLng;
          parsedAccuracy = ticketInfo.resolveAccuracy || 10;
          finalAddress = finalAddress || ticketInfo.resolveAddress;
        } else {
          // Approximate network/office location via IP
          try {
            const ipRes = await fetch('http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon');
            if (ipRes.ok) {
              const ipData: any = await ipRes.json();
              if (ipData?.status === 'success' && ipData.lat && ipData.lon) {
                parsedLat = ipData.lat;
                parsedLng = ipData.lon;
                parsedAccuracy = 50;
                finalAddress = `${ipData.city || ''}, ${ipData.regionName || ''} (Network Verified)`;
              }
            }
          } catch (e) {}

          if (!finalAddress) {
            finalAddress = photoUrl ? 'Field Technician On-Site Photo' : 'Field Technician On-Site Update';
          }
        }
      } catch (e) {}
    }

    const comment = await (prisma.ticketComment as any).create({
      data: {
        ticketId,
        authorId,
        content: trimmedContent || (photoUrl ? 'Attached photo' : ''),
        photo: photoUrl,
        lat: parsedLat,
        lng: parsedLng,
        accuracy: parsedAccuracy,
        address: finalAddress,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        parent: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          },
        },
      },
    });

    // Real-Time Notification on Ticket Comment
    try {
      const ticketInfo = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { ticketNumber: true, createdById: true, assignedUserId: true, assignedGroupId: true },
      });

      if (ticketInfo) {
        const commenterName = comment.author ? `${comment.author.firstName} ${comment.author.lastName || ''}`.trim() : 'User';
        const msg = `${commenterName}: "${(trimmedContent || 'Uploaded photo').slice(0, 80)}"`;

        // 1. Notify Admins & Managers
        await notifyAdminsAndManagers({
          title: `💬 New Note on Ticket #${ticketInfo.ticketNumber}`,
          message: msg,
          category: NotificationCategory.TICKETS,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/tickets',
          entityId: ticketId,
          entityType: 'Ticket',
          excludeUserId: authorId,
        });

        // 2. Notify Ticket Creator if not the author
        if (ticketInfo.createdById && ticketInfo.createdById !== authorId) {
          await sendNotification({
            userId: ticketInfo.createdById,
            title: `💬 Update on Ticket #${ticketInfo.ticketNumber}`,
            message: msg,
            category: NotificationCategory.TICKETS,
            priority: NotificationPriority.NORMAL,
            actionUrl: '/tickets',
            entityId: ticketId,
            entityType: 'Ticket',
          });
        }

        // 3. Notify Assigned Technician if not the author
        if (ticketInfo.assignedUserId && ticketInfo.assignedUserId !== authorId && ticketInfo.assignedUserId !== ticketInfo.createdById) {
          await sendNotification({
            userId: ticketInfo.assignedUserId,
            title: `💬 Note on Assigned Ticket #${ticketInfo.ticketNumber}`,
            message: msg,
            category: NotificationCategory.TICKETS,
            priority: NotificationPriority.NORMAL,
            actionUrl: '/tickets',
            entityId: ticketId,
            entityType: 'Ticket',
          });
        }
      }
    } catch (notifErr) {
      console.error('Ticket comment notification error:', notifErr);
    }

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

// In-Field Equipment Consumption & Barcode Installation on Ticket with GPS & Timestamps
export const consumeTicketInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.id as string;
    const { barcode, notes, lat, lng, accuracy, address } = req.body;
    const authorId = req.user?.id;

    if (!barcode || !barcode.trim()) {
      res.status(400).json({ error: 'Barcode / serial number is required' });
      return;
    }

    const cleanedBarcode = barcode.trim().toUpperCase();

    // 1. Verify Ticket Exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        client: true,
        assignedGroup: true,
        assignedUser: true,
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    // 2. Verify Inventory Item Exists
    const item = await prisma.inventoryItem.findUnique({
      where: { barcode: cleanedBarcode },
    });

    if (!item) {
      res.status(404).json({ error: `Equipment with barcode "${cleanedBarcode}" was not found in inventory` });
      return;
    }

    // Verify equipment custody: ensure item is in stock, assigned to user, or assigned to ticket's group
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user?.role || '');
    if (
      !isPrivileged &&
      item.assignedUserId &&
      item.assignedUserId !== authorId &&
      (!ticket.assignedGroupId || item.assignedGroupId !== ticket.assignedGroupId)
    ) {
      res.status(403).json({
        error: `Equipment "${cleanedBarcode}" is currently checked out to another user and cannot be installed without custody transfer`,
      });
      return;
    }

    // 3. Resolve Photo & GPS Location
    let photoUrl: string | null = null;
    if (req.file) {
      photoUrl = `/uploads/ticket-photos/${req.file.filename}`;
    } else if (req.body.photo) {
      photoUrl = req.body.photo;
    }

    let parsedLat = lat !== undefined && lat !== null && lat !== '' && !isNaN(Number(lat)) ? Number(lat) : null;
    let parsedLng = lng !== undefined && lng !== null && lng !== '' && !isNaN(Number(lng)) ? Number(lng) : null;
    let parsedAccuracy = accuracy !== undefined && accuracy !== null && accuracy !== '' && !isNaN(Number(accuracy)) ? Number(accuracy) : null;
    let finalAddress = address ? String(address).trim() : null;

    if ((parsedLat === null || parsedLng === null) && req.file) {
      const exifGps = extractGpsFromPhoto(req.file.path);
      if (exifGps) {
        parsedLat = exifGps.lat;
        parsedLng = exifGps.lng;
        parsedAccuracy = 5;
      }
    }

    if (parsedLat !== null && parsedLng !== null && !finalAddress) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'MediaInfotechServer/1.0' } }
        );
        if (geoRes.ok) {
          const geoData: any = await geoRes.json();
          if (geoData?.display_name) {
            finalAddress = geoData.display_name;
          }
        }
      } catch (e) {}
    }

    if (parsedLat === null || parsedLng === null) {
      if (ticket.client?.address) {
        finalAddress = finalAddress || ticket.client.address;
      } else if (ticket.resolveLat && ticket.resolveLng) {
        parsedLat = ticket.resolveLat;
        parsedLng = ticket.resolveLng;
        parsedAccuracy = ticket.resolveAccuracy || 10;
        finalAddress = finalAddress || ticket.resolveAddress;
      }
    }

    const currentUser = authorId
      ? await prisma.user.findUnique({
          where: { id: authorId },
          select: { id: true, firstName: true, lastName: true },
        })
      : null;

    const techName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Field Technician';

    const timestampStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const locationTag = parsedLat && parsedLng
      ? `GPS (${parsedLat.toFixed(5)}°, ${parsedLng.toFixed(5)}°)`
      : (finalAddress || 'On-site Client Location');

    const installLocationDesc = `Installed on Ticket #${ticket.ticketNumber} [${locationTag}]`;

    // 4. Atomic Transaction: Upsert TicketInventoryItem, Update InventoryItem, Create InventoryLog & Create TicketComment
    const [ticketInv, updatedItem, invLog, comment] = await prisma.$transaction([
      // A. Link & Mark Installed on Ticket
      prisma.ticketInventoryItem.upsert({
        where: {
          ticketId_inventoryItemId: {
            ticketId: ticket.id,
            inventoryItemId: item.id,
          },
        },
        update: {
          isInstalled: true,
          installedAt: new Date(),
          installedById: req.user?.id || null,
          installedLat: parsedLat,
          installedLng: parsedLng,
          installedAddress: finalAddress || locationTag,
          proofPhoto: photoUrl || null,
          isReturned: false,
          notes: notes || `Installed on-site by ${techName}`,
        },
        create: {
          ticketId: ticket.id,
          inventoryItemId: item.id,
          quantity: 1,
          isInstalled: true,
          installedAt: new Date(),
          installedById: req.user?.id || null,
          installedLat: parsedLat,
          installedLng: parsedLng,
          installedAddress: finalAddress || locationTag,
          proofPhoto: photoUrl || null,
          isReturned: false,
          notes: notes || `Installed on-site by ${techName}`,
        },
      }),

      // B. Update Inventory Item Custody & Status
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          status: InventoryStatus.ASSIGNED,
          isInstalledAtSite: true,
          installedAt: new Date(),
          installedTicketId: ticket.id,
          retrievedAt: null,
          assignedClientId: ticket.clientId || item.assignedClientId || null,
          assignedGroupId: ticket.assignedGroupId || item.assignedGroupId || null,
          assignedUserId: ticket.assignedUserId || req.user?.id || item.assignedUserId || null,
          location: installLocationDesc,
        },
      }),

      // C. Create Audit Log in Inventory History
      prisma.inventoryLog.create({
        data: {
          inventoryItemId: item.id,
          performedById: req.user?.id || null,
          action: InventoryLogAction.CHECK_OUT,
          notes: `Installed / Consumed on Ticket #${ticket.ticketNumber} by ${techName} at ${locationTag} on ${timestampStr}.${notes ? ` Remarks: ${notes}` : ''}`,
        },
      }),

      // D. Post Verified Comment in Ticket Discussion
      prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: authorId!,
          content: `🔧 [EQUIPMENT CONSUMED] Installed "${item.deviceName}" (Model: ${item.modelNumber || 'N/A'}, SN: ${item.barcode}) on site.${notes ? `\n\n📝 Installation Remarks: ${notes}` : ''}`,
          photo: photoUrl,
          lat: parsedLat,
          lng: parsedLng,
          accuracy: parsedAccuracy,
          address: finalAddress || `Installed at site on ${timestampStr}`,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        },
      }),
    ]);

    res.status(201).json({
      message: `Equipment "${item.deviceName}" (${item.barcode}) successfully marked as used and logged on Ticket #${ticket.ticketNumber}`,
      comment,
      item: updatedItem,
      ticketInventory: ticketInv,
    });
  } catch (error) {
    console.error('consumeTicketInventory error:', error);
    res.status(500).json({ error: 'Failed to mark equipment as consumed on ticket' });
  }
};

// ============================================================================
// MARK UNINSTALLED TICKET LEFTOVER ITEM FOR RETURN
// ============================================================================
export const markTicketItemForReturn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: ticketId, itemId } = req.params;
    const { condition = 'GOOD', damageNotes, notes } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId as string },
      select: { id: true, ticketNumber: true },
    });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId as string },
    });
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    const validCondition = (condition === 'DAMAGED' || condition === 'NEEDS_REPAIR') ? condition : 'GOOD';
    const nextStatus = (validCondition === 'DAMAGED' || validCondition === 'NEEDS_REPAIR')
      ? InventoryStatus.UNDER_MAINTENANCE
      : InventoryStatus.ASSIGNED;

    const [updatedTicketInv, updatedItem] = await prisma.$transaction([
      prisma.ticketInventoryItem.upsert({
        where: { ticketId_inventoryItemId: { ticketId: ticketId as string, inventoryItemId: itemId as string } },
        update: {
          isInstalled: false,
          isReturned: true,
          returnedAt: new Date(),
          returnCondition: validCondition,
          damageNotes: damageNotes || notes || null,
        },
        create: {
          ticketId: ticketId as string,
          inventoryItemId: itemId as string,
          quantity: 1,
          isInstalled: false,
          isReturned: true,
          returnedAt: new Date(),
          returnCondition: validCondition,
          damageNotes: damageNotes || notes || null,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: itemId as string },
        data: {
          isInstalledAtSite: false,
          condition: validCondition as any,
          status: nextStatus,
          damageNotes: damageNotes || notes || null,
          location: `Must Return - Leftover from Ticket #${ticket.ticketNumber}`,
        },
      }),
      prisma.inventoryLog.create({
        data: {
          inventoryItemId: itemId as string,
          performedById: req.user?.id || null,
          action: InventoryLogAction.CONDITION_CHANGE,
          notes: `Marked for return from Ticket #${ticket.ticketNumber} (Condition: ${validCondition}). Reason: ${damageNotes || notes || 'Uninstalled / Leftover item'}`,
        },
      }),
      prisma.ticketComment.create({
        data: {
          ticketId: ticketId as string,
          authorId: req.user!.id,
          content: `📦 [ITEM MARKED FOR RETURN] Equipment "${item.deviceName}" (${item.barcode}) was not installed and marked for return to warehouse.\n\nCondition: ${validCondition}${damageNotes ? `\nNotes: ${damageNotes}` : ''}`,
        },
      }),
    ]);

    res.json({
      message: `Item "${item.deviceName}" (${item.barcode}) marked for return to warehouse`,
      ticketInventory: updatedTicketInv,
      item: updatedItem,
    });
  } catch (error: any) {
    console.error('markTicketItemForReturn error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark item for return' });
  }
};

// ============================================================================
// RETRIEVE DAMAGED/FAULTY ITEM FROM FIELD & OPTIONALLY INSTALL REPLACEMENT
// ============================================================================
export const retrieveAndReplaceTicketItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: ticketId } = req.params;
    const {
      retrievedItemId,
      returnCondition = 'DAMAGED', // 'GOOD', 'DAMAGED', 'NEEDS_REPAIR'
      damageNotes,
      replacementItemId,
      replacementBarcode,
      replacementNotes,
    } = req.body;

    if (!retrievedItemId) {
      res.status(400).json({ error: 'retrievedItemId is required' });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId as string },
      include: { client: true, assignedGroup: true },
    });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const retrievedItem = await prisma.inventoryItem.findUnique({
      where: { id: retrievedItemId as string },
    });
    if (!retrievedItem) {
      res.status(404).json({ error: 'Retrieved equipment not found' });
      return;
    }

    const validCondition = (returnCondition === 'GOOD' || returnCondition === 'NEEDS_REPAIR') ? returnCondition : 'DAMAGED';
    const isMaintenance = validCondition === 'DAMAGED' || validCondition === 'NEEDS_REPAIR';

    // 1. Retrieve the faulty item
    const updatedRetrieved = await prisma.inventoryItem.update({
      where: { id: retrievedItemId as string },
      data: {
        isInstalledAtSite: false,
        retrievedAt: new Date(),
        condition: validCondition as any,
        status: isMaintenance ? InventoryStatus.UNDER_MAINTENANCE : InventoryStatus.IN_STOCK,
        damageNotes: damageNotes || null,
        location: isMaintenance ? 'Central Repair Queue / Under Maintenance' : 'Central Warehouse (Retrieved)',
        assignedClientId: null,
      },
    });

    await prisma.ticketInventoryItem.upsert({
      where: { ticketId_inventoryItemId: { ticketId: ticketId as string, inventoryItemId: retrievedItemId as string } },
      update: {
        isInstalled: false,
        isReturned: true,
        returnedAt: new Date(),
        returnCondition: validCondition,
        damageNotes: damageNotes || null,
      },
      create: {
        ticketId: ticketId as string,
        inventoryItemId: retrievedItemId as string,
        quantity: 1,
        isInstalled: false,
        isReturned: true,
        returnedAt: new Date(),
        returnCondition: validCondition,
        damageNotes: damageNotes || null,
      },
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: retrievedItemId as string,
        performedById: req.user?.id || null,
        action: isMaintenance ? InventoryLogAction.MAINTENANCE : InventoryLogAction.CHECK_IN,
        notes: `Retrieved from field on Ticket #${ticket.ticketNumber} (Condition: ${validCondition}). Damage notes: ${damageNotes || 'N/A'}`,
      },
    });

    // 2. Process Replacement item if provided
    let replacementItem: any = null;
    if (replacementItemId || replacementBarcode) {
      replacementItem = await prisma.inventoryItem.findFirst({
        where: replacementItemId
          ? { id: replacementItemId }
          : { barcode: String(replacementBarcode).trim().toUpperCase() },
      });

      if (replacementItem) {
        const clientDesc = ticket.client?.companyName || ticket.client?.name || 'Client Site';
        await prisma.inventoryItem.update({
          where: { id: replacementItem.id },
          data: {
            status: InventoryStatus.ASSIGNED,
            isInstalledAtSite: true,
            installedAt: new Date(),
            installedTicketId: ticket.id,
            assignedClientId: ticket.clientId || null,
            assignedGroupId: ticket.assignedGroupId || null,
            assignedUserId: ticket.assignedUserId || req.user?.id || null,
            location: `Installed on Ticket #${ticket.ticketNumber} (Replacing ${retrievedItem.barcode}) at ${clientDesc}`,
          },
        });

        await prisma.ticketInventoryItem.upsert({
          where: { ticketId_inventoryItemId: { ticketId: ticketId as string, inventoryItemId: replacementItem.id } },
          update: {
            isInstalled: true,
            installedAt: new Date(),
            installedById: req.user?.id || null,
            notes: `Replacement for ${retrievedItem.barcode}.${replacementNotes ? ` Remarks: ${replacementNotes}` : ''}`,
          },
          create: {
            ticketId: ticketId as string,
            inventoryItemId: replacementItem.id,
            quantity: 1,
            isInstalled: true,
            installedAt: new Date(),
            installedById: req.user?.id || null,
            notes: `Replacement for ${retrievedItem.barcode}.${replacementNotes ? ` Remarks: ${replacementNotes}` : ''}`,
          },
        });

        await prisma.inventoryLog.create({
          data: {
            inventoryItemId: replacementItem.id,
            performedById: req.user?.id || null,
            action: InventoryLogAction.CHECK_OUT,
            notes: `Field Replacement installed on Ticket #${ticket.ticketNumber} for ${clientDesc} (Replaced ${retrievedItem.barcode})`,
          },
        });
      }
    }

    // 3. Post summary comment to Ticket Feed
    const commentContent = `🔄 [FIELD RETRIEVAL & RMA] Retrieved device "${retrievedItem.deviceName}" (SN: ${retrievedItem.barcode}) from site.\n\n• Physical Condition: ${validCondition}\n• Damage Assessment: ${damageNotes || 'None specified'}${
      replacementItem
        ? `\n\n✨ Installed replacement unit: "${replacementItem.deviceName}" (SN: ${replacementItem.barcode}) at site.`
        : '\n\n⚠️ No replacement device installed yet.'
    }`;

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: ticketId as string,
        authorId: req.user!.id,
        content: commentContent,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
      },
    });

    res.json({
      success: true,
      message: replacementItem
        ? `Retrieved ${retrievedItem.barcode} and installed replacement ${replacementItem.barcode}`
        : `Retrieved ${retrievedItem.barcode} from site`,
      retrievedItem: updatedRetrieved,
      replacementItem,
      comment,
    });
  } catch (error: any) {
    console.error('retrieveAndReplaceTicketItem error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve and replace equipment' });
  }
};
