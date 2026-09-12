import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

let inMemoryReviews = [
  {
    id: 1,
    product_id: 110,
    product_name: 'Pendent Butti Set',
    author: 'Sunil Verma',
    rating: 5,
    content: 'Exceptional craftsmanship and accurate 22K 916 purity certificate. Highly recommended!',
    is_approved: true,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 2,
    product_id: 109,
    product_name: 'Gold Set with Earrings',
    author: 'Meena Sharma',
    rating: 5,
    content: 'Bought this for my daughter wedding. The finish and shine is unmatched in Khedbrahma!',
    is_approved: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    product_id: 85,
    product_name: '925 Silver Folding Ring',
    author: 'Kunal Joshi',
    rating: 4,
    content: 'Solid sterling silver feel, adjustable fit is super convenient.',
    is_approved: false, // Pending moderation
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    if (isDbConfigured) {
      try {
        const q = await query('SELECT * FROM product_reviews ORDER BY id DESC LIMIT 100');
        if (q.rows.length > 0) {
          return res.status(200).json({ success: true, count: q.rows.length, reviews: q.rows });
        }
      } catch (_) {}
    }
    return res.status(200).json({ success: true, count: inMemoryReviews.length, reviews: inMemoryReviews });
  }

  if (req.method === 'POST') {
    const user = verifyAdminToken(req);
    if (!user && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
    }

    const { review_id, action } = req.body || {};
    const rId = Number(review_id);

    if (!rId || !action) {
      return res.status(400).json({ success: false, message: 'review_id and action (approve|delete) are required.' });
    }

    if (action === 'approve') {
      if (isDbConfigured) {
        try {
          await query('UPDATE product_reviews SET is_approved = TRUE WHERE id = $1', [rId]);
        } catch (_) {}
      }
      const item = inMemoryReviews.find((r) => r.id === rId);
      if (item) item.is_approved = true;

      return res.status(200).json({ success: true, message: `Review #${rId} approved and visible on shop.` });
    }

    if (action === 'delete') {
      if (isDbConfigured) {
        try {
          await query('DELETE FROM product_reviews WHERE id = $1', [rId]);
        } catch (_) {}
      }
      inMemoryReviews = inMemoryReviews.filter((r) => r.id !== rId);

      return res.status(200).json({ success: true, message: `Review #${rId} removed.` });
    }

    return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or delete.' });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
}
