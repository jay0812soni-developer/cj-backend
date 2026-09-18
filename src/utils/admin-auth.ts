import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';
import { getJwtSecret } from './jwt-config';

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  displayName: string;
}

export function generateAdminToken(user: AdminUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
}

export function verifyAdminToken(req: VercelRequest): AdminUser | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id?: number;
      username?: string;
      role?: string;
      displayName?: string;
    };
    if (!decoded?.username || !decoded?.role) {
      return null;
    }
    return {
      id: Number(decoded.id) || 0,
      username: String(decoded.username),
      role: String(decoded.role),
      displayName: String(decoded.displayName || decoded.username),
    };
  } catch {
    return null;
  }
}

export function requireAdmin(req: VercelRequest, roles?: string[]): AdminUser | null {
  const user = verifyAdminToken(req);
  if (!user) {
    return null;
  }
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return null;
  }
  return user;
}
