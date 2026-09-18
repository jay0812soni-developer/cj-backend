import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';
import { requireDatabase } from '../../src/utils/db-ready';
import { calculatePrice, RateData } from '../../src/utils/pricing';

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
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  if (idList.length === 0) {
    return res.status(200).json([]);
  }

  if (!requireDatabase(res)) return;

  const formatItem = (item: Record<string, unknown>, finalPrice: number) => {
    const image = String(item.image || '');
    return {
      id: item.id,
      name: item.name,
      image,
      thumb: image.startsWith('http')
        ? image
        : `https://chandrakalajewellers.in/img.php?f=${encodeURIContent(image)}&w=160`,
      metal_type: item.metal_type,
      weight: parseFloat(String(item.weight)),
      final_price: Math.round(finalPrice),
      is_sold_out: item.is_sold_out ? 1 : 0,
    };
  };

  try {
    const ratesRes = await query('SELECT * FROM rates ORDER BY updated_at DESC LIMIT 1');
    const standardRates = (ratesRes.rows[0] || null) as RateData | null;
    if (!standardRates) {
      return res.status(503).json({ ok: false, message: 'Metal rates are not available yet.', items: [] });
    }

    const placeholders = idList.map((_, idx) => `$${idx + 1}`).join(',');
    const itemsRes = await query(
      `SELECT * FROM jewellery_items WHERE id IN (${placeholders})`,
      idList
    );

    const items = itemsRes.rows.map((row) => {
      const price = calculatePrice(String(row.metal_type), parseFloat(String(row.weight)), standardRates);
      return formatItem(row, price);
    });

    return res.status(200).json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cart query failed';
    console.error('[Cart Items API]', message);
    return res.status(500).json({ ok: false, message: 'Could not load cart items.' });
  }
}

function encodeURIContent(value: string): string {
  return encodeURIComponent(value);
}
