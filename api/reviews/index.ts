import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';
import { requireDatabase } from '../../src/utils/db-ready';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  if (!requireDatabase(res)) return;

  const productId = parseInt(req.query.product_id as string, 10);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ ok: false, message: 'Invalid product_id' });
  }

  try {
    const reviewsRes = await query(
      'SELECT id, customer_name, rating, comment, created_at FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE ORDER BY id DESC',
      [productId]
    );

    const reviews = reviewsRes.rows;
    const count = reviews.length;
    const avg =
      count > 0
        ? +(reviews.reduce((acc: number, r: { rating: string | number }) => acc + (parseFloat(String(r.rating)) || 0), 0) / count).toFixed(1)
        : 0;

    return res.status(200).json({
      ok: true,
      data: {
        count,
        avg,
        reviews,
      },
      source: 'database',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reviews query failed';
    console.error('[Reviews API]', message);
    return res.status(500).json({ ok: false, message: 'Could not load reviews.' });
  }
}
