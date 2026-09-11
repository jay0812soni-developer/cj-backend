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

  const { id } = req.query;
  const productId = parseInt(id as string, 10);
  if (!productId || isNaN(productId)) {
    return res.status(400).json({ ok: false, message: 'Invalid product ID' });
  }

  const findFallback = () => {
    const item = SEED_ITEMS.find(p => p.id === productId);
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }
    return res.status(200).json({
      ok: true,
      data: {
        ...item,
        extra_images: [],
        reviews: [],
      },
      source: 'fallback',
    });
  };

  if (!isDbConfigured) {
    return findFallback();
  }

  try {
    const itemRes = await query('SELECT * FROM jewellery_items WHERE id = $1 LIMIT 1', [productId]);

    if (itemRes.rowCount === 0) {
      return findFallback();
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
      source: 'database',
    });
  } catch (error: any) {
    console.warn(`[Inventory Item API] Database error for product ${productId}, returning fallback:`, error.message);
    return findFallback();
  }
}
