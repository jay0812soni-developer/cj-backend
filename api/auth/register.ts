import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../src/db';

const JWT_SECRET = process.env.JWT_SECRET || 'cj-jewellers-super-secret-key-2026';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const { name, phone, password, email = '' } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ ok: false, message: 'Name, mobile number, and password are required' });
  }

  const cleanPhone = phone.toString().replace(/\D+/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ ok: false, message: 'Please enter a valid 10-digit mobile number' });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await query(
      'SELECT id FROM customers WHERE phone = $1 LIMIT 1',
      [cleanPhone]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ ok: false, message: 'An account with this mobile number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertRes = await query(
      `INSERT INTO customers (name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, email, created_at`,
      [name.trim(), cleanPhone, email.trim(), passwordHash]
    );

    const user = insertRes.rows[0];

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      ok: true,
      message: 'Account created successfully',
      token,
      customer: user,
    });
  } catch (error: any) {
    console.error('Error registering customer:', error);
    return res.status(500).json({ ok: false, message: 'Registration failed', error: error.message });
  }
}
