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

  const { page = '1', limit = '12', category } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category.trim() !== '') {
      conditions.push(`LOWER(COALESCE(category, '')) = LOWER($${paramIndex++})`);
      values.push(category.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const productsRes = await query(
      `SELECT id, name, description, image_filename, category, created_at
       FROM products
       ${whereClause}
       ORDER BY id DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limitNum, offset]
    );

    return res.status(200).json({
      ok: true,
      data: productsRes.rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
      source: 'database',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Catalogue query failed';
    console.error('[Catalogue API]', message);
    return res.status(500).json({ ok: false, message: 'Could not load the design catalogue.' });
  }
}
