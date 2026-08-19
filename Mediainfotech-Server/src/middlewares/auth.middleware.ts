import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    id: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true, role: true, isActive: true, firstName: true, lastName: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User account is deactivated or invalid' });
      return;
    }

    req.user = {
      userId: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return;
  }
};
