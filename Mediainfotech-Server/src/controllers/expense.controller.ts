import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getMyExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const expenses = await prisma.expenseClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: expenses });
  } catch (error) {
    console.error('getMyExpenses error:', error);
    res.status(500).json({ error: 'Failed to fetch personal expense claims' });
  }
};

export const getAllExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, category } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status as string;
    if (category && category !== 'ALL') where.category = category as string;

    const expenses = await prisma.expenseClaim.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            designation: true,
            department: true,
            employeeCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: expenses });
  } catch (error) {
    console.error('getAllExpenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expense claims' });
  }
};

export const createExpenseClaim = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const { title, category, amount, date, receiptUrl, description } = req.body;

    if (!title || !category || !amount || !date) {
      res.status(400).json({ error: 'title, category, amount, and date are required' });
      return;
    }

    const claim = await prisma.expenseClaim.create({
      data: {
        userId,
        title,
        category,
        amount: parseFloat(amount),
        date: new Date(date),
        receiptUrl: receiptUrl || null,
        description: description || null,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: 'Expense reimbursement claim submitted', data: claim });
  } catch (error) {
    console.error('createExpenseClaim error:', error);
    res.status(500).json({ error: 'Failed to submit expense claim' });
  }
};

export const updateExpenseStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isApprover = ['ADMIN', 'HR', 'ACCOUNTS', 'MANAGER'].includes(req.user?.role || '');
    if (!isApprover) {
      res.status(403).json({ error: 'Unauthorized to process expense claims' });
      return;
    }

    const { id } = req.params;
    const { status, rejectionNote } = req.body;

    if (!['APPROVED', 'REJECTED', 'PAID', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const existingClaim = await prisma.expenseClaim.findUnique({
      where: { id: id as string },
    });

    if (!existingClaim) {
      res.status(404).json({ error: 'Expense claim not found' });
      return;
    }

    // Segregation of duties: Prevent users from approving/paying their own expense claims
    if (existingClaim.userId === req.user?.id && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Segregation of duties violation: You cannot approve or pay your own expense claim' });
      return;
    }

    const claim = await prisma.expenseClaim.update({
      where: { id: id as string },
      data: {
        status,
        approvedBy: req.user?.id,
        approvedAt: new Date(),
        rejectionNote: rejectionNote || null,
      },
    });

    res.json({ message: `Expense claim ${status.toLowerCase()}`, data: claim });
  } catch (error) {
    console.error('updateExpenseStatus error:', error);
    res.status(500).json({ error: 'Failed to update expense status' });
  }
};
