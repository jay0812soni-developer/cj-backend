import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

let inMemoryInventory: any[] = [
  {
    id: 110,
    name: 'Pendent Butti Set',
    image: 'item_6a72eda95a8789.42699417.jpg',
    images: ['item_6a72eda95a8789.42699417.jpg'],
    description: 'New design made to order in 22K hallmark gold',
    purity: '22K 916',
    stone: 'Cubic Zirconia',
    category: 'Necklace Sets',
    sku: 'CJ-G-110',
    dimensions: 'Medium',
    weight: 11.640,
    cached_price: 224977.92,
    metal_type: 'gold',
    manual_price: null,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    tags: 'gold,necklace,bridal,hallmark,22k',
    created_at: new Date().toISOString(),
  },
  {
    id: 109,
    name: 'Gold Set with Earrings',
    image: 'item_6a72ed6a62cde2.58667970.jpg',
    images: ['item_6a72ed6a62cde2.58667970.jpg'],
    description: 'Traditional royal bridal set in 916 yellow gold',
    purity: '22K 916',
    stone: 'Kundan',
    category: 'Bridal Sets',
    sku: 'CJ-G-109',
    dimensions: 'Large',
    weight: 22.210,
    cached_price: 349390.17,
    metal_type: 'gold',
    manual_price: null,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    tags: 'bridal,kundan,necklace,earrings',
    created_at: new Date().toISOString(),
  },
  {
    id: 108,
    name: 'Chain with Pearl',
    image: 'item_6a72ecafaab347.25954770.jpg',
    images: ['item_6a72ecafaab347.25954770.jpg'],
    description: '916 gold chain adorned with freshwater cultured pearls',
    purity: '22K 916',
    stone: 'Pearl',
    category: 'Chains',
    sku: 'CJ-G-108',
    dimensions: '18 inches',
    weight: 7.000,
    cached_price: 135296.00,
    metal_type: 'gold',
    manual_price: null,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    tags: 'pearl,dailywear,chain,lightweight',
    created_at: new Date().toISOString(),
  },
  {
    id: 85,
    name: '925 Silver Folding Ring',
    image: 'item_68c250db9ca9d1.78704969.jpg',
    images: ['item_68c250db9ca9d1.78704969.jpg'],
    description: 'Sterling silver 925 folding ring with dual wear style',
    purity: '925 Silver',
    stone: 'CZ',
    category: 'Rings',
    sku: 'CJ-S-085',
    dimensions: 'Adjustable',
    weight: 5.400,
    cached_price: 3920.40,
    metal_type: 'silver_925',
    manual_price: null,
    is_favourite: true,
    is_sold_out: false,
    use_manual_rates: false,
    tags: 'silver,ring,sterling,folding',
    created_at: new Date().toISOString(),
  },
  {
    id: 64,
    name: 'Silver Fancy Kada',
    image: 'IMG_1395.jpeg',
    images: ['IMG_1395.jpeg'],
    description: 'Pure silver solid gents kada with intricate carving',
    purity: '99.9% Silver',
    stone: 'None',
    category: 'Kada',
    sku: 'CJ-S-064',
    dimensions: 'Size 2.8',
    weight: 31.800,
    cached_price: 9811.89,
    metal_type: 'silver',
    manual_price: null,
    is_favourite: false,
    is_sold_out: false,
    use_manual_rates: false,
    tags: 'silver,kada,gents,traditional',
    created_at: new Date().toISOString(),
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    if (isDbConfigured) {
      try {
        const q = await query('SELECT * FROM jewellery_items ORDER BY id DESC');
        if (q.rows.length > 0) {
          return res.status(200).json({ success: true, count: q.rows.length, items: q.rows });
        }
      } catch (_) {}
    }
    return res.status(200).json({ success: true, count: inMemoryInventory.length, items: inMemoryInventory });
  }

  if (req.method === 'POST') {
    const user = verifyAdminToken(req);
    if (!user && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
    }

    const {
      name,
      description,
      weight,
      metal_type,
      image,
      images,
      manual_price,
      is_favourite,
      is_sold_out,
      use_manual_rates,
      purity,
      stone,
      category,
      sku,
      dimensions,
      tags,
    } = req.body || {};

    if (!name || weight == null || !metal_type) {
      return res.status(400).json({ success: false, message: 'Name, weight, and metal type are required.' });
    }

    const newId = Math.floor(Math.random() * 9000) + 1000;
    const newItem = {
      id: newId,
      name: String(name).trim(),
      description: String(description || '').trim(),
      weight: Number(weight),
      metal_type: String(metal_type).toLowerCase(),
      image: String(image || 'item_default.jpg'),
      images: Array.isArray(images) && images.length > 0 ? images : [String(image || 'item_default.jpg')],
      manual_price: manual_price != null && manual_price !== '' ? Number(manual_price) : null,
      cached_price: Number(manual_price) || (Number(weight) * 8550 * 1.14),
      is_favourite: Boolean(is_favourite),
      is_sold_out: Boolean(is_sold_out),
      use_manual_rates: Boolean(use_manual_rates),
      purity: String(purity || '22K 916'),
      stone: String(stone || 'None'),
      category: String(category || 'Jewellery'),
      sku: String(sku || `CJ-${newId}`),
      dimensions: String(dimensions || 'Standard'),
      tags: String(tags || ''),
      created_at: new Date().toISOString(),
    };

    inMemoryInventory.unshift(newItem);

    if (isDbConfigured) {
      try {
        await query(
          `INSERT INTO jewellery_items (name, description, weight, metal_type, image, manual_price, is_favourite, is_sold_out, use_manual_rates, purity, stone, category, sku, dimensions, tags, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
          [
            newItem.name,
            newItem.description,
            newItem.weight,
            newItem.metal_type,
            newItem.image,
            newItem.manual_price,
            newItem.is_favourite,
            newItem.is_sold_out,
            newItem.use_manual_rates,
            newItem.purity,
            newItem.stone,
            newItem.category,
            newItem.sku,
            newItem.dimensions,
            newItem.tags,
          ]
        );
      } catch (dbErr: any) {
        console.warn('DB inventory insert error:', dbErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Jewellery piece added to inventory successfully!',
      item: newItem,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed. Use GET or POST.' });
}
