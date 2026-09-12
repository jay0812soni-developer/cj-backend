import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

let inMemoryOrders = [
  {
    id: 1001,
    order_number: 'ORD-202609-1001',
    customer_name: 'Pooja Patel',
    customer_phone: '+91 98765 43210',
    total_amount: 224977.92,
    status: 'reserved',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() + 82800000).toISOString(),
    items: [
      {
        id: 1,
        order_id: 1001,
        item_id: 110,
        item_name: 'Pendent Butti Set',
        quantity: 1,
        weight: 11.64,
        metal_type: 'gold',
        price_at_order: 224977.92,
      },
    ],
  },
  {
    id: 1002,
    order_number: 'ORD-202609-1002',
    customer_name: 'Rajesh Soni',
    customer_phone: '+91 94270 80359',
    total_amount: 3920.40,
    status: 'confirmed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    expires_at: null,
    items: [
      {
        id: 2,
        order_id: 1002,
        item_id: 85,
        item_name: '925 Silver Folding Ring',
        quantity: 1,
        weight: 5.40,
        metal_type: 'silver_925',
        price_at_order: 3920.40,
      },
    ],
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    const filter = String(req.query.status || 'all').toLowerCase();

    if (isDbConfigured) {
      try {
        let sql = 'SELECT * FROM orders';
        const params: any[] = [];
        if (filter !== 'all') {
          sql += ' WHERE status = $1';
          params.push(filter);
        }
        sql += ' ORDER BY id DESC LIMIT 100';

        const q = await query(sql, params);
        const orders = q.rows;

        // Fetch order items if orders exist
        if (orders.length > 0) {
          const ids = orders.map((o) => o.id);
          const itemsRes = await query(
            `SELECT * FROM order_items WHERE order_id = ANY($1::int[])`,
            [ids]
          );
          const itemsByOrder: Record<number, any[]> = {};
          itemsRes.rows.forEach((it) => {
            if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
            itemsByOrder[it.order_id].push(it);
          });
          orders.forEach((o) => {
            o.items = itemsByOrder[o.id] || [];
          });
        }

        const countsRes = await query(
          'SELECT status, COUNT(*)::int as count FROM orders GROUP BY status'
        );
        const counts: Record<string, number> = {
          reserved: 0,
          confirmed: 0,
          cancelled: 0,
          expired: 0,
          refunded: 0,
        };
        countsRes.rows.forEach((c) => {
          counts[c.status] = c.count;
        });

        return res.status(200).json({ success: true, count: orders.length, orders, statusCounts: counts });
      } catch (_) {}
    }

    const filtered = filter === 'all'
      ? inMemoryOrders
      : inMemoryOrders.filter((o) => o.status === filter);

    const counts: Record<string, number> = {
      reserved: inMemoryOrders.filter((o) => o.status === 'reserved').length,
      confirmed: inMemoryOrders.filter((o) => o.status === 'confirmed').length,
      cancelled: inMemoryOrders.filter((o) => o.status === 'cancelled').length,
      expired: 0,
      refunded: 0,
    };

    return res.status(200).json({
      success: true,
      count: filtered.length,
      orders: filtered,
      statusCounts: counts,
    });
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    const user = verifyAdminToken(req);
    if (!user && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
    }

    const { order_id, action, reason } = req.body || {};
    const orderIdNum = Number(order_id);

    if (!orderIdNum || !action) {
      return res.status(400).json({ success: false, message: 'order_id and action are required.' });
    }

    let targetStatus = 'confirmed';
    if (action === 'cancel') targetStatus = 'cancelled';
    if (action === 'refund') targetStatus = 'refunded';
    if (action === 'confirm') targetStatus = 'confirmed';

    if (isDbConfigured) {
      try {
        await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [
          targetStatus,
          orderIdNum,
        ]);
        try {
          const adminName = user?.username || 'admin';
          await query(
            'INSERT INTO activity_log (action, details, created_at) VALUES ($1, $2, NOW())',
            [`order_${action}`, `Order #${orderIdNum} set to ${targetStatus} by ${adminName}`]
          );
        } catch (_) {}
      } catch (e: any) {
        console.warn('DB order update error:', e.message);
      }
    }

    const orderIdx = inMemoryOrders.findIndex((o) => o.id === orderIdNum);
    if (orderIdx >= 0) {
      inMemoryOrders[orderIdx].status = targetStatus;
    }

    return res.status(200).json({
      success: true,
      message: `Order #${orderIdNum} has been marked as ${targetStatus}.`,
      order_id: orderIdNum,
      status: targetStatus,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
}
