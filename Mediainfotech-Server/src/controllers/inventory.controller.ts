import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { InventoryCondition, InventoryStatus } from '@prisma/client';

export const getInventoryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, condition, status, category, supplier, page = '1', limit = '15' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: any = {};
    if (condition) where.condition = condition as InventoryCondition;
    if (status) where.status = status as InventoryStatus;
    if (category) where.category = category as string;
    if (supplier) where.supplier = { contains: supplier as string, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { deviceName: { contains: search as string, mode: 'insensitive' } },
        { modelNumber: { contains: search as string, mode: 'insensitive' } },
        { barcode: { contains: search as string, mode: 'insensitive' } },
        { supplier: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [items, total, statusCounts] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          _count: { select: { tickets: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const counts = {
      IN_STOCK: 0,
      ASSIGNED: 0,
      UNDER_MAINTENANCE: 0,
      RETIRED: 0,
    };

    statusCounts.forEach((c) => {
      counts[c.status] = c._count.status;
    });

    res.json({
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      statusCounts: counts,
    });
  } catch (error) {
    console.error('getInventoryItems error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
};

export const getInventoryItemByBarcode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const barcode = req.params.barcode as string;
    const item = await prisma.inventoryItem.findUnique({
      where: { barcode },
      include: {
        tickets: {
          include: {
            ticket: {
              include: {
                assignedGroup: { select: { id: true, name: true } },
                client: { select: { id: true, name: true, companyName: true } },
              },
            },
          },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'No device found matching this barcode' });
      return;
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to lookup barcode' });
  }
};

export const getInventoryItemById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            ticket: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true } },
          },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
};

export const createInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      deviceName,
      modelNumber,
      barcode,
      category,
      condition,
      status,
      buyDate,
      stockAmount,
      unitPrice,
      supplier,
      notes,
    } = req.body;

    if (!deviceName) {
      res.status(400).json({ error: 'Device name is required' });
      return;
    }

    // Generate unique barcode if not provided
    let finalBarcode = barcode;
    if (!finalBarcode) {
      const count = await prisma.inventoryItem.count();
      finalBarcode = `DEV-${Date.now().toString().slice(-6)}-${String(count + 1).padStart(3, '0')}`;
    }

    const existingBarcode = await prisma.inventoryItem.findUnique({
      where: { barcode: finalBarcode },
    });

    if (existingBarcode) {
      res.status(400).json({ error: 'Barcode already exists. Please scan or use a unique barcode.' });
      return;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        deviceName,
        modelNumber: modelNumber || null,
        barcode: finalBarcode,
        category: category || 'Hardware/Device',
        condition: (condition as InventoryCondition) || InventoryCondition.NEW,
        status: (status as InventoryStatus) || InventoryStatus.IN_STOCK,
        buyDate: buyDate ? new Date(buyDate) : null,
        stockAmount: stockAmount ? parseInt(stockAmount, 10) : 1,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        supplier: supplier || null,
        notes: notes || null,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('createInventoryItem error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
};

export const updateInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      deviceName,
      modelNumber,
      barcode,
      category,
      condition,
      status,
      buyDate,
      stockAmount,
      unitPrice,
      supplier,
      notes,
    } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(deviceName && { deviceName }),
        ...(modelNumber !== undefined && { modelNumber }),
        ...(barcode && { barcode }),
        ...(category !== undefined && { category }),
        ...(condition && { condition: condition as InventoryCondition }),
        ...(status && { status: status as InventoryStatus }),
        ...(buyDate !== undefined && { buyDate: buyDate ? new Date(buyDate) : null }),
        ...(stockAmount !== undefined && { stockAmount: parseInt(stockAmount, 10) }),
        ...(unitPrice !== undefined && { unitPrice: unitPrice ? parseFloat(unitPrice) : null }),
        ...(supplier !== undefined && { supplier }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(item);
  } catch (error) {
    console.error('updateInventoryItem error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
};

export const deleteInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
};
