import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, isDbConfigured } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

const SEED_ITEMS = [
  {
    id: 110,
    name: 'Pendent Butti Set',
    image: 'item_6a72eda95a8789.42699417.jpg',
    description: 'New design made to order in 22K hallmark gold',
    purity: '22K 916',
    stone: 'Cubic Zirconia',
    category: 'Necklace Sets',
    sku: 'CJ-G-110',
    dimensions: 'Medium',
    weight: 11.640,
    cached_price: 224977.92,
    metal_type: 'gold',
    manual_price: 0,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 109,
    name: 'Gold Set with Earrings',
    image: 'item_6a72ed6a62cde2.58667970.jpg',
    description: 'Traditional royal bridal set in 916 yellow gold',
    purity: '22K 916',
    stone: 'Kundan',
    category: 'Bridal Sets',
    sku: 'CJ-G-109',
    dimensions: 'Large',
    weight: 22.210,
    cached_price: 349390.17,
    metal_type: 'gold',
    manual_price: 0,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 108,
    name: 'Chain with Pearl',
    image: 'item_6a72ecafaab347.25954770.jpg',
    description: '916 gold chain adorned with freshwater cultured pearls',
    purity: '22K 916',
    stone: 'Pearl',
    category: 'Chains',
    sku: 'CJ-G-108',
    dimensions: '18 inches',
    weight: 7.000,
    cached_price: 135296.00,
    metal_type: 'gold',
    manual_price: 0,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 85,
    name: '925 Silver Folding Ring',
    image: 'item_68c250db9ca9d1.78704969.jpg',
    description: 'Sterling silver 925 folding ring with dual wear style',
    purity: '925 Silver',
    stone: 'CZ',
    category: 'Rings',
    sku: 'CJ-S-085',
    dimensions: 'Adjustable',
    weight: 5.400,
    cached_price: 3920.40,
    metal_type: 'silver_925',
    manual_price: 0,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 64,
    name: 'Silver Fancy Kada',
    image: 'IMG_1395.jpeg',
    description: 'Pure silver solid gents kada with intricate carving',
    purity: '99.9% Silver',
    stone: 'None',
    category: 'Kada',
    sku: 'CJ-S-064',
    dimensions: 'Size 2.8',
    weight: 31.800,
    cached_price: 9811.89,
    metal_type: 'silver',
    manual_price: 0,
    is_favourite: false,
    is_sold_out: false,
    use_manual_rates: false,
    created_at: new Date().toISOString(),
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

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

  // Filter seed items for fallback
  const getFallbackData = () => {
    let filtered = SEED_ITEMS.filter(item => !item.is_sold_out);
    if (metal_type && metal_type !== 'all') {
      filtered = filtered.filter(item => item.metal_type === metal_type);
    }
    if (category && typeof category === 'string' && category.trim() !== '') {
      filtered = filtered.filter(item => item.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (q && typeof q === 'string' && q.trim() !== '') {
      const term = q.toLowerCase();
      filtered = filtered.filter(item => item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term));
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
    const conditions: string[] = ['is_sold_out = FALSE'];
    const values: any[] = [];
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
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR tags ILIKE $${paramIndex})`);
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
        totalPages: Math.ceil(total / limitNum),
      },
      source: 'database',
    });
  } catch (error: any) {
    console.warn('[Inventory API] Database query failed, returning fallback items:', error.message);
    return res.status(200).json(getFallbackData());
  }
}
