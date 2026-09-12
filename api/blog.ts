import type { VercelRequest, VercelResponse } from '@vercel/node';
import blogHandler from './blog/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return blogHandler(req, res);
}
