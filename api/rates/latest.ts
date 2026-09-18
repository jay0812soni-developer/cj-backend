import type { VercelRequest, VercelResponse } from '@vercel/node';
import ratesHandler from '../rates';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return ratesHandler(req, res);
}
