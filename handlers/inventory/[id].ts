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

  const { id } = req.query;
  const productId = parseInt(id as string, 10);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ ok: false, message: 'Invalid product ID' });
  }

  try {
    const itemRes = await query('SELECT * FROM jewellery_items WHERE id = $1 LIMIT 1', [productId]);

    if (itemRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }

    const product = itemRes.rows[0];

    const imagesRes = await query(
      'SELECT id, filename, sort_order FROM jewellery_item_images WHERE product_id = $1 ORDER BY sort_order ASC, id ASC',
      [productId]
    );

    const reviewsRes = await query(
      'SELECT id, customer_name, rating, comment, created_at FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE ORDER BY created_at DESC',
      [productId]
    );

    return res.status(200).json({
      ok: true,
      data: {
        ...product,
        extra_images: imagesRes.rows,
        reviews: reviewsRes.rows,
      },
      source: 'database',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Product query failed';
    console.error('[Inventory Item API]', message);
    return res.status(500).json({ ok: false, message: 'Could not load this piece.' });
  }
}
