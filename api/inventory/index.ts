import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';
import { requireDatabase } from '../../src/utils/db-ready';

function emptyMeta(pageNum: number, limitNum: number) {
  return { page: pageNum, limit: limitNum, total: 0, totalPages: 0 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  if (!requireDatabase(res)) return;

  const {
    metal_type = 'all',
    category,
    sort = 'newest',
    q = '',
    min_price,
    max_price,
    page = '1',
    limit = '12',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = ['is_sold_out = FALSE'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (metal_type && metal_type !== 'all') {
      conditions.push(`metal_type = $${paramIndex++}`);
      values.push(metal_type);
    }

    if (category && typeof category === 'string' && category.trim() !== '') {
      conditions.push(`LOWER(category) = LOWER($${paramIndex++})`);
      values.push(category.trim());
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      conditions.push(
        `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR COALESCE(tags, '') ILIKE $${paramIndex})`
      );
      values.push(`%${q.trim()}%`);
      paramIndex++;
    }

    if (min_price && !isNaN(Number(min_price))) {
      conditions.push(`cached_price >= $${paramIndex++}`);
      values.push(Number(min_price));
    }
    if (max_price && !isNaN(Number(max_price))) {
      conditions.push(`cached_price <= $${paramIndex++}`);
      values.push(Number(max_price));
    }

    let orderBy = 'created_at DESC, id DESC';
    if (sort === 'price_asc') {
      orderBy = 'cached_price ASC, id ASC';
    } else if (sort === 'price_desc') {
      orderBy = 'cached_price DESC, id DESC';
    } else if (sort === 'name_asc') {
      orderBy = 'name ASC';
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(*) as total FROM jewellery_items ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const itemsRes = await query(
      `SELECT id, name, image, description, purity, stone, category, sku, dimensions,
              weight, cached_price, metal_type, manual_price, is_favourite, is_sold_out,
              use_manual_rates, created_at
       FROM jewellery_items
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limitNum, offset]
    );

    return res.status(200).json({
      ok: true,
      data: itemsRes.rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
      source: 'database',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Inventory query failed';
    console.error('[Inventory API]', message);
    return res.status(500).json({
      ok: false,
      message: 'Could not load jewellery.',
      data: [],
      meta: emptyMeta(pageNum, limitNum),
    });
  }
}
