import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { query } from '../../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const {
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ ok: false, message: 'Payment gateway not configured' });
  }

  try {
    // Verify HMAC-SHA256 signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ ok: false, message: 'Invalid payment signature' });
    }

    // Mark order as paid and confirmed
    await query(
      `UPDATE orders 
       SET payment_status = 'paid', status = 'confirmed', razorpay_order_id = $1, 
           razorpay_payment_id = $2, razorpay_signature = $3, paid_at = NOW(), confirmed_at = NOW()
       WHERE id = $4`,
      [razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id]
    );

    // Mark reserved items as sold out
    await query(
      `UPDATE jewellery_items 
       SET is_sold_out = TRUE, reserved_order_id = NULL, reserved_until = NULL 
       WHERE reserved_order_id = $1`,
      [order_id]
    );

    return res.status(200).json({
      ok: true,
      message: 'Payment verified and order confirmed successfully',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ ok: false, message: 'Payment verification failed', error: error.message });
  }
}
