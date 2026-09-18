import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getClient } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const {
    item_ids,
    customer_name,
    customer_phone,
    customer_address = '',
    customer_pincode = '',
    customer_email = '',
    payment_method = 'whatsapp',
  } = req.body;

  if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
    return res.status(400).json({ ok: false, message: 'No items specified in order' });
  }

  if (!customer_name || !customer_phone) {
    return res.status(400).json({ ok: false, message: 'Customer name and phone are required' });
  }

  const client = await getClient();

  try {
    // Start ACID transaction
    await client.query('BEGIN');

    // Clean expired reservations first
    await client.query(
      `UPDATE jewellery_items 
       SET reserved_order_id = NULL, reserved_until = NULL 
       WHERE reserved_until IS NOT NULL AND reserved_until < NOW()`
    );

    // Row-level lock the requested items
    const placeholders = item_ids.map((_, i) => `$${i + 1}`).join(',');
    const itemsRes = await client.query(
      `SELECT id, name, metal_type, weight, cached_price, is_sold_out, reserved_order_id, reserved_until
       FROM jewellery_items
       WHERE id IN (${placeholders})
       FOR UPDATE`,
      item_ids
    );

    const items = itemsRes.rows;

    if (items.length !== item_ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'One or more items do not exist' });
    }

    // Check if any item is already sold or actively reserved
    for (const item of items) {
      if (item.is_sold_out) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          ok: false,
          message: `Item "${item.name}" is already sold out.`,
          conflicting_item_id: item.id,
        });
      }

      if (item.reserved_until && new Date(item.reserved_until) > new Date()) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          ok: false,
          message: `Item "${item.name}" is currently reserved by another customer.`,
          conflicting_item_id: item.id,
        });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.cached_price || '0'), 0);
    const gstRate = 3.0; // 3% GST on jewellery
    const gstAmount = Math.round((subtotal * (gstRate / 100)) * 100) / 100;
    const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `CJ-${dateStr}-${randStr}`;

    // 24-hour reservation window
    const reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert Order
    const orderRes = await client.query(
      `INSERT INTO orders (
        order_no, customer_name, customer_phone, customer_address, customer_pincode,
        customer_email, status, source, subtotal, gst_rate, gst_amount, grand_total,
        payment_status, payment_method, reserved_until
      ) VALUES ($1, $2, $3, $4, $5, $6, 'reserved', 'flutter_app', $7, $8, $9, $10, 'unpaid', $11, $12)
      RETURNING id, order_no, subtotal, gst_amount, grand_total, reserved_until`,
      [
        orderNo,
        customer_name.trim(),
        customer_phone.trim(),
        customer_address.trim(),
        customer_pincode.trim(),
        customer_email.trim(),
        subtotal,
        gstRate,
        gstAmount,
        grandTotal,
        payment_method,
        reservedUntil,
      ]
    );

    const createdOrder = orderRes.rows[0];

    // Insert Order Items and update inventory locks
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, metal_type, weight, unit_price, qty)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [createdOrder.id, item.id, item.name, item.metal_type, item.weight, item.cached_price]
      );

      await client.query(
        `UPDATE jewellery_items 
         SET reserved_order_id = $1, reserved_until = $2 
         WHERE id = $3`,
        [createdOrder.id, reservedUntil, item.id]
      );
    }

    // Commit Transaction
    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'Order placed and item reserved for 24 hours',
      data: {
        order_id: createdOrder.id,
        order_no: createdOrder.order_no,
        subtotal,
        gst_amount: gstAmount,
        grand_total: grandTotal,
        reserved_until: reservedUntil.toISOString(),
        items_count: items.length,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reserving order:', error);
    return res.status(500).json({ ok: false, message: 'Failed to reserve order', error: error.message });
  } finally {
    client.release();
  }
}
