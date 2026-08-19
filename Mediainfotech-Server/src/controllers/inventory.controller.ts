import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { InventoryCondition, InventoryStatus, InventoryLogAction, NotificationCategory, NotificationPriority } from '@prisma/client';
import { notifyAdminsAndManagers, sendNotification, notifyGroupMembers } from '../services/notification.service';

export const parseDateSafe = (val: any): Date | null => {
  if (!val) return null;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const parseFloatSafe = (val: any): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? null : parsed;
};

export const parseIntSafe = (val: any, fallback = 1): number => {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? fallback : parsed;
};

export const PRESET_DEVICE_CATALOG = [
  // Fiber Optic & Splitters
  { deviceName: '1X8 CASSCET', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 450 },
  { deviceName: '2 CORE FIBER', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 2200 },
  { deviceName: '4 Core Fiber', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 3800 },
  { deviceName: '6 FIBER', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 5200 },
  { deviceName: 'SINGLE CORE FIBER', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 1600 },
  { deviceName: 'SPLITER 10/90', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'Spliter 1X4', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 320 },
  { deviceName: 'Spliter 1X8', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 480 },
  { deviceName: 'SPLITER 50/50', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 60/40', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 65/35', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 70/30', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 75/25', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 80/20', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 85/15', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 95/5', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'SPLITER 99/1', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'Digisol Optical Patch Cord SC to SC', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 150 },
  { deviceName: 'Patchcord LC to LC', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 180 },
  { deviceName: 'FIBER FAST CONNECTOR', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 45 },
  { deviceName: '8 PORT WHITE BOX FOR FIBER', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 350 },
  { deviceName: 'TJB BIG', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 220 },
  { deviceName: 'TJB SMALL', category: 'Fiber Optic & Splitters', defaultCondition: 'NEW', unitPrice: 140 },

  // CCTV & Surveillance
  { deviceName: 'ANPR Camera Dahua', category: 'CCTV/Surveillance', defaultCondition: 'NEW', unitPrice: 18500 },
  { deviceName: 'Dahua 2 MP Fixed Lens Bullet', category: 'CCTV/Surveillance', defaultCondition: 'NEW', unitPrice: 2200 },
  { deviceName: 'Dahua 64 CH NVR', category: 'CCTV/Surveillance', defaultCondition: 'NEW', unitPrice: 42000 },
  { deviceName: 'Seagate Skyhawk 4 TB', category: 'CCTV/Surveillance', defaultCondition: 'NEW', unitPrice: 8200 },
  { deviceName: 'REPAIRED CAMERA', category: 'CCTV/Surveillance', defaultCondition: 'GOOD', unitPrice: 1200 },
  { deviceName: 'SERVICED CAMERA DAHUA', category: 'CCTV/Surveillance', defaultCondition: 'EXCELLENT', unitPrice: 1600 },

  // Networking & Routers
  { deviceName: '1 Gig SFP Syrotech', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 850 },
  { deviceName: 'Digisol 4 Port POE', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 2600 },
  { deviceName: 'Digisol 8 Port POE', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 4800 },
  { deviceName: '4 Port Poe ( old )', category: 'Networking/Routers', defaultCondition: 'GOOD', unitPrice: 1100 },
  { deviceName: '8 Port Poe ( old )', category: 'Networking/Routers', defaultCondition: 'GOOD', unitPrice: 2100 },
  { deviceName: 'Digisol XPON ONU', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 1400 },
  { deviceName: 'DUAL BAND WITH VOICE XPON ONT SHARP', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 2400 },
  { deviceName: 'DUAL BAND XPON ONT DIGISOL', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 2600 },
  { deviceName: 'SINGLE BAND DIGISOL XPON ONT', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 1600 },
  { deviceName: 'S-Net Single Band Router', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 1100 },
  { deviceName: 'MEDIA CONVERTER RX 100/1000 SYROTECH', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 1250 },
  { deviceName: 'MEDIA CONVERTER TX 100/1000 SYROTECH', category: 'Networking/Routers', defaultCondition: 'NEW', unitPrice: 1250 },
  { deviceName: 'REPAIRED MEDIA CONVERTER RX 100', category: 'Networking/Routers', defaultCondition: 'GOOD', unitPrice: 500 },
  { deviceName: 'REPAIRED MEDIA CONVERTER TX 100', category: 'Networking/Routers', defaultCondition: 'GOOD', unitPrice: 500 },

  // Cables, Accessories & Peripherals
  { deviceName: '1.5 mtr. HDMI', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 120 },
  { deviceName: '5 mtr. HDMI', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'HDMI Cable 10 MTR', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 650 },
  { deviceName: 'HDMI Cable 20 MTR', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 1250 },
  { deviceName: 'HDMI Cable 30 MTR', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 1950 },
  { deviceName: 'OUTDOOR CAT-6', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 6200 },
  { deviceName: 'Cat-7 Clip', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 85 },
  { deviceName: 'POWER CABLE', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 110 },
  { deviceName: 'DC PIN', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 20 },
  { deviceName: 'RJ 45 CONNECTOR BOX', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 450 },
  { deviceName: 'PVC JUCTION BOX', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 65 },
  { deviceName: 'GI (ALUMINIUM WIRE)', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 350 },
  { deviceName: 'EXTENSION BOARD', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 380 },
  { deviceName: 'Ranz USB Extender 3 MTR', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 280 },
  { deviceName: 'Uport USB Extender 15 MTR', category: 'Cables/Wiring', defaultCondition: 'NEW', unitPrice: 1450 },
  { deviceName: 'Wireless Mouse Elista', category: 'Hardware/Device', defaultCondition: 'NEW', unitPrice: 350 },
  { deviceName: 'Wireless Mouse Zebronics', category: 'Hardware/Device', defaultCondition: 'NEW', unitPrice: 380 },
];

export const getDevicePresets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.json({
      data: PRESET_DEVICE_CATALOG,
      total: PRESET_DEVICE_CATALOG.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device presets' });
  }
};

export const seedInventoryPresets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let createdCount = 0;
    let existingCount = 0;

    for (let index = 0; index < PRESET_DEVICE_CATALOG.length; index++) {
      const preset = PRESET_DEVICE_CATALOG[index];
      const existing = await prisma.inventoryItem.findFirst({
        where: { deviceName: preset.deviceName },
      });

      if (!existing) {
        const cleanNamePart = preset.deviceName
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 4)
          .toUpperCase();
        const barcode = `MIT-${cleanNamePart}-${String(index + 1).padStart(3, '0')}`;

        await prisma.inventoryItem.create({
          data: {
            deviceName: preset.deviceName,
            barcode,
            category: preset.category,
            condition: preset.defaultCondition as InventoryCondition,
            status: InventoryStatus.IN_STOCK,
            unitPrice: preset.unitPrice,
            stockAmount: 5,
            location: 'HQ Central Store, Rack A-1',
            supplier: 'Media Infotech Master Stock',
            logs: {
              create: {
                action: InventoryLogAction.CHECK_IN,
                notes: 'Master company preset catalog seed',
                performedById: req.user?.id || null,
              },
            },
          },
        });
        createdCount++;
      } else {
        existingCount++;
      }
    }

    res.json({
      message: `Inventory catalog synchronized successfully! Added ${createdCount} new device types (${existingCount} already existed).`,
      createdCount,
      existingCount,
    });
  } catch (error) {
    console.error('seedInventoryPresets error:', error);
    res.status(500).json({ error: 'Failed to seed inventory presets' });
  }
};

export const bulkCreateInventoryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required for bulk add' });
      return;
    }

    const createdItems: any[] = [];

    for (const itemData of items) {
      if (!itemData.deviceName) continue;

      let finalBarcode = itemData.barcode ? String(itemData.barcode).trim() : '';
      if (!finalBarcode) {
        const count = await prisma.inventoryItem.count();
        finalBarcode = `DEV-${Date.now().toString().slice(-6)}-${String(count + 1).padStart(3, '0')}`;
      }

      const existingBarcode = await prisma.inventoryItem.findUnique({
        where: { barcode: finalBarcode },
      });

      if (existingBarcode) {
        finalBarcode = `${finalBarcode}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const item = await prisma.inventoryItem.create({
        data: {
          deviceName: itemData.deviceName,
          modelNumber: itemData.modelNumber?.trim() || null,
          barcode: finalBarcode,
          category: itemData.category || 'Hardware/Device',
          condition: (itemData.condition as InventoryCondition) || InventoryCondition.NEW,
          status: (itemData.status as InventoryStatus) || InventoryStatus.IN_STOCK,
          buyDate: parseDateSafe(itemData.buyDate),
          warrantyExpiry: parseDateSafe(itemData.warrantyExpiry),
          invoiceNo: itemData.invoiceNo?.trim() || null,
          location: itemData.location?.trim() || null,
          stockAmount: parseIntSafe(itemData.stockAmount, 1),
          unitPrice: parseFloatSafe(itemData.unitPrice),
          supplier: itemData.supplier?.trim() || null,
          notes: itemData.notes || null,
          logs: {
            create: {
              action: InventoryLogAction.CHECK_IN,
              notes: 'Batch inventory registration',
              performedById: req.user?.id || null,
            },
          },
        },
      });

      createdItems.push(item);
    }

    res.status(201).json({
      message: `Successfully registered ${createdItems.length} hardware assets`,
      data: createdItems,
    });
  } catch (error) {
    console.error('bulkCreateInventoryItems error:', error);
    res.status(500).json({ error: 'Failed to bulk add inventory items' });
  }
};

export const createInventoryWithSerials = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceData, barcodes } = req.body;

    if (!deviceData || !deviceData.deviceName?.trim()) {
      res.status(400).json({ error: 'Device specifications and Device Name are required' });
      return;
    }

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      res.status(400).json({ error: 'At least one barcode/serial number is required' });
      return;
    }

    // Clean and deduplicate incoming barcodes
    const cleanedBarcodes = Array.from(
      new Set(
        barcodes
          .map((b: any) => (typeof b === 'string' ? b.trim().toUpperCase() : ''))
          .filter((b: string) => b.length > 0)
      )
    );

    if (cleanedBarcodes.length === 0) {
      res.status(400).json({ error: 'No valid barcodes provided' });
      return;
    }

    // Check if any of these barcodes already exist in the database
    const existingConflicts = await prisma.inventoryItem.findMany({
      where: {
        barcode: { in: cleanedBarcodes },
      },
      select: { barcode: true, deviceName: true },
    });

    if (existingConflicts.length > 0) {
      const conflictList = existingConflicts.map((c) => c.barcode);
      res.status(400).json({
        error: `${conflictList.length} serial barcode(s) already exist in inventory: ${conflictList.slice(0, 5).join(', ')}${conflictList.length > 5 ? '...' : ''}`,
        conflicts: conflictList,
      });
      return;
    }

    const {
      deviceName,
      modelNumber,
      category,
      condition,
      status,
      buyDate,
      warrantyExpiry,
      invoiceNo,
      location,
      unitPrice,
      supplier,
      notes,
    } = deviceData;

    // Create all items atomically in a single transaction
    const createdItems = await prisma.$transaction(
      cleanedBarcodes.map((barcode, index) =>
        prisma.inventoryItem.create({
          data: {
            deviceName: deviceName.trim(),
            modelNumber: modelNumber?.trim() || null,
            barcode,
            category: category || 'Hardware/Device',
            condition: (condition as InventoryCondition) || InventoryCondition.NEW,
            status: (status as InventoryStatus) || InventoryStatus.IN_STOCK,
            buyDate: parseDateSafe(buyDate),
            warrantyExpiry: parseDateSafe(warrantyExpiry),
            invoiceNo: invoiceNo?.trim() || null,
            location: location?.trim() || null,
            stockAmount: 1,
            unitPrice: parseFloatSafe(unitPrice),
            supplier: supplier?.trim() || null,
            notes: notes ? `${notes} (Serial Unit #${index + 1})` : `Serial Unit #${index + 1}`,
            logs: {
              create: {
                action: InventoryLogAction.CHECK_IN,
                notes: `Batch serial scan registration (${cleanedBarcodes.length} units)`,
                performedById: req.user?.id || null,
              },
            },
          },
        })
      )
    );

    res.status(201).json({
      message: `Successfully cataloged ${createdItems.length} units with individual serial barcodes`,
      count: createdItems.length,
      data: createdItems,
    });
  } catch (error) {
    console.error('createInventoryWithSerials error:', error);
    res.status(500).json({ error: 'Failed to register items with serial barcodes' });
  }
};

export const getInventoryStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGER', 'HR'].includes(userRole);

    const baseWhere: any = {};
    if (!isPrivileged) {
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: req.user?.id },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((g) => g.groupId);
      baseWhere.OR = [
        { assignedUserId: req.user?.id },
        ...(groupIds.length > 0 ? [{ assignedGroupId: { in: groupIds } }] : []),
      ];
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      total,
      inStockCount,
      inFieldKitsCount,
      installedAtSitesCount,
      mustReturnCount,
      underMaintenanceCount,
      retiredCount,
      allItemsWithPrice,
      expiringSoon,
      expired,
      lowStock,
    ] = await Promise.all([
      prisma.inventoryItem.count({ where: baseWhere }),
      // In Stock
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          status: InventoryStatus.IN_STOCK,
          isInstalledAtSite: false,
          retrievedAt: null,
        },
      }),
      // In Field Kits (Ready in toolbag, not installed on site, not defective)
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          status: InventoryStatus.ASSIGNED,
          isInstalledAtSite: false,
          assignedClientId: null,
          retrievedAt: null,
          condition: { notIn: [InventoryCondition.DAMAGED, InventoryCondition.NEEDS_REPAIR] },
          NOT: { location: { contains: 'Must Return', mode: 'insensitive' } },
        },
      }),
      // Installed on Client / Ticket Sites
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          retrievedAt: null,
          OR: [
            { isInstalledAtSite: true },
            { assignedClientId: { not: null } },
            { location: { contains: 'Installed', mode: 'insensitive' } },
          ],
        },
      }),
      // Must Return / Defective / Leftover
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          OR: [
            { condition: { in: [InventoryCondition.DAMAGED, InventoryCondition.NEEDS_REPAIR] } },
            { status: InventoryStatus.UNDER_MAINTENANCE },
            { retrievedAt: { not: null } },
            { location: { contains: 'Must Return', mode: 'insensitive' } },
          ],
        },
      }),
      // Under Maintenance
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          status: InventoryStatus.UNDER_MAINTENANCE,
        },
      }),
      // Retired
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          status: InventoryStatus.RETIRED,
        },
      }),
      prisma.inventoryItem.findMany({
        where: baseWhere,
        select: { stockAmount: true, unitPrice: true },
      }),
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          warrantyExpiry: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          warrantyExpiry: {
            lt: now,
          },
        },
      }),
      prisma.inventoryItem.count({
        where: {
          ...baseWhere,
          status: InventoryStatus.IN_STOCK,
          stockAmount: { lte: 2 },
        },
      }),
    ]);

    let totalValuation = 0;
    allItemsWithPrice.forEach((item) => {
      if (item.unitPrice && item.stockAmount) {
        totalValuation += item.unitPrice * item.stockAmount;
      }
    });

    res.json({
      totalDevices: total,
      totalValuation: isPrivileged ? totalValuation : 0,
      inStock: inStockCount,
      assigned: inFieldKitsCount + installedAtSitesCount,
      inFieldKits: inFieldKitsCount,
      installedAtSites: installedAtSitesCount,
      mustReturn: mustReturnCount,
      underMaintenance: underMaintenanceCount,
      retired: retiredCount,
      lowStockCount: lowStock,
      warrantyExpiringSoon: expiringSoon,
      warrantyExpired: expired,
    });
  } catch (error) {
    console.error('getInventoryStats error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory statistics' });
  }
};

export const getInventoryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGER', 'HR'].includes(userRole);

    const {
      search,
      condition,
      status,
      category,
      supplier,
      warrantyStatus,
      lowStock,
      assignedUserId,
      assignedGroupId,
      segment, // 'IN_STOCK' | 'FIELD_KIT' | 'INSTALLED' | 'MUST_RETURN' | 'UNDER_MAINTENANCE'
      page = '1',
      limit = '5000',
    } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: any = {};
    if (condition && condition !== 'ALL' && condition !== 'null' && condition !== 'undefined') where.condition = condition as InventoryCondition;
    if (status && status !== 'ALL' && status !== 'null' && status !== 'undefined') where.status = status as InventoryStatus;
    if (category && category !== 'ALL' && category !== 'null' && category !== 'undefined') where.category = category as string;
    if (supplier && supplier !== 'null' && supplier !== 'undefined') where.supplier = { contains: supplier as string, mode: 'insensitive' };
    if (assignedUserId && assignedUserId !== 'ALL' && assignedUserId !== 'null' && assignedUserId !== 'undefined') where.assignedUserId = assignedUserId as string;
    if (assignedGroupId && assignedGroupId !== 'ALL' && assignedGroupId !== 'null' && assignedGroupId !== 'undefined') where.assignedGroupId = assignedGroupId as string;

    if (!isPrivileged) {
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: req.user?.id },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((g) => g.groupId);
      const roleConditions = [
        { assignedUserId: req.user?.id },
        ...(groupIds.length > 0 ? [{ assignedGroupId: { in: groupIds } }] : []),
      ];

      where.AND = [
        ...(where.AND || []),
        { OR: roleConditions },
      ];
    }

    // Precise Segment Filter
    if (segment === 'IN_STOCK') {
      where.status = InventoryStatus.IN_STOCK;
      where.isInstalledAtSite = false;
      where.retrievedAt = null;
    } else if (segment === 'FIELD_KIT') {
      where.status = InventoryStatus.ASSIGNED;
      where.isInstalledAtSite = false;
      where.assignedClientId = null;
      where.retrievedAt = null;
      where.condition = { notIn: [InventoryCondition.DAMAGED, InventoryCondition.NEEDS_REPAIR] };
      where.NOT = { location: { contains: 'Must Return', mode: 'insensitive' } };
    } else if (segment === 'INSTALLED') {
      where.retrievedAt = null;
      where.OR = [
        { isInstalledAtSite: true },
        { assignedClientId: { not: null } },
        { location: { contains: 'Installed', mode: 'insensitive' } },
      ];
    } else if (segment === 'MUST_RETURN') {
      where.OR = [
        { condition: { in: [InventoryCondition.DAMAGED, InventoryCondition.NEEDS_REPAIR] } },
        { status: InventoryStatus.UNDER_MAINTENANCE },
        { retrievedAt: { not: null } },
        { location: { contains: 'Must Return', mode: 'insensitive' } },
      ];
    } else if (segment === 'UNDER_MAINTENANCE') {
      where.status = InventoryStatus.UNDER_MAINTENANCE;
    }

    if (lowStock === 'true') {
      where.status = InventoryStatus.IN_STOCK;
      where.stockAmount = { lte: 2 };
    }

    if (warrantyStatus) {
      const now = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      if (warrantyStatus === 'EXPIRED') {
        where.warrantyExpiry = { lt: now };
      } else if (warrantyStatus === 'EXPIRING_SOON') {
        where.warrantyExpiry = { gte: now, lte: thirtyDays };
      } else if (warrantyStatus === 'ACTIVE') {
        where.warrantyExpiry = { gt: thirtyDays };
      }
    }

    if (search) {
      const searchConditions = [
        { deviceName: { contains: search as string, mode: 'insensitive' } },
        { modelNumber: { contains: search as string, mode: 'insensitive' } },
        { barcode: { contains: search as string, mode: 'insensitive' } },
        { supplier: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
        { invoiceNo: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
        { assignedUser: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { assignedUser: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { assignedClient: { name: { contains: search as string, mode: 'insensitive' } } },
        { assignedClient: { companyName: { contains: search as string, mode: 'insensitive' } } },
      ];

      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          assignedClient: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
          assignedGroup: { select: { id: true, name: true, color: true } },
          assignedVehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
          tickets: {
            include: {
              ticket: {
                select: { id: true, ticketNumber: true, title: true, status: true, priority: true },
              },
            },
          },
          _count: { select: { tickets: true, logs: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
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
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedClient: { select: { id: true, name: true, companyName: true } },
        assignedGroup: { select: { id: true, name: true, color: true } },
        assignedVehicle: { select: { id: true, registrationNo: true } },
        tickets: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true,
                priority: true,
                assignedGroupId: true,
                assignedUserId: true,
                clientId: true,
              },
            },
          },
        },
        logs: {
          include: {
            performedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
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
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true } },
        assignedClient: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
        assignedGroup: { select: { id: true, name: true, color: true, locationName: true } },
        assignedVehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
        tickets: {
          include: {
            ticket: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true, createdAt: true } },
          },
        },
        logs: {
          include: {
            performedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory item details' });
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
      warrantyExpiry,
      invoiceNo,
      location,
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
    let finalBarcode = barcode ? barcode.trim() : '';
    if (!finalBarcode) {
      const count = await prisma.inventoryItem.count();
      finalBarcode = `DEV-${Date.now().toString().slice(-6)}-${String(count + 1).padStart(3, '0')}`;
    }

    const existingBarcode = await prisma.inventoryItem.findUnique({
      where: { barcode: finalBarcode },
    });

    if (existingBarcode) {
      res.status(400).json({ error: 'Barcode or Serial Number already registered in inventory.' });
      return;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        deviceName: deviceName.trim(),
        modelNumber: modelNumber?.trim() || null,
        barcode: finalBarcode,
        category: category || 'Hardware/Device',
        condition: (condition as InventoryCondition) || InventoryCondition.NEW,
        status: (status as InventoryStatus) || InventoryStatus.IN_STOCK,
        buyDate: parseDateSafe(buyDate),
        warrantyExpiry: parseDateSafe(warrantyExpiry),
        invoiceNo: invoiceNo?.trim() || null,
        location: location?.trim() || null,
        stockAmount: parseIntSafe(stockAmount, 1),
        unitPrice: parseFloatSafe(unitPrice),
        supplier: supplier?.trim() || null,
        notes: notes || null,
        logs: {
          create: {
            action: InventoryLogAction.CHECK_IN,
            notes: 'Initial asset cataloging and registration',
            performedById: req.user?.id || null,
          },
        },
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
      warrantyExpiry,
      invoiceNo,
      location,
      stockAmount,
      unitPrice,
      supplier,
      notes,
    } = req.body;

    const current = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(deviceName && { deviceName: deviceName.trim() }),
        ...(modelNumber !== undefined && { modelNumber: modelNumber?.trim() || null }),
        ...(barcode && { barcode: barcode.trim() }),
        ...(category !== undefined && { category }),
        ...(condition && { condition: condition as InventoryCondition }),
        ...(status && { status: status as InventoryStatus }),
        ...(buyDate !== undefined && { buyDate: parseDateSafe(buyDate) }),
        ...(warrantyExpiry !== undefined && { warrantyExpiry: parseDateSafe(warrantyExpiry) }),
        ...(invoiceNo !== undefined && { invoiceNo: invoiceNo?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(stockAmount !== undefined && { stockAmount: parseIntSafe(stockAmount, current.stockAmount) }),
        ...(unitPrice !== undefined && { unitPrice: parseFloatSafe(unitPrice) }),
        ...(supplier !== undefined && { supplier: supplier?.trim() || null }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Write audit log if condition or status changed
    if (condition && condition !== current.condition) {
      await prisma.inventoryLog.create({
        data: {
          inventoryItemId: id,
          action: InventoryLogAction.CONDITION_CHANGE,
          notes: `Condition changed from ${current.condition} to ${condition}`,
          performedById: req.user?.id || null,
        },
      });
    }

    res.json(item);
  } catch (error) {
    console.error('updateInventoryItem error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
};

export const assignInventoryCustody = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { assignedUserId, assignedClientId, assignedGroupId, assignedVehicleId, notes, ticketId } = req.body;

    if (!assignedUserId && !assignedClientId && !assignedGroupId && !assignedVehicleId) {
      res.status(400).json({ error: 'Please specify an Employee, Client, Group, or Vehicle to assign custody.' });
      return;
    }

    let custodianDesc = '';
    if (assignedUserId) {
      const u = await prisma.user.findUnique({ where: { id: assignedUserId } });
      custodianDesc = `Assigned to Technician ${u?.firstName} ${u?.lastName}`;
    } else if (assignedClientId) {
      const c = await prisma.client.findUnique({ where: { id: assignedClientId } });
      custodianDesc = `Dispatched to Client site ${c?.companyName || c?.name}`;
    } else if (assignedGroupId) {
      const g = await prisma.group.findUnique({ where: { id: assignedGroupId } });
      custodianDesc = `Allocated to Group / Field Team ${g?.name}`;
    } else if (assignedVehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: assignedVehicleId } });
      custodianDesc = `Allocated to Service Vehicle ${v?.registrationNo}`;
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        status: InventoryStatus.ASSIGNED,
        assignedUserId: assignedUserId || null,
        assignedClientId: assignedClientId || null,
        assignedGroupId: assignedGroupId || null,
        assignedVehicleId: assignedVehicleId || null,
        logs: {
          create: {
            action: InventoryLogAction.CHECK_OUT,
            notes: notes ? `${custodianDesc} — Note: ${notes}` : custodianDesc,
            performedById: req.user?.id || null,
          },
        },
      },
      include: {
        assignedUser: true,
        assignedClient: true,
        assignedGroup: true,
        assignedVehicle: true,
      },
    });

    if (ticketId && typeof ticketId === 'string' && ticketId.trim()) {
      try {
        const ticketExists = await prisma.ticket.findUnique({
          where: { id: ticketId.trim() },
          select: { id: true },
        });
        if (ticketExists) {
          await prisma.ticketInventoryItem.upsert({
            where: {
              ticketId_inventoryItemId: {
                ticketId: ticketExists.id,
                inventoryItemId: id,
              },
            },
            create: {
              ticketId: ticketExists.id,
              inventoryItemId: id,
              quantity: 1,
              notes: notes || 'Dispatched via Custody Dispatch',
            },
            update: {},
          });
        }
      } catch (tErr) {
        console.warn('Could not link single item to ticketId:', ticketId, tErr);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('assignInventoryCustody error:', error);
    res.status(500).json({ error: 'Failed to assign inventory item' });
  }
};

export const returnInventoryCustody = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { condition, status, notes } = req.body;

    const nextCondition = condition ? (condition as InventoryCondition) : undefined;
    const nextStatus = status
      ? (status as InventoryStatus)
      : nextCondition === 'DAMAGED' || nextCondition === 'DEFECTIVE'
      ? InventoryStatus.UNDER_MAINTENANCE
      : InventoryStatus.IN_STOCK;

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        status: nextStatus,
        assignedUserId: null,
        assignedClientId: null,
        assignedGroupId: null,
        assignedVehicleId: null,
        ...(nextCondition && { condition: nextCondition }),
        logs: {
          create: {
            action: InventoryLogAction.CHECK_IN,
            notes: notes ? `Checked back into stock (${nextCondition || 'Normal'}). Note: ${notes}` : `Checked back into inventory (${nextStatus})`,
            performedById: req.user?.id || null,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('returnInventoryCustody error:', error);
    res.status(500).json({ error: 'Failed to return inventory item' });
  }
};

// Batch Lookup multiple barcodes for dispatch & return validation with complete disclosure
export const lookupBarcodesForDispatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { barcodes } = req.body;
    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      res.status(400).json({ error: 'Please provide at least one barcode to lookup' });
      return;
    }

    const cleaned = barcodes.map((b: string) => b.trim().toUpperCase()).filter((b: string) => b.length > 0);

    const items = await prisma.inventoryItem.findMany({
      where: {
        barcode: { in: cleaned },
      },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true } },
        assignedClient: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
        assignedGroup: { select: { id: true, name: true, color: true } },
        assignedVehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
        tickets: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true,
                priority: true,
                assignedGroupId: true,
                assignedUserId: true,
                clientId: true,
                client: { select: { id: true, name: true, companyName: true, address: true } },
                resolvedAt: true,
                resolvedById: true,
                resolutionNote: true,
                resolveAddress: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    const enriched = items.map((item: any) => {
      let custodian = null;
      let custodyType = 'IN_STOCK'; // 'ASSIGNED_FIELD' | 'INSTALLED_ON_SITE' | 'MUST_RETURN' | 'IN_STOCK' | 'MAINTENANCE' | 'RETIRED'
      let isAssigned = false;
      let isInstalled = false;
      let mustReturn = false;
      let mustReturnReason = '';
      let warning = '';

      if (item.assignedUser) {
        custodian = `Technician: ${item.assignedUser.firstName} ${item.assignedUser.lastName}`;
        isAssigned = true;
        custodyType = 'ASSIGNED_FIELD';
      } else if (item.assignedClient) {
        custodian = `Client: ${item.assignedClient.companyName || item.assignedClient.name}`;
        isInstalled = true;
        custodyType = 'INSTALLED_ON_SITE';
      } else if (item.assignedGroup) {
        custodian = `Group: ${item.assignedGroup.name}`;
        isAssigned = true;
        custodyType = 'ASSIGNED_FIELD';
      } else if (item.assignedVehicle) {
        custodian = `Vehicle: ${item.assignedVehicle.registrationNo}`;
        isAssigned = true;
        custodyType = 'ASSIGNED_FIELD';
      }

      // Check if location or tickets denote installed
      const locationLower = (item.location || '').toLowerCase();
      const hasInstalledLocation = locationLower.includes('installed') || locationLower.includes('client site');

      const activeTickets = (item.tickets || [])
        .map((t: any) => t.ticket)
        .filter((t: any) => t && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'));

      const resolvedTickets = (item.tickets || [])
        .map((t: any) => t.ticket)
        .filter((t: any) => t && (t.status === 'RESOLVED' || t.status === 'CLOSED'));

      if (item.assignedClientId || hasInstalledLocation) {
        isInstalled = true;
        custodyType = 'INSTALLED_ON_SITE';
        warning = `⚠️ Unit is registered as Installed on site (${item.assignedClient?.companyName || item.assignedClient?.name || item.location}). Checking in will uninstall this unit from client premises and return it to warehouse stock.`;
      } else if (item.status === 'ASSIGNED') {
        // If assigned to a technician/vehicle, check if linked ticket is resolved
        if (resolvedTickets.length > 0 && activeTickets.length === 0) {
          mustReturn = true;
          custodyType = 'MUST_RETURN';
          mustReturnReason = `Ticket #${resolvedTickets[0].ticketNumber} completed. Uninstalled unit must be checked back into central warehouse stock.`;
        } else {
          custodyType = 'ASSIGNED_FIELD';
          mustReturnReason = 'In active field custody. Equipment issued to technician/van awaiting check-in or deployment.';
        }
      } else if (item.status === 'IN_STOCK') {
        custodyType = 'IN_STOCK';
      } else if (item.status === 'UNDER_MAINTENANCE') {
        custodyType = 'MAINTENANCE';
      } else if (item.status === 'RETIRED') {
        custodyType = 'RETIRED';
      }

      const latestCheckoutLog = (item.logs || []).find((l: any) => l.action === 'CHECK_OUT');
      const assignedDate = latestCheckoutLog?.createdAt || item.updatedAt;

      let daysInCustody = 0;
      if (item.status === 'ASSIGNED' && assignedDate) {
        const diffMs = Date.now() - new Date(assignedDate).getTime();
        daysInCustody = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        id: item.id,
        deviceName: item.deviceName,
        modelNumber: item.modelNumber,
        barcode: item.barcode,
        category: item.category,
        condition: item.condition,
        status: item.status,
        unitPrice: item.unitPrice,
        location: item.location,
        available: item.status === InventoryStatus.IN_STOCK,
        currentCustodian: custodian,
        assignedUserId: item.assignedUserId,
        assignedUser: item.assignedUser,
        assignedClientId: item.assignedClientId,
        assignedClient: item.assignedClient,
        assignedGroupId: item.assignedGroupId,
        assignedGroup: item.assignedGroup,
        assignedVehicleId: item.assignedVehicleId,
        assignedVehicle: item.assignedVehicle,
        linkedTickets: activeTickets,
        resolvedTickets,
        // Detailed disclosure fields
        custodyType,
        isAssigned,
        isInstalled,
        mustReturn,
        mustReturnReason,
        warning,
        daysInCustody,
        assignedDate,
        lastLog: item.logs?.[0] || null,
      };
    });

    const foundBarcodes = new Set(items.map((i) => i.barcode));
    const missingBarcodes = cleaned.filter((b: string) => !foundBarcodes.has(b));

    res.json({
      items: enriched,
      foundCount: items.length,
      missingBarcodes,
    });
  } catch (error) {
    console.error('lookupBarcodesForDispatch error:', error);
    res.status(500).json({ error: 'Failed to lookup barcodes' });
  }
};

// Active Field Custody & Return Candidates Roster
export const getReturnCandidates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        status: InventoryStatus.ASSIGNED,
      },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true } },
        assignedClient: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
        assignedGroup: { select: { id: true, name: true, color: true } },
        assignedVehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
        tickets: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true,
                priority: true,
                assignedGroupId: true,
                assignedUserId: true,
                clientId: true,
                client: { select: { id: true, name: true, companyName: true } },
                resolvedAt: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        logs: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = items.map((item: any) => {
      let custodianName = 'Field Custody';
      let custodianType = 'USER';
      let custodianId = '';

      if (item.assignedUser) {
        custodianName = `Technician ${item.assignedUser.firstName} ${item.assignedUser.lastName}`;
        custodianType = 'USER';
        custodianId = item.assignedUser.id;
      } else if (item.assignedClient) {
        custodianName = `Client ${item.assignedClient.companyName || item.assignedClient.name}`;
        custodianType = 'CLIENT';
        custodianId = item.assignedClient.id;
      } else if (item.assignedGroup) {
        custodianName = `Group ${item.assignedGroup.name}`;
        custodianType = 'GROUP';
        custodianId = item.assignedGroup.id;
      } else if (item.assignedVehicle) {
        custodianName = `Vehicle ${item.assignedVehicle.registrationNo}`;
        custodianType = 'VEHICLE';
        custodianId = item.assignedVehicle.id;
      }

      const locationLower = (item.location || '').toLowerCase();
      const isInstalled = !!item.assignedClientId || locationLower.includes('installed');

      const resolvedTickets = (item.tickets || []).filter((t: any) => t.ticket?.status === 'RESOLVED' || t.ticket?.status === 'CLOSED');
      const mustReturn = resolvedTickets.length > 0 && !isInstalled;

      return {
        id: item.id,
        deviceName: item.deviceName,
        modelNumber: item.modelNumber,
        barcode: item.barcode,
        category: item.category,
        condition: item.condition,
        status: item.status,
        unitPrice: item.unitPrice,
        location: item.location,
        custodianName,
        custodianType,
        custodianId,
        assignedUser: item.assignedUser,
        assignedClient: item.assignedClient,
        assignedGroup: item.assignedGroup,
        assignedVehicle: item.assignedVehicle,
        isInstalled,
        mustReturn,
        custodyType: isInstalled ? 'INSTALLED_ON_SITE' : mustReturn ? 'MUST_RETURN' : 'ASSIGNED_FIELD',
        warning: isInstalled
          ? `⚠️ Unit is registered as Installed on site (${item.assignedClient?.companyName || item.assignedClient?.name || item.location}). Returning will remove it from client premises.`
          : '',
        mustReturnReason: mustReturn
          ? `Ticket #${resolvedTickets[0].ticketNumber} resolved. Unit must be returned to stock.`
          : 'In active field custody.',
      };
    });

    // Group items by custodian for fast batch selection in UI
    const groups: { [key: string]: { custodianName: string; custodianType: string; custodianId: string; items: any[] } } = {};
    enriched.forEach((item) => {
      const key = `${item.custodianType}-${item.custodianId || item.custodianName}`;
      if (!groups[key]) {
        groups[key] = {
          custodianName: item.custodianName,
          custodianType: item.custodianType,
          custodianId: item.custodianId,
          items: [],
        };
      }
      groups[key].items.push(item);
    });

    res.json({
      totalAssigned: enriched.length,
      items: enriched,
      custodianGroups: Object.values(groups),
    });
  } catch (error) {
    console.error('getReturnCandidates error:', error);
    res.status(500).json({ error: 'Failed to fetch return candidates' });
  }
};

// Batch Return Multiple Equipment Items back to central inventory
export const batchReturnInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { barcodes, condition, location, notes } = req.body;
    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      res.status(400).json({ error: 'Please provide at least one barcode to return' });
      return;
    }

    const cleaned = barcodes.map((b: string) => b.trim().toUpperCase()).filter(Boolean);
    const items = await prisma.inventoryItem.findMany({
      where: { barcode: { in: cleaned } },
    });

    if (items.length === 0) {
      res.status(400).json({ error: 'No matching equipment found for the provided barcodes' });
      return;
    }

    const nextCondition = condition ? (condition as InventoryCondition) : undefined;
    const nextStatus = nextCondition === 'DAMAGED' || nextCondition === 'DEFECTIVE'
      ? InventoryStatus.UNDER_MAINTENANCE
      : InventoryStatus.IN_STOCK;

    const returnLogNote = notes
      ? `Batch Check-In (${items.length} units, Condition: ${nextCondition || 'Standard'}). Note: ${notes}`
      : `Batch Check-In (${items.length} units) returned to central stock`;

    const results = await prisma.$transaction(
      items.map((item) =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: nextStatus,
            assignedUserId: null,
            assignedClientId: null,
            assignedGroupId: null,
            assignedVehicleId: null,
            ...(nextCondition && { condition: nextCondition }),
            ...(location && { location }),
            logs: {
              create: {
                action: InventoryLogAction.CHECK_IN,
                notes: returnLogNote,
                performedById: req.user?.id || null,
              },
            },
          },
        })
      )
    );

    // Real-Time Notification on Check-In / Defective Return
    try {
      const isDamaged = nextCondition === 'DAMAGED' || nextCondition === 'NEEDS_REPAIR' || nextStatus === InventoryStatus.UNDER_MAINTENANCE;
      const actorName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Staff';

      await notifyAdminsAndManagers({
        title: isDamaged
          ? `⚠️ Defective Items Returned to Store (${results.length} units)`
          : `📦 Equipment Returned to Stock (${results.length} units)`,
        message: `${returnLogNote} (Checked in by ${actorName})`,
        category: NotificationCategory.INVENTORY,
        priority: isDamaged ? NotificationPriority.URGENT : NotificationPriority.NORMAL,
        actionUrl: '/inventory',
        excludeUserId: req.user?.id,
      });
    } catch (notifErr) {
      console.error('Inventory return notification error:', notifErr);
    }

    res.json({
      message: `Successfully checked in ${results.length} equipment items back into stock`,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('batchReturnInventory error:', error);
    res.status(500).json({ error: 'Failed to execute batch return' });
  }
};

// Batch Dispatch Multiple Items to Technician, Client, Group, or Vehicle
export const batchDispatchInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      itemIds,
      barcodes,
      targetType,
      assignedUserId,
      assignedClientId,
      assignedGroupId,
      assignedVehicleId,
      notes,
      ticketId,
    } = req.body;

    if (!targetType) {
      res.status(400).json({ error: 'Target dispatch type is required (USER, CLIENT, GROUP, or VEHICLE)' });
      return;
    }

    if (targetType === 'USER' && !assignedUserId) {
      res.status(400).json({ error: 'Please select a technician to dispatch to' });
      return;
    }
    if (targetType === 'CLIENT' && !assignedClientId) {
      res.status(400).json({ error: 'Please select a client site to dispatch to' });
      return;
    }
    if (targetType === 'GROUP' && !assignedGroupId) {
      res.status(400).json({ error: 'Please select a group/field team to dispatch to' });
      return;
    }
    if (targetType === 'VEHICLE' && !assignedVehicleId) {
      res.status(400).json({ error: 'Please select a service vehicle to dispatch to' });
      return;
    }

    // Resolve items by IDs or barcodes
    let targetItems: { id: string; deviceName: string; barcode: string }[] = [];
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      targetItems = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, deviceName: true, barcode: true },
      });
    } else if (Array.isArray(barcodes) && barcodes.length > 0) {
      const cleaned = barcodes.map((b: string) => b.trim().toUpperCase());
      targetItems = await prisma.inventoryItem.findMany({
        where: { barcode: { in: cleaned } },
        select: { id: true, deviceName: true, barcode: true },
      });
    }

    if (targetItems.length === 0) {
      res.status(400).json({ error: 'No matching equipment found for dispatch' });
      return;
    }

    // Resolve custodian description
    let custodianDesc = '';
    if (targetType === 'USER' && assignedUserId) {
      const u = await prisma.user.findUnique({ where: { id: assignedUserId } });
      custodianDesc = `Assigned to Technician ${u?.firstName} ${u?.lastName}`;
    } else if (targetType === 'CLIENT' && assignedClientId) {
      const c = await prisma.client.findUnique({ where: { id: assignedClientId } });
      custodianDesc = `Dispatched to Client site ${c?.companyName || c?.name}`;
    } else if (targetType === 'GROUP' && assignedGroupId) {
      const g = await prisma.group.findUnique({ where: { id: assignedGroupId } });
      custodianDesc = `Allocated to Group / Field Team ${g?.name}`;
    } else if (targetType === 'VEHICLE' && assignedVehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: assignedVehicleId } });
      custodianDesc = `Allocated to Service Vehicle ${v?.registrationNo}`;
    }

    const logNote = notes ? `Batch Check-Out (${targetItems.length} items): ${custodianDesc} — Note: ${notes}` : `Batch Check-Out: ${custodianDesc}`;

    // Execute atomic update & logs
    const results = await prisma.$transaction(
      targetItems.map((item) =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: InventoryStatus.ASSIGNED,
            assignedUserId: targetType === 'USER' ? assignedUserId : null,
            assignedClientId: targetType === 'CLIENT' ? assignedClientId : null,
            assignedGroupId: targetType === 'GROUP' ? assignedGroupId : null,
            assignedVehicleId: targetType === 'VEHICLE' ? assignedVehicleId : null,
            logs: {
              create: {
                action: InventoryLogAction.CHECK_OUT,
                notes: logNote,
                performedById: req.user?.id || null,
              },
            },
          },
        })
      )
    );

    // If a valid ticketId is linked, link items to TicketInventoryItem
    if (ticketId && typeof ticketId === 'string' && ticketId.trim()) {
      try {
        const ticketExists = await prisma.ticket.findUnique({
          where: { id: ticketId.trim() },
          select: { id: true },
        });
        if (ticketExists) {
          for (const item of targetItems) {
            await prisma.ticketInventoryItem.upsert({
              where: {
                ticketId_inventoryItemId: {
                  ticketId: ticketExists.id,
                  inventoryItemId: item.id,
                },
              },
              create: {
                ticketId: ticketExists.id,
                inventoryItemId: item.id,
                quantity: 1,
                notes: notes || 'Dispatched via Batch Custody Dispatch',
              },
              update: {},
            });
          }
        }
      } catch (tErr) {
        console.warn('Could not link batch items to ticketId:', ticketId, tErr);
      }
    }

    // Real-Time Notification on Equipment Dispatch
    try {
      const actorName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Staff';

      // 1. Notify Target Technician
      if (targetType === 'USER' && assignedUserId) {
        await sendNotification({
          userId: assignedUserId,
          title: `📦 Field Equipment Dispatched (${results.length} items)`,
          message: `${results.length} items dispatched to your field kit by ${actorName}.`,
          category: NotificationCategory.INVENTORY,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/inventory',
        });
      }

      // 2. Notify Target Group Members
      if (targetType === 'GROUP' && assignedGroupId) {
        await notifyGroupMembers(assignedGroupId, {
          title: `📦 Team Equipment Dispatched (${results.length} items)`,
          message: `${results.length} items allocated to your field team by ${actorName}.`,
          category: NotificationCategory.INVENTORY,
          priority: NotificationPriority.NORMAL,
          actionUrl: '/inventory',
          excludeUserId: req.user?.id,
        });
      }

      // 3. Notify Admins and Managers
      await notifyAdminsAndManagers({
        title: `📦 Equipment Dispatched: ${results.length} items`,
        message: `${custodianDesc} by ${actorName}.`,
        category: NotificationCategory.INVENTORY,
        priority: NotificationPriority.NORMAL,
        actionUrl: '/inventory',
        excludeUserId: req.user?.id,
      });
    } catch (notifErr) {
      console.error('Inventory dispatch notification error:', notifErr);
    }

    res.json({
      message: `Successfully dispatched ${results.length} equipment items to ${custodianDesc}`,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('batchDispatchInventory error:', error);
    res.status(500).json({ error: 'Failed to execute batch dispatch' });
  }
};

// Group Panel: Get All Inventory Items Assigned to a Specific Group with 3-Category Breakdown
export const getGroupInventoryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.id as string;

    const groupItems = await prisma.inventoryItem.findMany({
      where: {
        OR: [
          { assignedGroupId: groupId },
          {
            tickets: {
              some: {
                ticket: {
                  assignedGroupId: groupId,
                },
              },
            },
          },
        ],
      },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        assignedClient: { select: { id: true, name: true, companyName: true, address: true } },
        assignedVehicle: { select: { id: true, registrationNo: true } },
        tickets: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true,
                client: { select: { id: true, name: true, companyName: true } },
              },
            },
          },
        },
        logs: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { performedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const activeFieldItems: any[] = [];
    const installedSiteItems: any[] = [];
    const mustReturnItems: any[] = [];

    const classifiedItems = groupItems.map((item) => {
      const isDamaged = item.condition === 'DAMAGED' || item.condition === 'DEFECTIVE' || item.condition === 'NEEDS_REPAIR';
      const isMaintenance = item.status === 'UNDER_MAINTENANCE' || item.status === 'RETIRED';
      const isExplicitlyInstalled = item.isInstalledAtSite === true || (item.location && item.location.toLowerCase().startsWith('installed') && !item.retrievedAt);
      const isExplicitlyMarkedReturn = (item.location && item.location.toLowerCase().startsWith('must return')) || item.retrievedAt !== null;

      let classification: 'FIELD_CUSTODY' | 'INSTALLED_ON_SITE' | 'MUST_RETURN' = 'FIELD_CUSTODY';
      let classificationReason = 'In group custody / ready for deployment';

      if (isDamaged) {
        classification = 'MUST_RETURN';
        classificationReason = `Defective/Damaged (${item.condition}) - Must return to central warehouse for repair`;
        mustReturnItems.push(item);
      } else if (isMaintenance) {
        classification = 'MUST_RETURN';
        classificationReason = `Asset status is ${item.status} - Must return to central stock`;
        mustReturnItems.push(item);
      } else if (isExplicitlyMarkedReturn) {
        classification = 'MUST_RETURN';
        classificationReason = item.damageNotes || 'Uninstalled / Leftover item - Must return to warehouse';
        mustReturnItems.push(item);
      } else if (isExplicitlyInstalled) {
        classification = 'INSTALLED_ON_SITE';
        const clientName = item.assignedClient?.companyName || item.assignedClient?.name || 'Client Site';
        classificationReason = `Installed on-site at ${clientName}`;
        installedSiteItems.push(item);
      } else {
        classification = 'FIELD_CUSTODY';
        classificationReason = 'Available in group toolbag / field custody';
        activeFieldItems.push(item);
      }

      return {
        ...item,
        classification,
        classificationReason,
      };
    });

    res.json({
      summary: {
        totalCount: classifiedItems.length,
        activeFieldCount: activeFieldItems.length,
        installedSiteCount: installedSiteItems.length,
        mustReturnCount: mustReturnItems.length,
      },
      activeFieldItems,
      installedSiteItems,
      mustReturnItems,
      items: classifiedItems,
    });
  } catch (error) {
    console.error('getGroupInventoryItems error:', error);
    res.status(500).json({ error: 'Failed to fetch group equipment' });
  }
};

// Group Panel: Batch Assign Products to Group
export const assignGroupInventoryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.id as string;
    const { itemIds, barcodes, notes } = req.body;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    let targetItems: { id: string; deviceName: string; barcode: string }[] = [];
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      targetItems = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, deviceName: true, barcode: true },
      });
    } else if (Array.isArray(barcodes) && barcodes.length > 0) {
      const cleaned = barcodes.map((b: string) => b.trim().toUpperCase());
      targetItems = await prisma.inventoryItem.findMany({
        where: { barcode: { in: cleaned } },
        select: { id: true, deviceName: true, barcode: true },
      });
    }

    if (targetItems.length === 0) {
      res.status(400).json({ error: 'No matching equipment found to assign' });
      return;
    }

    const logNote = notes
      ? `Allocated to Group "${group.name}" — Note: ${notes}`
      : `Allocated to Group "${group.name}"`;

    const updated = await prisma.$transaction(
      targetItems.map((item) =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: InventoryStatus.ASSIGNED,
            assignedGroupId: groupId,
            assignedUserId: null,
            assignedClientId: null,
            assignedVehicleId: null,
            logs: {
              create: {
                action: InventoryLogAction.CHECK_OUT,
                notes: logNote,
                performedById: req.user?.id || null,
              },
            },
          },
        })
      )
    );

    res.json({
      message: `Successfully assigned ${updated.length} equipment items to "${group.name}"`,
      count: updated.length,
      data: updated,
    });
  } catch (error) {
    console.error('assignGroupInventoryItems error:', error);
    res.status(500).json({ error: 'Failed to assign equipment to group' });
  }
};

// Group Panel: Return an Item from Group back to Central Stock
export const returnGroupInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const groupId = req.params.id as string;
    const itemId = req.params.itemId as string;
    const { condition, notes } = req.body;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });

    if (!item) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }

    const nextCondition = condition ? (condition as InventoryCondition) : undefined;
    const nextStatus = nextCondition === 'DAMAGED' || nextCondition === 'DEFECTIVE'
      ? InventoryStatus.UNDER_MAINTENANCE
      : InventoryStatus.IN_STOCK;

    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        status: nextStatus,
        assignedGroupId: null,
        assignedUserId: null,
        assignedClientId: null,
        assignedVehicleId: null,
        ...(nextCondition && { condition: nextCondition }),
        logs: {
          create: {
            action: InventoryLogAction.CHECK_IN,
            notes: notes
              ? `Returned from Group "${group?.name || 'Group'}" back to central inventory (${nextStatus}). Note: ${notes}`
              : `Returned from Group "${group?.name || 'Group'}" back to central inventory (${nextStatus})`,
            performedById: req.user?.id || null,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('returnGroupInventoryItem error:', error);
    res.status(500).json({ error: 'Failed to return group equipment' });
  }
};

export const addInventoryLog = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { action, notes } = req.body;

    if (!notes) {
      res.status(400).json({ error: 'Log notes/description required' });
      return;
    }

    const log = await prisma.inventoryLog.create({
      data: {
        inventoryItemId: id,
        action: (action as InventoryLogAction) || InventoryLogAction.NOTE,
        notes,
        performedById: req.user?.id || null,
      },
      include: {
        performedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('addInventoryLog error:', error);
    res.status(500).json({ error: 'Failed to add activity log' });
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

export const bulkDeleteInventoryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ error: 'Please provide an array of item IDs to delete' });
      return;
    }

    const count = await prisma.inventoryItem.count({
      where: { id: { in: itemIds } },
    });

    if (count === 0) {
      res.status(400).json({ error: 'No matching items found to delete' });
      return;
    }

    await prisma.inventoryItem.deleteMany({
      where: { id: { in: itemIds } },
    });

    res.json({
      message: `Successfully deleted ${count} inventory item(s)`,
      count,
    });
  } catch (error) {
    console.error('bulkDeleteInventoryItems error:', error);
    res.status(500).json({ error: 'Failed to bulk delete inventory items' });
  }
};

// ============================================================================
// INVENTORY AUDIT DOCUMENT & REPORT GENERATOR (DAILY, WEEKLY, MONTHLY, CUSTOM)
// ============================================================================
export const getInventoryAuditDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { period = 'daily', date, startDate, endDate, category, userId, clientId } = req.query;

    let fromDate: Date;
    let toDate: Date;

    const baseDate = date ? new Date(date as string) : new Date();
    const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    if (period === 'daily') {
      fromDate = new Date(validBase);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(validBase);
      toDate.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      // Find start of week (Monday)
      const day = validBase.getDay();
      const diff = validBase.getDate() - day + (day === 0 ? -6 : 1);
      fromDate = new Date(validBase);
      fromDate.setDate(diff);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + 6);
      toDate.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      fromDate = new Date(validBase.getFullYear(), validBase.getMonth(), 1, 0, 0, 0, 0);
      toDate = new Date(validBase.getFullYear(), validBase.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'custom') {
      fromDate = startDate ? new Date(startDate as string) : new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate = endDate ? new Date(endDate as string) : new Date();
      toDate.setHours(23, 59, 59, 999);
    } else {
      fromDate = new Date(validBase);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(validBase);
      toDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch Company Settings
    const companySettings = await (prisma as any).companySettings.findUnique({
      where: { id: 'default' },
    }).catch(() => null);

    // 2. Fetch all InventoryLogs in this date window
    const logs = await prisma.inventoryLog.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        inventoryItem: {
          include: {
            assignedUser: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
            assignedClient: { select: { id: true, name: true, companyName: true, phone: true, address: true } },
            assignedGroup: { select: { id: true, name: true, color: true } },
            assignedVehicle: { select: { id: true, registrationNo: true, make: true, model: true } },
          },
        },
        performedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch Ticket Inventory Items installed/assigned in this date window
    const ticketItems = await prisma.ticketInventoryItem.findMany({
      where: {
        assignedAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        inventoryItem: true,
        ticket: {
          include: {
            client: { select: { id: true, name: true, companyName: true, address: true, phone: true } },
            assignedUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
            assignedGroup: { select: { id: true, name: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Process Dispatched/Assigned Items
    const assignedLogs = logs.filter((l) => l.action === InventoryLogAction.CHECK_OUT);
    const assignedList = assignedLogs.map((log) => {
      const item = log.inventoryItem;
      return {
        id: log.id,
        itemId: item?.id,
        deviceName: item?.deviceName || 'Hardware Asset',
        modelNumber: item?.modelNumber || null,
        barcode: item?.barcode || 'N/A',
        category: item?.category || 'Hardware/Device',
        condition: item?.condition || 'GOOD',
        unitPrice: item?.unitPrice || 0,
        status: item?.status || 'ASSIGNED',
        dispatchedAt: log.createdAt,
        dispatchedBy: log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'Inventory Manager',
        assignedTo: item?.assignedUser
          ? `Technician: ${item.assignedUser.firstName} ${item.assignedUser.lastName}`
          : item?.assignedClient
          ? `Client: ${item.assignedClient.companyName || item.assignedClient.name}`
          : item?.assignedGroup
          ? `Group: ${item.assignedGroup.name}`
          : item?.assignedVehicle
          ? `Vehicle: ${item.assignedVehicle.registrationNo}`
          : 'Field Custody',
        recipientType: item?.assignedUser ? 'USER' : item?.assignedClient ? 'CLIENT' : item?.assignedGroup ? 'GROUP' : item?.assignedVehicle ? 'VEHICLE' : 'OTHER',
        recipientDetails: item?.assignedUser || item?.assignedClient || item?.assignedGroup || item?.assignedVehicle || null,
        logNotes: log.notes || 'Dispatched for field operation',
      };
    });

    // Process Installed / Used Items On-Site
    const installedMap = new Map<string, any>();
    ticketItems.forEach((ti) => {
      const key = `${ti.ticketId}-${ti.inventoryItemId}`;
      installedMap.set(key, {
        id: ti.id,
        itemId: ti.inventoryItemId,
        ticketId: ti.ticketId,
        ticketNumber: ti.ticket?.ticketNumber || 'N/A',
        ticketTitle: ti.ticket?.title || 'On-site Service',
        ticketStatus: ti.ticket?.status || 'RESOLVED',
        deviceName: ti.inventoryItem?.deviceName || 'Installed Hardware',
        modelNumber: ti.inventoryItem?.modelNumber || null,
        barcode: ti.inventoryItem?.barcode || 'N/A',
        category: ti.inventoryItem?.category || 'Hardware/Device',
        unitPrice: ti.inventoryItem?.unitPrice || 0,
        clientName: ti.ticket?.client?.companyName || ti.ticket?.client?.name || 'Client Premises',
        clientAddress: ti.ticket?.client?.address || ti.ticket?.resolveAddress || 'Client Location',
        installedBy: ti.ticket?.resolvedBy
          ? `${ti.ticket.resolvedBy.firstName} ${ti.ticket.resolvedBy.lastName}`
          : ti.ticket?.assignedUser
          ? `${ti.ticket.assignedUser.firstName} ${ti.ticket.assignedUser.lastName}`
          : 'Field Technician',
        installedAt: ti.assignedAt,
        resolvedAt: ti.ticket?.resolvedAt || ti.assignedAt,
        locationDetails: ti.ticket?.resolveAddress || (ti.ticket?.resolveLat ? `GPS: ${ti.ticket.resolveLat.toFixed(4)}°, ${ti.ticket.resolveLng?.toFixed(4)}°` : 'On-Site Location'),
        notes: ti.notes || ti.ticket?.resolutionNote || 'Installed & operational on client premises',
      });
    });

    // Also include any CHECK_OUT logs that mention "Installed" / "Consumed"
    assignedLogs.forEach((log) => {
      if (log.notes && (log.notes.toLowerCase().includes('installed') || log.notes.toLowerCase().includes('consumed'))) {
        const item = log.inventoryItem;
        const key = `log-install-${log.id}`;
        if (!Array.from(installedMap.values()).some((i) => i.itemId === item?.id)) {
          installedMap.set(key, {
            id: log.id,
            itemId: item?.id,
            ticketNumber: log.notes.match(/#([A-Z0-9-]+)/i)?.[0] || 'On-Site Work',
            ticketTitle: 'Field Equipment Installation',
            ticketStatus: 'INSTALLED',
            deviceName: item?.deviceName || 'Installed Hardware',
            modelNumber: item?.modelNumber || null,
            barcode: item?.barcode || 'N/A',
            category: item?.category || 'Hardware/Device',
            unitPrice: item?.unitPrice || 0,
            clientName: item?.assignedClient?.companyName || item?.assignedClient?.name || 'Client Premises',
            clientAddress: item?.assignedClient?.address || item?.location || 'Client Location',
            installedBy: log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'Field Technician',
            installedAt: log.createdAt,
            resolvedAt: log.createdAt,
            locationDetails: item?.location || 'On-Site Client Location',
            notes: log.notes,
          });
        }
      }
    });
    const installedList = Array.from(installedMap.values());

    // Process Returned & Restocked Items
    const returnedLogs = logs.filter((l) => l.action === InventoryLogAction.CHECK_IN);
    const returnedList = returnedLogs.map((log) => {
      const item = log.inventoryItem;
      let detectedCondition = item?.condition || 'GOOD';
      if (log.notes?.includes('EXCELLENT')) detectedCondition = 'EXCELLENT';
      else if (log.notes?.includes('GOOD')) detectedCondition = 'GOOD';
      else if (log.notes?.includes('FAIR')) detectedCondition = 'FAIR';
      else if (log.notes?.includes('DAMAGED')) detectedCondition = 'DAMAGED';
      else if (log.notes?.includes('DEFECTIVE')) detectedCondition = 'DEFECTIVE';

      return {
        id: log.id,
        itemId: item?.id,
        deviceName: item?.deviceName || 'Returned Asset',
        modelNumber: item?.modelNumber || null,
        barcode: item?.barcode || 'N/A',
        category: item?.category || 'Hardware/Device',
        condition: detectedCondition,
        unitPrice: item?.unitPrice || 0,
        status: item?.status || 'IN_STOCK',
        returnedAt: log.createdAt,
        inspectedBy: log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'Store In-Charge',
        restockedLocation: item?.location || 'Warehouse Main Shelf',
        notes: log.notes || 'Returned back to central inventory stock',
        isDamagedOrDefective: detectedCondition === 'DAMAGED' || detectedCondition === 'DEFECTIVE',
      };
    });

    // Current Master Inventory Snapshot
    const [totalStockCount, inStockCount, assignedCount, maintenanceCount, retiredCount] = await Promise.all([
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({ where: { status: InventoryStatus.IN_STOCK } }),
      prisma.inventoryItem.count({ where: { status: InventoryStatus.ASSIGNED } }),
      prisma.inventoryItem.count({ where: { status: InventoryStatus.UNDER_MAINTENANCE } }),
      prisma.inventoryItem.count({ where: { status: InventoryStatus.RETIRED } }),
    ]);

    // Financial calculations
    const assignedValuation = assignedList.reduce((acc, i) => acc + (i.unitPrice || 0), 0);
    const installedValuation = installedList.reduce((acc, i) => acc + (i.unitPrice || 0), 0);
    const returnedValuation = returnedList.reduce((acc, i) => acc + (i.unitPrice || 0), 0);

    // Reference ID generation
    const yearStr = fromDate.getFullYear();
    const monthStr = String(fromDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(fromDate.getDate()).padStart(2, '0');
    let docRefId = `MI/INV-DOC/${yearStr}${monthStr}/D${dayStr}`;
    if (period === 'weekly') {
      const weekNum = Math.ceil((((fromDate.getTime() - new Date(fromDate.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
      docRefId = `MI/INV-DOC/${yearStr}/W${String(weekNum).padStart(2, '0')}`;
    } else if (period === 'monthly') {
      docRefId = `MI/INV-DOC/${yearStr}-${monthStr}`;
    } else if (period === 'custom') {
      docRefId = `MI/INV-DOC/${yearStr}${monthStr}-CUSTOM`;
    }

    let issuerName = 'Authorized Administrator';
    if (req.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true, role: true },
      });
      if (u) {
        issuerName = `${u.firstName} ${u.lastName} (${u.role})`;
      } else if (req.user.username) {
        issuerName = `${req.user.username} (${req.user.role})`;
      }
    }

    res.json({
      success: true,
      documentMeta: {
        docRefId,
        period,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        generatedAt: new Date().toISOString(),
        generatedBy: issuerName,
        company: companySettings || {
          name: 'Media Infotech Private Limited',
          tagline: 'Enterprise IT Solutions, Software Engineering & Cloud Infrastructure',
          address: 'Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091',
          gstin: '19AAECM4920M1Z8',
          cin: 'U72200WB2020PTC239871',
          email: 'hr@mediainfotech.com',
          phone: '+91 33 4000 1234',
          logoUrl: '/Icon.png',
          authorizedSigner: 'Authorized Signatory / Warehouse Head',
        },
      },
      kpiSummary: {
        assignedCount: assignedList.length,
        assignedValuation,
        installedCount: installedList.length,
        installedValuation,
        returnedCount: returnedList.length,
        returnedValuation,
        netMovement: returnedList.length - assignedList.length,
        damagedReturnsCount: returnedList.filter((r) => r.isDamagedOrDefective).length,
      },
      currentStockSnapshot: {
        totalDevices: totalStockCount,
        inStock: inStockCount,
        assigned: assignedCount,
        underMaintenance: maintenanceCount,
        retired: retiredCount,
      },
      assignedItems: assignedList,
      installedItems: installedList,
      returnedItems: returnedList,
    });
  } catch (error) {
    console.error('getInventoryAuditDocument error:', error);
    res.status(500).json({ error: 'Failed to generate inventory audit document' });
  }
};

// ============================================================================
// RETRIEVE FIELD INSTALLED PRODUCT & OPTIONALLY DISPATCH REPLACEMENT
// ============================================================================
export const retrieveInstalledInventoryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawItemId = req.body.itemId || req.body.inventoryItemId;
    const rawCondition = (req.body.returnCondition || req.body.condition || 'DAMAGED').toUpperCase();
    const rawLocation = req.body.restockLocation || req.body.returnLocation;
    const {
      damageNotes,
      replacementItemId,
      replacementBarcode,
      replacementNotes,
      ticketId,
      clientId,
    } = req.body;

    if (!rawItemId) {
      res.status(400).json({ error: 'itemId or inventoryItemId is required' });
      return;
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: rawItemId as string },
      include: { assignedClient: true, assignedGroup: true },
    });
    if (!item) {
      res.status(404).json({ error: 'Installed equipment not found' });
      return;
    }

    const validCondition = (rawCondition === 'GOOD' || rawCondition === 'NEEDS_REPAIR') ? rawCondition : 'DAMAGED';
    const isMaintenance = validCondition === 'DAMAGED' || validCondition === 'NEEDS_REPAIR';

    // 1. Retrieve the item from site
    const updatedRetrieved = await prisma.inventoryItem.update({
      where: { id: rawItemId as string },
      data: {
        isInstalledAtSite: false,
        retrievedAt: new Date(),
        condition: validCondition as any,
        status: isMaintenance ? InventoryStatus.UNDER_MAINTENANCE : InventoryStatus.IN_STOCK,
        damageNotes: damageNotes || null,
        location: isMaintenance
          ? (rawLocation || 'Central Repair Queue / Under Maintenance')
          : (rawLocation || 'Central Warehouse (Retrieved)'),
        assignedClientId: null,
      },
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: rawItemId as string,
        performedById: req.user?.id || null,
        action: isMaintenance ? InventoryLogAction.MAINTENANCE : InventoryLogAction.CHECK_IN,
        notes: `Retrieved from field site (Condition: ${validCondition}). Damage Notes: ${damageNotes || 'N/A'}`,
      },
    });

    // 2. Dispatch Replacement if specified
    let replacementItem: any = null;
    if (replacementItemId || replacementBarcode) {
      replacementItem = await prisma.inventoryItem.findFirst({
        where: replacementItemId
          ? { id: replacementItemId }
          : { barcode: String(replacementBarcode).trim().toUpperCase() },
      });

      if (replacementItem) {
        const clientTargetId = clientId || item.assignedClientId || null;
        await prisma.inventoryItem.update({
          where: { id: replacementItem.id },
          data: {
            status: InventoryStatus.ASSIGNED,
            isInstalledAtSite: true,
            installedAt: new Date(),
            installedTicketId: ticketId || item.installedTicketId || null,
            assignedClientId: clientTargetId,
            assignedGroupId: item.assignedGroupId || null,
            assignedUserId: item.assignedUserId || req.user?.id || null,
            location: `Installed on-site (Replacing ${item.barcode})`,
          },
        });

        await prisma.inventoryLog.create({
          data: {
            inventoryItemId: replacementItem.id,
            performedById: req.user?.id || null,
            action: InventoryLogAction.CHECK_OUT,
            notes: `Field Replacement installed (Replaced faulty unit ${item.barcode}). ${replacementNotes ? `Remarks: ${replacementNotes}` : ''}`,
          },
        });
      }
    }

    res.json({
      success: true,
      message: replacementItem
        ? `Retrieved ${item.barcode} and dispatched replacement ${replacementItem.barcode}`
        : `Retrieved ${item.barcode} from site`,
      retrievedItem: updatedRetrieved,
      replacementItem,
    });
  } catch (error: any) {
    console.error('retrieveInstalledInventoryItem error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve equipment' });
  }
};
