import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
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

    const conditions: string[] = ['is_sold_out = FALSE'];
    const values: any[] = [];
    let paramIndex = 1;

    // Filter by metal type
    if (metal_type && metal_type !== 'all') {
      conditions.push(`metal_type = $${paramIndex++}`);
      values.push(metal_type);
    }

    // Filter by category
    if (category && typeof category === 'string' && category.trim() !== '') {
      conditions.push(`LOWER(category) = LOWER($${paramIndex++})`);
      values.push(category.trim());
    }

    // Search query
    if (q && typeof q === 'string' && q.trim() !== '') {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags ILIKE $${paramIndex})`);
      values.push(`%${q.trim()}%`);
      paramIndex++;
    }

    // Price range filters
    if (min_price && !isNaN(Number(min_price))) {
      conditions.push(`cached_price >= $${paramIndex++}`);
      values.push(Number(min_price));
    }
    if (max_price && !isNaN(Number(max_price))) {
      conditions.push(`cached_price <= $${paramIndex++}`);
      values.push(Number(max_price));
    }

    // Sort order
    let orderBy = 'created_at DESC, id DESC';
    if (sort === 'price_asc') {
      orderBy = 'cached_price ASC, id ASC';
    } else if (sort === 'price_desc') {
      orderBy = 'cached_price DESC, id DESC';
    } else if (sort === 'name_asc') {
      orderBy = 'name ASC';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching items
    const countRes = await query(
      `SELECT COUNT(*) as total FROM jewellery_items ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Fetch paginated results
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
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ ok: false, message: 'Failed to fetch items', error: error.message });
  }
}
