import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { LeaveStatus, LeaveType } from '@prisma/client';

export const createLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const { type, startDate, endDate, totalDays, reason } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      res.status(400).json({ error: 'type, startDate, endDate, and reason are required' });
      return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        type: type as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: totalDays ? parseFloat(totalDays) : 1,
        reason,
        status: LeaveStatus.PENDING,
      },
    });

    res.status(201).json({ message: 'Leave request submitted', data: leave });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create leave request' });
  }
};

export const getMyLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const leaves = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const getAllLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status as LeaveStatus;

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, department: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all leave requests' });
  }
};

export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, rejectionNote } = req.body;
    const approverId = req.user?.id;

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionNote: rejectionNote || null,
      },
    });

    res.json({ message: `Leave ${status.toLowerCase()}`, data: leave });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update leave status' });
  }
};
