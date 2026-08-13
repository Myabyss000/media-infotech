import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { VehicleStatus } from '@prisma/client';

export const getVehicles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
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
    const { registrationNo, type, make, model, year, fuelType, notes } = req.body;
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
        status: VehicleStatus.AVAILABLE,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle' });
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
