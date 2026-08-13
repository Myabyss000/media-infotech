import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getMyPayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const payslips = await prisma.payslip.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payslips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

export const getAllPayslips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, month, year } = req.query;
    const where: any = {};
    if (userId) where.userId = userId as string;
    if (month) where.month = parseInt(month as string, 10);
    if (year) where.year = parseInt(year as string, 10);

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, department: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(payslips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

export const createPayslip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, month, year, basicPay, allowances, deductions, netPay, notes } = req.body;
    const filePath = req.file ? `/uploads/payslips/${req.file.filename}` : req.body.filePath;

    if (!userId || !month || !year) {
      res.status(400).json({ error: 'userId, month, and year are required' });
      return;
    }

    const payslip = await prisma.payslip.upsert({
      where: { userId_month_year: { userId, month: parseInt(month, 10), year: parseInt(year, 10) } },
      update: {
        basicPay: basicPay ? parseFloat(basicPay) : undefined,
        allowances: allowances ? parseFloat(allowances) : undefined,
        deductions: deductions ? parseFloat(deductions) : undefined,
        netPay: netPay ? parseFloat(netPay) : undefined,
        filePath: filePath || undefined,
        notes,
      },
      create: {
        userId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        basicPay: basicPay ? parseFloat(basicPay) : 0,
        allowances: allowances ? parseFloat(allowances) : 0,
        deductions: deductions ? parseFloat(deductions) : 0,
        netPay: netPay ? parseFloat(netPay) : 0,
        filePath,
        notes,
      },
    });

    res.status(201).json({ message: 'Payslip saved successfully', data: payslip });
  } catch (error) {
    console.error('Payslip creation error:', error);
    res.status(500).json({ error: 'Failed to save payslip' });
  }
};
