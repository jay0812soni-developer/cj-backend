import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../src/db';
import { handleCors } from '../../src/utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const rateRes = await query(
      'SELECT * FROM rates ORDER BY updated_at DESC LIMIT 1'
    );
    const manualRateRes = await query(
      'SELECT * FROM manual_rates ORDER BY updated_at DESC LIMIT 1'
    );
    const settingsRes = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'rate_formula_json' LIMIT 1"
    );

    const standard = rateRes.rows[0] || {
      gold_rate: 15100.0,
      silver_rate: 237.0,
      silver_925_rate: 650.0,
      copper_rate: 950.0,
      making_charges_percent: 28.0,
      apply_making_to_silver: true,
      updated_at: new Date().toISOString(),
    };

    const manual = manualRateRes.rows[0] || {
      gold_rate: 15100.0,
      silver_rate: 237.0,
      silver_925_rate: 650.0,
      copper_rate: 950.0,
      making_charges_percent: 28.0,
      manual_making_charges_percent: 21.0,
      manual_apply_making_to_silver: true,
      updated_at: new Date().toISOString(),
    };

    let formula = {
      gold: [
        { op: '*', value: 0.9166 },
        { op: '/', value: 1.03 },
      ],
      silver: [],
      silver_925: [],
      copper: [],
    };

    if (settingsRes.rows[0]?.setting_value) {
      try {
        formula = JSON.parse(settingsRes.rows[0].setting_value);
      } catch (e) {
        // Fallback to default
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        standard,
        manual,
        formula,
      },
    });
  } catch (error: any) {
    console.error('Error fetching rates:', error);
    return res.status(500).json({ ok: false, message: 'Failed to fetch rates', error: error.message });
  }
}
