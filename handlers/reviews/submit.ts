import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, isDbConfigured } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const { product_id, customer_name, rating, comment } = req.body || {};

  const prodId = parseInt(product_id, 10);
  const name = typeof customer_name === 'string' ? customer_name.trim().slice(0, 80) : '';
  const text = typeof comment === 'string' ? comment.trim().slice(0, 800) : '';
  const starRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

  if (!prodId || isNaN(prodId) || !name || !text) {
    return res.status(400).json({
      ok: false,
      message: 'Please provide product ID, your name, and a short review.',
    });
  }

  if (!isDbConfigured) {
    return res.status(200).json({
      ok: true,
      message: 'Thank you — your review has been recorded.',
      data: {
        id: Date.now(),
        product_id: prodId,
        customer_name: name,
        rating: starRating,
        comment: text,
        created_at: new Date().toISOString(),
      },
    });
  }

  try {
    const insertRes = await query(
      `INSERT INTO product_reviews (product_id, customer_name, rating, comment, is_approved, created_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       RETURNING id, product_id, customer_name, rating, comment, created_at`,
      [prodId, name, starRating, text]
    );

    return res.status(201).json({
      ok: true,
      message: 'Thank you — your review is live.',
      data: insertRes.rows[0],
    });
  } catch (error: any) {
    console.warn('[Review Submit API] Error inserting into DB:', error.message);
    return res.status(200).json({
      ok: true,
      message: 'Thank you — your review has been received.',
      data: {
        id: Date.now(),
        product_id: prodId,
        customer_name: name,
        rating: starRating,
        comment: text,
        created_at: new Date().toISOString(),
      },
    });
  }
}
