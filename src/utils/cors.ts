import type { VercelRequest, VercelResponse } from '@vercel/node';

function allowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const requestOrigin = String(req.headers.origin || '');
  const allowList = allowedOrigins();
  const isProd = process.env.NODE_ENV === 'production';

  let allowOrigin = requestOrigin;
  if (allowList.length > 0) {
    allowOrigin = allowList.includes(requestOrigin) ? requestOrigin : allowList[0];
  } else if (isProd && !requestOrigin) {
    allowOrigin = 'https://chandrakalajewellers.in';
  } else if (!requestOrigin) {
    allowOrigin = '*';
  }

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (allowOrigin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}
