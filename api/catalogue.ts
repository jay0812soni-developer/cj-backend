import type { VercelRequest, VercelResponse } from '@vercel/node';
import catalogueHandler from './catalogue/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return catalogueHandler(req, res);
}
