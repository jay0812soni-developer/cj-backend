import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

let inMemoryRates = {
  gold_rate: 8550.0,
  silver_rate: 98.5,
  silver_925_rate: 110.0,
  copper_rate: 0.85,
  making_charges_percent: 14.0,
  apply_making_to_silver: false,
  updated_at: new Date().toISOString(),
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    // Return current rates
    if (isDbConfigured) {
      try {
        const q = await query('SELECT * FROM rates ORDER BY updated_at DESC LIMIT 1');
        if (q.rows.length > 0) {
          return res.status(200).json({ success: true, rates: q.rows[0] });
        }
      } catch (_) {}
    }
    return res.status(200).json({ success: true, rates: inMemoryRates });
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST or PUT.' });
  }

  const user = verifyAdminToken(req);
  // Allow authenticated admin/superadmin or local dev bypass
  if (!user && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, message: 'Unauthorized. Valid admin token required.' });
  }

  const {
    gold_rate,
    silver_rate,
    silver_925_rate,
    copper_rate,
    making_charges_percent,
    apply_making_to_silver,
  } = req.body || {};

  const updated = {
    gold_rate: Number(gold_rate ?? inMemoryRates.gold_rate),
    silver_rate: Number(silver_rate ?? inMemoryRates.silver_rate),
    silver_925_rate: Number(silver_925_rate ?? inMemoryRates.silver_925_rate),
    copper_rate: Number(copper_rate ?? inMemoryRates.copper_rate),
    making_charges_percent: Number(making_charges_percent ?? inMemoryRates.making_charges_percent),
    apply_making_to_silver: Boolean(apply_making_to_silver),
    updated_at: new Date().toISOString(),
  };

  inMemoryRates = updated;

  if (isDbConfigured) {
    try {
      await query(
        `INSERT INTO rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, apply_making_to_silver, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          updated.gold_rate,
          updated.silver_rate,
          updated.silver_925_rate,
          updated.copper_rate,
          updated.making_charges_percent,
          updated.apply_making_to_silver,
        ]
      );

      // Log activity
      try {
        const adminName = user?.username || 'admin';
        await query(
          'INSERT INTO activity_log (action, details, created_at) VALUES ($1, $2, NOW())',
          ['update_rates', `Rates updated by ${adminName}: Gold ₹${updated.gold_rate}/g, Silver ₹${updated.silver_rate}/g`]
        );
      } catch (_) {}
    } catch (e: any) {
      console.warn('DB rate write error:', e.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Rates updated successfully across the entire store!',
    rates: updated,
  });
}
