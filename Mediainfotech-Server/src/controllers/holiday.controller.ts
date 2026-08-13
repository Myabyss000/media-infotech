import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { HolidayType } from '@prisma/client';

export const getHolidays = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { year = new Date().getFullYear().toString(), type } = req.query;
    const yearNum = parseInt(year as string, 10);

    const where: any = { year: yearNum };
    if (type && type !== 'ALL') {
      where.type = type as HolidayType;
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.json(holidays);
  } catch (error) {
    console.error('getHolidays error:', error);
    res.status(500).json({ error: 'Failed to fetch holiday calendar' });
  }
};

export const getUpcomingHolidays = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = await prisma.holiday.findMany({
      where: {
        date: { gte: today },
      },
      take: 6,
      orderBy: { date: 'asc' },
    });

    res.json(upcoming);
  } catch (error) {
    console.error('getUpcomingHolidays error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
};

export const createHoliday = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, date, type, description, isMandatory } = req.body;

    if (!name || !date) {
      res.status(400).json({ error: 'Holiday name and date are required' });
      return;
    }

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    const existing = await prisma.holiday.findUnique({
      where: { date_name: { date: holidayDate, name } },
    });

    if (existing) {
      res.status(400).json({ error: 'A holiday with this name and date already exists.' });
      return;
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: holidayDate,
        year,
        type: (type as HolidayType) || HolidayType.COMPANY,
        description: description || null,
        isMandatory: isMandatory !== undefined ? Boolean(isMandatory) : true,
      },
    });

    res.status(201).json(holiday);
  } catch (error) {
    console.error('createHoliday error:', error);
    res.status(500).json({ error: 'Failed to add holiday' });
  }
};

export const updateHoliday = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, date, type, description, isMandatory } = req.body;

    let updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type as HolidayType;
    if (description !== undefined) updateData.description = description;
    if (isMandatory !== undefined) updateData.isMandatory = Boolean(isMandatory);

    if (date) {
      const holidayDate = new Date(date);
      updateData.date = holidayDate;
      updateData.year = holidayDate.getFullYear();
    }

    const updated = await prisma.holiday.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('updateHoliday error:', error);
    res.status(500).json({ error: 'Failed to edit holiday' });
  }
};

export const deleteHoliday = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.holiday.delete({ where: { id } });
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('deleteHoliday error:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
};
