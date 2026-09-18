import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';
import { getJwtSecret } from './jwt-config';

export interface CustomerAuth {
  id: number;
  phone: string;
}

export function verifyCustomerToken(req: VercelRequest): CustomerAuth | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId?: number;
      phone?: string;
      role?: string;
    };
    if (!decoded?.userId || decoded.role !== 'customer') {
      return null;
    }
    return {
      id: Number(decoded.userId),
      phone: String(decoded.phone || ''),
    };
  } catch {
    return null;
  }
}
