'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface UserPermission {
  permission: {
    module: string;
    action: string;
  };
  granted: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'ACCOUNTS' | 'HR' | 'EMPLOYEE';
  avatar?: string;
  designation?: string;
  department?: string;
  permissions?: UserPermission[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/api/auth/me');
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (accessToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      router.push('/login');
    }
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // Admin bypasses all checks

    if (user.permissions) {
      const explicit = user.permissions.find(
        (p) => p.permission.module === module && p.permission.action === action
      );
      if (explicit !== undefined) {
        return explicit.granted;
      }
    }

    // Role defaults
    const roleDefaultPermissions: Record<string, string[]> = {
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
        'groups:read',
        'groups:create',
        'groups:update',
      ],
      ACCOUNTS: ['users:read', 'payslips:read', 'payslips:create', 'payslips:update', 'payroll:read', 'clients:read', 'groups:read'],
      EMPLOYEE: ['leave:read', 'groups:read', 'tickets:read', 'tickets:update', 'inventory:read', 'holidays:read'],
    };

    const allowed = roleDefaultPermissions[user.role] || [];
    return allowed.includes(`${module}:${action}`);
  };


  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
