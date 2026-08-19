import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const DEFAULT_COMPANY_SETTINGS = {
  id: 'default',
  name: 'Media Infotech Private Limited',
  tagline: 'Enterprise IT Solutions, Software Engineering & Cloud Infrastructure',
  address: 'Corporate Tower, Suite 400, Sector 5, Salt Lake, Kolkata, WB - 700091',
  cin: 'U72200WB2020PTC239871',
  gstin: '19AAECM4920M1Z8',
  email: 'hr@mediainfotech.com',
  website: 'www.mediainfotech.com',
  phone: '+91 33 4000 1234',
  logoUrl: '/Icon.png',
  authorizedSigner: 'Authorized Signatory / HR Dept.',
};

export const getCompanySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await (prisma as any).companySettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      res.json({ data: DEFAULT_COMPANY_SETTINGS });
      return;
    }

    res.json({ data: settings });
  } catch (error) {
    console.error('getCompanySettings error:', error);
    // Return default settings if DB model is initializing
    res.json({ data: DEFAULT_COMPANY_SETTINGS });
  }
};

export const updateCompanySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAuthorized = ['ADMIN', 'HR', 'MANAGER'].includes(req.user?.role || '');
    if (!isAuthorized) {
      res.status(403).json({ error: 'Access denied: Only Admin, HR, and Managers can update company settings' });
      return;
    }

    const {
      name,
      tagline,
      address,
      cin,
      gstin,
      email,
      website,
      phone,
      logoUrl,
      authorizedSigner,
    } = req.body;

    const updated = await (prisma as any).companySettings.upsert({
      where: { id: 'default' },
      update: {
        name: name || DEFAULT_COMPANY_SETTINGS.name,
        tagline: tagline || DEFAULT_COMPANY_SETTINGS.tagline,
        address: address || DEFAULT_COMPANY_SETTINGS.address,
        cin: cin || DEFAULT_COMPANY_SETTINGS.cin,
        gstin: gstin || DEFAULT_COMPANY_SETTINGS.gstin,
        email: email || DEFAULT_COMPANY_SETTINGS.email,
        website: website || DEFAULT_COMPANY_SETTINGS.website,
        phone: phone || DEFAULT_COMPANY_SETTINGS.phone,
        logoUrl: logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
        authorizedSigner: authorizedSigner || DEFAULT_COMPANY_SETTINGS.authorizedSigner,
        updatedBy: req.user?.id,
      },
      create: {
        id: 'default',
        name: name || DEFAULT_COMPANY_SETTINGS.name,
        tagline: tagline || DEFAULT_COMPANY_SETTINGS.tagline,
        address: address || DEFAULT_COMPANY_SETTINGS.address,
        cin: cin || DEFAULT_COMPANY_SETTINGS.cin,
        gstin: gstin || DEFAULT_COMPANY_SETTINGS.gstin,
        email: email || DEFAULT_COMPANY_SETTINGS.email,
        website: website || DEFAULT_COMPANY_SETTINGS.website,
        phone: phone || DEFAULT_COMPANY_SETTINGS.phone,
        logoUrl: logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl,
        authorizedSigner: authorizedSigner || DEFAULT_COMPANY_SETTINGS.authorizedSigner,
        updatedBy: req.user?.id,
      },
    });

    res.json({ message: 'Company settings updated successfully', data: updated });
  } catch (error: any) {
    console.error('updateCompanySettings error:', error);
    res.status(500).json({ error: error?.message || 'Failed to update company settings' });
  }
};
