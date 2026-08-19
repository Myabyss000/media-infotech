import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getCompanyPolicies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { category, search } = req.query;

    const where: any = {};
    if (category && category !== 'ALL') where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const policies = await prisma.companyPolicy.findMany({
      where,
      include: {
        acknowledgments: userId
          ? {
              where: { userId },
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = policies.map((p) => ({
      ...p,
      isAcknowledged: p.acknowledgments && p.acknowledgments.length > 0,
      attachmentUrl: p.fileUrl,
      requiresAck: p.isMandatoryAck,
      effectiveDate: p.createdAt,
    }));

    res.json({ data: formatted });
  } catch (error) {
    console.error('getCompanyPolicies error:', error);
    res.status(500).json({ error: 'Failed to fetch company policies' });
  }
};

export const createCompanyPolicy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Access denied: Only HR, Managers, and Admins can publish company policies' });
      return;
    }

    const { title, category, content, version, requiresAck, attachmentUrl } = req.body;

    if (!title || !category || !content) {
      res.status(400).json({ error: 'title, category, and content are required' });
      return;
    }

    const policy = await prisma.companyPolicy.create({
      data: {
        title,
        category,
        content,
        version: version || '1.0',
        isMandatoryAck: Boolean(requiresAck),
        fileUrl: attachmentUrl || null,
      },
    });

    res.status(201).json({ message: 'Company policy published', data: policy });
  } catch (error) {
    console.error('createCompanyPolicy error:', error);
    res.status(500).json({ error: 'Failed to create company policy' });
  }
};

export const updateCompanyPolicy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Access denied: Only HR, Managers, and Admins can update company policies' });
      return;
    }

    const { id } = req.params;
    const { title, category, content, version, requiresAck, attachmentUrl } = req.body;

    const policy = await prisma.companyPolicy.update({
      where: { id: id as string },
      data: {
        title: title !== undefined ? title : undefined,
        category: category !== undefined ? category : undefined,
        content: content !== undefined ? content : undefined,
        version: version !== undefined ? version : undefined,
        isMandatoryAck: requiresAck !== undefined ? Boolean(requiresAck) : undefined,
        fileUrl: attachmentUrl !== undefined ? attachmentUrl : undefined,
      },
    });

    res.json({ message: 'Company policy updated', data: policy });
  } catch (error) {
    console.error('updateCompanyPolicy error:', error);
    res.status(500).json({ error: 'Failed to update company policy' });
  }
};

export const deleteCompanyPolicy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isHRorAdmin = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isHRorAdmin) {
      res.status(403).json({ error: 'Access denied: Only HR, Managers, and Admins can delete company policies' });
      return;
    }

    const { id } = req.params;
    await prisma.companyPolicy.delete({ where: { id: id as string } });

    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('deleteCompanyPolicy error:', error);
    res.status(500).json({ error: 'Failed to delete company policy' });
  }
};

export const acknowledgePolicy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return;

    const { id } = req.params;

    const ack = await prisma.policyAcknowledgment.upsert({
      where: { policyId_userId: { policyId: id as string, userId } },
      update: { acknowledgedAt: new Date() },
      create: { policyId: id as string, userId, acknowledgedAt: new Date() },
    });

    res.json({ message: 'Policy acknowledged successfully', data: ack });
  } catch (error) {
    console.error('acknowledgePolicy error:', error);
    res.status(500).json({ error: 'Failed to acknowledge policy' });
  }
};
