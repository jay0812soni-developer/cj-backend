import type { VercelRequest, VercelResponse } from '@vercel/node';
import inventoryHandler from './inventory/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return inventoryHandler(req, res);
}
