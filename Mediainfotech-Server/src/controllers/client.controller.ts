import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ClientStatus } from '@prisma/client';

export const getClients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: any = {};
    if (status) where.status = status as ClientStatus;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          accountManager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { services: true, transactions: true, businessHistory: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ data: clients, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const getClientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        accountManager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        services: { orderBy: { createdAt: 'desc' } },
        transactions: { orderBy: { date: 'desc' } },
        businessHistory: { orderBy: { date: 'desc' } },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
};

export const createClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, companyName, email, phone, altPhone, address, city, state, pincode, gstNumber, accountManagerId } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone are required' });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name,
        companyName,
        email,
        phone,
        altPhone,
        address,
        city,
        state,
        pincode,
        gstNumber,
        accountManagerId,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client' });
  }
};

export const updateClient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const client = await prisma.client.update({
      where: { id },
      data: req.body,
    });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' });
  }
};

export const addClientService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { serviceTypeId, serviceName, startDate, endDate, amount, notes } = req.body;

    if (!serviceTypeId || !serviceName) {
      res.status(400).json({ error: 'serviceTypeId and serviceName are required' });
      return;
    }

    const service = await prisma.clientService.create({
      data: {
        clientId: id,
        serviceTypeId,
        serviceName,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        amount: amount ? parseFloat(amount) : null,
        notes,
      },
    });

    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add client service' });
  }
};

export const addClientTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { type, amount, description, referenceNo, date } = req.body;

    if (!type || !amount || !date) {
      res.status(400).json({ error: 'type, amount, and date are required' });
      return;
    }

    const transaction = await prisma.clientTransaction.create({
      data: {
        clientId: id,
        type,
        amount: parseFloat(amount),
        description,
        referenceNo,
        date: new Date(date),
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add client transaction' });
  }
};

export const addBusinessHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { type, title, description, date } = req.body;
    const userId = req.user?.id || 'system';

    if (!type || !title || !date) {
      res.status(400).json({ error: 'type, title, and date are required' });
      return;
    }

    const history = await prisma.businessHistory.create({
      data: {
        clientId: id,
        type,
        title,
        description,
        date: new Date(date),
        createdBy: userId,
      },
    });

    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record business history' });
  }
};

export const getServiceTypes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const types = await prisma.serviceType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service types' });
  }
};

export const createServiceType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const serviceType = await prisma.serviceType.create({
      data: { name, description },
    });

    res.status(201).json(serviceType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service type' });
  }
};
