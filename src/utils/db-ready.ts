import type { VercelResponse } from '@vercel/node';
import { isDbConfigured } from '../db';

export function databaseUnavailable(res: VercelResponse) {
  return res.status(503).json({
    ok: false,
    message:
      'PostgreSQL is not configured yet. The live shop remains at https://chandrakalajewellers.in until migration is complete.',
    source: 'unconfigured',
  });
}

export function requireDatabase(res: VercelResponse): boolean {
  if (isDbConfigured) {
    return true;
  }
  databaseUnavailable(res);
  return false;
}
