import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';
import { getJwtSecret } from '../../src/utils/jwt-config';
import { verifyPassword } from '../../src/utils/passwords';
import { requireDatabase } from '../../src/utils/db-ready';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ ok: false, message: 'Phone and password are required' });
  }

  if (!requireDatabase(res)) return;

  try {
    const cleanPhone = phone.toString().replace(/\D+/g, '').slice(-10);

    const userRes = await query(
      'SELECT id, name, phone, email, password_hash, created_at FROM customers WHERE phone = $1 LIMIT 1',
      [cleanPhone]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ ok: false, message: 'Invalid mobile number or password' });
    }

    const user = userRes.rows[0];
    const passwordMatch = await verifyPassword(String(password), String(user.password_hash));

    if (!passwordMatch) {
      return res.status(401).json({ ok: false, message: 'Invalid mobile number or password' });
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'customer' },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      ok: true,
      token,
      customer: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Error logging in:', error);
    return res.status(500).json({ ok: false, message: 'Login failed', error: error.message });
  }
}
