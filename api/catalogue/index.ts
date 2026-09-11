import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, isDbConfigured } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

const SEED_CATALOGUE = [
  {
    id: 161,
    name: 'Royal Kundan Choker Design',
    description: 'Exquisite handcrafted bridal choker design for custom orders.',
    image_filename: 'jewellery_6a72cfeba28383.08197860.jpg',
    category: 'Choker',
    created_at: new Date().toISOString(),
  },
  {
    id: 162,
    name: 'Antique Temple Jhumka Design',
    description: 'South Indian antique finish temple jhumkas.',
    image_filename: 'jewellery_6a72cfeba37d68.10630799.jpg',
    category: 'Earrings',
    created_at: new Date().toISOString(),
  },
  {
    id: 163,
    name: 'Floral Diamond Dokiya Concept',
    description: 'Lightweight 18K/22K mangalsutra dokiya concept piece.',
    image_filename: 'jewellery_6a72cfeba3c762.10799803.jpg',
    category: 'Pendant',
    created_at: new Date().toISOString(),
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const { page = '1', limit = '12', category } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  const getFallbackData = () => {
    let filtered = SEED_CATALOGUE;
    if (category && typeof category === 'string' && category.trim() !== '') {
      filtered = filtered.filter(item => item.category.toLowerCase().includes(category.toLowerCase()));
    }
    return {
      ok: true,
      data: filtered.slice(offset, offset + limitNum),
      meta: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
      source: 'fallback',
    };
  };

  if (!isDbConfigured) {
    return res.status(200).json(getFallbackData());
  }

  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category.trim() !== '') {
      conditions.push(`LOWER(category) = LOWER($${paramIndex++})`);
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
        totalPages: Math.ceil(total / limitNum),
      },
      source: 'database',
    });
  } catch (error: any) {
    console.warn('[Catalogue API] Database query failed, returning fallback catalogue:', error.message);
    return res.status(200).json(getFallbackData());
  }
}
