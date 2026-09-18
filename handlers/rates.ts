import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../src/db';
import { handleCors } from '../src/utils/cors';
import { requireDatabase } from '../src/utils/db-ready';

const defaultFormula = {
  gold: [
    { op: '*', value: 0.9166 },
    { op: '/', value: 1.03 },
  ],
  silver: [] as { op: string; value: number }[],
  silver_925: [] as { op: string; value: number }[],
  copper: [] as { op: string; value: number }[],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  if (!requireDatabase(res)) return;

  try {
    const rateRes = await query('SELECT * FROM rates ORDER BY updated_at DESC LIMIT 1');
    const manualRateRes = await query('SELECT * FROM manual_rates ORDER BY updated_at DESC LIMIT 1');
    const settingsRes = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'rate_formula_json' LIMIT 1"
    );

    if (!rateRes.rows[0]) {
      return res.status(503).json({
        ok: false,
        message: 'No metal rates in the database yet. Import the MySQL dump before using the Vercel shop.',
      });
    }

    const standard = rateRes.rows[0];
    const manual = manualRateRes.rows[0] || standard;
    let formula = defaultFormula;

    if (settingsRes.rows[0]?.setting_value) {
      try {
        formula = JSON.parse(settingsRes.rows[0].setting_value);
      } catch {
        // keep PHP default formula
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        standard,
        manual,
        formula,
      },
      source: 'database',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Rates query failed';
    console.error('[Rates API]', message);
    return res.status(500).json({ ok: false, message: 'Could not load metal rates.' });
  }
}
