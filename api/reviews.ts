import type { VercelRequest, VercelResponse } from '@vercel/node';
import reviewsHandler from './reviews/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return reviewsHandler(req, res);
}
