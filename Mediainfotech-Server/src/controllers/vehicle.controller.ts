import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { VehicleStatus } from '@prisma/client';

export const getVehicles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGER', 'HR'].includes(userRole);

    let where: any = {};
    if (!isPrivileged) {
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: req.user?.id },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((g) => g.groupId);

      where = {
        OR: [
          {
            assignments: {
              some: {
                userId: req.user?.id,
                returnedAt: null,
              },
            },
          },
          ...(groupIds.length > 0
            ? [
                {
                  groups: {
                    some: {
                      id: { in: groupIds },
                    },
                  },
                },
              ]
            : []),
        ],
      };
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        },
        groups: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const createVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { registrationNo, type, make, model, year, fuelType, status, notes } = req.body;
    if (!registrationNo || !type || !make || !model) {
      res.status(400).json({ error: 'registrationNo, type, make, and model are required' });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNo,
        type,
        make,
        model,
        year: year ? parseInt(year, 10) : null,
        fuelType,
        notes,
        status: (status as VehicleStatus) || VehicleStatus.AVAILABLE,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('createVehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

export const updateVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { registrationNo, type, make, model, year, fuelType, status, notes } = req.body;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(registrationNo && { registrationNo }),
        ...(type && { type }),
        ...(make && { make }),
        ...(model && { model }),
        ...(year !== undefined && { year: year ? parseInt(year, 10) : null }),
        ...(fuelType !== undefined && { fuelType }),
        ...(status && { status: status as VehicleStatus }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateVehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};

export const deleteVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.vehicle.delete({ where: { id } });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('deleteVehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};

export const assignVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { userId, purpose, notes } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required for vehicle assignment' });
      return;
    }

    const [assignment] = await prisma.$transaction([
      prisma.vehicleAssignment.create({
        data: {
          vehicleId: id,
          userId,
          purpose,
          notes,
        },
      }),
      prisma.vehicle.update({
        where: { id },
        data: { status: VehicleStatus.ASSIGNED },
      }),
    ]);

    res.json({ message: 'Vehicle assigned successfully', data: assignment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign vehicle' });
  }
};

export const returnVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const activeAssignment = await prisma.vehicleAssignment.findFirst({
      where: { vehicleId: id, returnedAt: null },
    });

    if (activeAssignment) {
      await prisma.vehicleAssignment.update({
        where: { id: activeAssignment.id },
        data: { returnedAt: new Date() },
      });
    }

    await prisma.vehicle.update({
      where: { id },
      data: { status: VehicleStatus.AVAILABLE },
    });

    res.json({ message: 'Vehicle marked as returned and available' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to return vehicle' });
  }
};
