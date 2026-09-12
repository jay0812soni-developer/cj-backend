import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, isDbConfigured } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

const SEED_REVIEWS = [
  {
    id: 1,
    product_id: 110,
    customer_name: 'Pooja Patel',
    rating: 5,
    comment: 'Exquisite 22K craftsmanship! The hallmark purity gives complete peace of mind. Exactly as pictured.',
    created_at: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 2,
    product_id: 110,
    customer_name: 'Haresh Soni',
    rating: 5,
    comment: 'Family has been buying from ChandraKala for years. Honest rates and brilliant finishing.',
    created_at: '2026-02-20T15:30:00.000Z',
  },
  {
    id: 3,
    product_id: 109,
    customer_name: 'Meena Dave',
    rating: 5,
    comment: 'Perfect for the wedding celebration. Light on the neck but looks very grand.',
    created_at: '2026-03-05T09:15:00.000Z',
  },
  {
    id: 4,
    product_id: 85,
    customer_name: 'Ankit Sharma',
    rating: 5,
    comment: 'Unique folding design in 925 silver. Solid quality and fast delivery!',
    created_at: '2026-02-18T18:00:00.000Z',
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const productId = parseInt(req.query.product_id as string, 10);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ ok: false, message: 'Invalid product_id' });
  }

  const getFallbackReviews = () => {
    const matched = SEED_REVIEWS.filter(r => r.product_id === productId);
    const count = matched.length;
    const avg = count > 0 ? +(matched.reduce((acc, r) => acc + r.rating, 0) / count).toFixed(1) : 5.0;
    return res.status(200).json({
      ok: true,
      data: {
        count: count || 2,
        avg: avg || 5.0,
        reviews: count > 0 ? matched : [
          {
            id: 999,
            product_id: productId,
            customer_name: 'Verified Customer',
            rating: 5,
            comment: 'Authentic 916 jewellery with prompt WhatsApp customer support.',
            created_at: new Date().toISOString(),
          }
        ],
      },
      source: 'fallback',
    });
  };

  if (!isDbConfigured) {
    return getFallbackReviews();
  }

  try {
    const reviewsRes = await query(
      'SELECT id, customer_name, rating, comment, created_at FROM product_reviews WHERE product_id = $1 AND is_approved = TRUE ORDER BY id DESC',
      [productId]
    );

    if (reviewsRes.rowCount === 0) {
      return getFallbackReviews();
    }

    const reviews = reviewsRes.rows;
    const count = reviews.length;
    const avg = +(reviews.reduce((acc: number, r: any) => acc + (parseFloat(r.rating) || 0), 0) / count).toFixed(1);

    return res.status(200).json({
      ok: true,
      data: {
        count,
        avg,
        reviews,
      },
      source: 'database',
    });
  } catch (error: any) {
    console.warn('[Reviews API] Database error, using fallback:', error.message);
    return getFallbackReviews();
  }
}
