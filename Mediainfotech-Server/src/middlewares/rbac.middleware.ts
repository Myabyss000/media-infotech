import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  EMPLOYEE: [
    'users:read',
    'vehicles:read',
    'leave:read',
    'groups:read',
    'clients:read',
    'tickets:read',
    'tickets:update',
    'inventory:read',
    'holidays:read',
    'hr:read',
  ],
  MANAGER: [
    'users:read',
    'users:create',
    'users:update',
    'attendance:read',
    'attendance:approve',
    'attendance:create',
    'attendance:update',
    'leave:read',
    'leave:approve',
    'leave:create',
    'leave:update',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'vehicles:delete',
    'payslips:read',
    'payslips:create',
    'payslips:update',
    'payroll:read',
    'payroll:create',
    'payroll:update',
    'clients:read',
    'clients:create',
    'clients:update',
    'groups:read',
    'groups:create',
    'groups:update',
    'groups:delete',
    'tickets:read',
    'tickets:create',
    'tickets:update',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'holidays:read',
    'holidays:create',
    'holidays:update',
    'holidays:delete',
    'hr:read',
    'hr:create',
    'hr:update',
    'hr:delete',
  ],
  HR: [
    'users:read',
    'users:create',
    'users:update',
    'attendance:read',
    'attendance:approve',
    'leave:read',
    'leave:approve',
    'leave:update',
    'vehicles:read',
    'vehicles:create',
    'vehicles:update',
    'vehicles:delete',
    'payslips:read',
    'payslips:create',
    'payslips:update',
    'payslips:delete',
    'payroll:read',
    'payroll:create',
    'payroll:update',
    'clients:read',
    'groups:read',
    'groups:create',
    'groups:update',
    'groups:delete',
    'tickets:read',
    'inventory:read',
    'holidays:read',
    'hr:read',
    'hr:create',
    'hr:update',
    'hr:delete',
  ],
  ACCOUNTS: [
    'users:read',
    'payslips:read',
    'payslips:create',
    'payslips:update',
    'payroll:read',
    'payroll:create',
    'payroll:update',
    'clients:read',
    'groups:read',
    'tickets:read',
    'inventory:read',
    'holidays:read',
    'hr:read',
  ],
};


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

      // 2. Check role-level default permissions in Database
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

      // 3. Fallback to default role permissions matrix
      const permKey = `${module}:${action}`;
      const defaultRolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      if (defaultRolePerms.includes(permKey)) {
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
