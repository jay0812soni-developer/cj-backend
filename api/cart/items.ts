import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, isDbConfigured } from '../../src/db';
import { handleCors } from '../../src/utils/cors';
import { calculatePrice, RateData, DEFAULT_FORMULA } from '../../src/utils/pricing';

const SEED_ITEMS = [
  {
    id: 110,
    name: 'Pendent Butti Set',
    image: 'item_6a72eda95a8789.42699417.jpg',
    metal_type: 'gold',
    weight: 11.64,
    is_sold_out: 0,
    use_manual_rates: false,
  },
  {
    id: 109,
    name: 'Gold Set with Earrings',
    image: 'item_6a72ed6a62cde2.58667970.jpg',
    metal_type: 'gold',
    weight: 22.21,
    is_sold_out: 0,
    use_manual_rates: false,
  },
  {
    id: 108,
    name: 'Chain with Pearl',
    image: 'item_6a72ecafaab347.25954770.jpg',
    metal_type: 'gold',
    weight: 7.0,
    is_sold_out: 0,
    use_manual_rates: false,
  },
  {
    id: 85,
    name: '925 Silver Folding Ring',
    image: 'item_68c250db9ca9d1.78704969.jpg',
    metal_type: 'silver_925',
    weight: 5.4,
    is_sold_out: 0,
    use_manual_rates: false,
  },
  {
    id: 64,
    name: 'Silver Fancy Kada',
    image: 'IMG_1395.jpeg',
    metal_type: 'silver',
    weight: 31.8,
    is_sold_out: 0,
    use_manual_rates: false,
  },
];

const DEFAULT_STANDARD_RATES: RateData = {
  gold_rate: 15100.0,
  silver_rate: 237.0,
  silver_925_rate: 650.0,
  copper_rate: 950.0,
  making_charges_percent: 28.0,
  apply_making_to_silver: true,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const idsParam = req.query.ids as string | undefined;
  if (!idsParam) {
    return res.status(200).json([]);
  }

  const idList = idsParam
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);

  if (idList.length === 0) {
    return res.status(200).json([]);
  }

  const formatItem = (item: any, finalPrice: number) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    thumb: item.image.startsWith('http')
      ? item.image
      : `https://chandrakalajewellers.in/img?src=${encodeURIComponent(item.image)}&w=160`,
    metal_type: item.metal_type,
    weight: parseFloat(item.weight),
    final_price: Math.round(finalPrice),
    is_sold_out: item.is_sold_out ? 1 : 0,
  });

  if (!isDbConfigured) {
    const matched = SEED_ITEMS.filter(item => idList.includes(item.id)).map(item => {
      const price = calculatePrice(item.metal_type, item.weight, DEFAULT_STANDARD_RATES);
      return formatItem(item, price);
    });
    return res.status(200).json(matched);
  }

  try {
    const ratesRes = await query('SELECT * FROM rates ORDER BY updated_at DESC LIMIT 1');
    const standardRates: RateData = ratesRes.rows[0] || DEFAULT_STANDARD_RATES;

    const placeholders = idList.map((_, idx) => `$${idx + 1}`).join(',');
    const itemsRes = await query(`SELECT * FROM jewellery_items WHERE id IN (${placeholders})`, idList);

    const items = itemsRes.rows.map(row => {
      const price = calculatePrice(row.metal_type, parseFloat(row.weight), standardRates);
      return formatItem(row, price);
    });

    return res.status(200).json(items);
  } catch (error: any) {
    console.warn('[Cart Items API] Fallback due to DB error:', error.message);
    const matched = SEED_ITEMS.filter(item => idList.includes(item.id)).map(item => {
      const price = calculatePrice(item.metal_type, item.weight, DEFAULT_STANDARD_RATES);
      return formatItem(item, price);
    });
    return res.status(200).json(matched);
  }
}
