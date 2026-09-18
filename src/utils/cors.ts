import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_ORIGINS = [
  'https://chandrakala-jewellers.vercel.app',
  'https://cj-admin.vercel.app',
  'https://chandrakalajewellers.in',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

function allowedOrigins(): string[] {
  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (allowedOrigins().includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return (
      host.endsWith('.vercel.app') &&
      (host.startsWith('chandrakala-jewellers') || host.startsWith('cj-admin'))
    );
  } catch {
    return false;
  }
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const requestOrigin = String(req.headers.origin || '');
  const allowOrigin = isAllowedOrigin(requestOrigin) ? requestOrigin : '*';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
