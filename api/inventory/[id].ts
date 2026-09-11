import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const { id } = req.query;
  const productId = parseInt(id as string, 10);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ ok: false, message: 'Invalid product ID' });
  }

  try {
    const itemRes = await query(
      'SELECT * FROM jewellery_items WHERE id = $1 LIMIT 1',
      [productId]
    );

    if (itemRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }

    const product = itemRes.rows[0];

    // Fetch extra images
    const imagesRes = await query(
      'SELECT id, filename, sort_order FROM jewellery_item_images WHERE product_id = $1 ORDER BY sort_order ASC, id ASC',
      [productId]
    );

    // Fetch approved customer reviews
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
    });
  } catch (error: any) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({ ok: false, message: 'Failed to load product', error: error.message });
  }
}
