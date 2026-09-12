import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { VercelRequest } from '@vercel/node';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'cj_chandrakala_admin_jwt_secret_key_2026';

export interface AdminUser {
  id: number;
  username: string;
  role: 'superadmin' | 'admin' | 'deven';
  displayName: string;
}

export const SEEDED_ADMIN_USERS: Array<AdminUser & { passwordPlain: string; passwordHash?: string }> = [
  {
    id: 1,
    username: 'superadmin',
    passwordPlain: 'Super@12345',
    role: 'superadmin',
    displayName: 'Soni Jaykumar Hasmukh',
  },
  {
    id: 2,
    username: 'admin',
    passwordPlain: 'mVsr@1617',
    role: 'admin',
    displayName: 'Hasmukh Hiralal Soni',
  },
  {
    id: 3,
    username: 'deven',
    passwordPlain: 'mVsr@1617',
    role: 'deven',
    displayName: 'Deven Hasmukhbhai Soni',
  },
];

export function generateAdminToken(user: AdminUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
    JWT_SECRET,
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.username || !decoded.role) {
      return null;
    }
    return {
      id: Number(decoded.id) || 1,
      username: String(decoded.username),
      role: decoded.role,
      displayName: String(decoded.displayName || decoded.username),
    };
  } catch {
    return null;
  }
}
