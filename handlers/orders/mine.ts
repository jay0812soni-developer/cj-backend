import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';
import { requireDatabase } from '../../src/utils/db-ready';
import { verifyCustomerToken } from '../../src/utils/customer-auth';

function digitsPhone(phone: string): string {
  const n = phone.replace(/\D+/g, '');
  if (n.length === 12 && n.startsWith('91')) return n.slice(2);
  if (n.length === 11 && n.startsWith('0')) return n.slice(1);
  return n.slice(-10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  if (!requireDatabase(res)) return;

  const customer = verifyCustomerToken(req);
  if (!customer) {
    return res.status(401).json({ ok: false, message: 'Sign in to view order history.' });
  }

  const phone = digitsPhone(customer.phone);

  try {
    const ordersRes = await query(
      `SELECT * FROM orders
       WHERE customer_id = $1
          OR customer_phone = $2
          OR customer_phone = $3
       ORDER BY id DESC
       LIMIT 40`,
      [customer.id, phone, phone ? `91${phone}` : '']
    );

    const orders = ordersRes.rows;
    if (orders.length === 0) {
      return res.status(200).json({ ok: true, data: [] });
    }

    const ids = orders.map((o) => Number(o.id));
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const itemsRes = await query(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
      ids
    );

    const itemsBy: Record<number, typeof itemsRes.rows> = {};
    for (const item of itemsRes.rows) {
      const oid = Number(item.order_id);
      if (!itemsBy[oid]) itemsBy[oid] = [];
      itemsBy[oid].push(item);
    }

    const data = orders.map((order) => ({
      order,
      items: itemsBy[Number(order.id)] || [],
    }));

    return res.status(200).json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Orders query failed';
    console.error('[Orders mine API]', message);
    return res.status(500).json({ ok: false, message: 'Could not load order history.' });
  }
}
