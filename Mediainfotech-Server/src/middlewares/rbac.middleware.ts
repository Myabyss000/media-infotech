import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export const requirePermission = (module: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId, role } = req.user;

    // ADMIN role has full access by default
    if (role === Role.ADMIN) {
      next();
      return;
    }

    try {
      // 1. Check user-level explicit permission overrides
      const userPermission = await prisma.userPermission.findFirst({
        where: {
          userId,
          permission: { module, action },
        },
      });

      if (userPermission !== null) {
        if (userPermission.granted) {
          next();
          return;
        } else {
          res.status(403).json({ error: `Permission denied: ${module}:${action}` });
          return;
        }
      }

      // 2. Check role-level default permissions
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          role: role as Role,
          permission: { module, action },
        },
      });

      if (rolePermission) {
        next();
        return;
      }

      res.status(403).json({ error: `Access denied: missing permission ${module}:${action}` });
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Internal permission check error' });
    }
  };
};
