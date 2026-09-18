import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { runDatabaseMigration } from '../../../src/db/migrate';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (!isDbConfigured) {
    return res.status(200).json({
      success: false,
      configured: false,
      status: 'standby',
      message: 'POSTGRES_URL is not configured yet in Vercel environment variables.',
      instructions: [
        '1. Go to your Vercel Dashboard for cj-backend.',
        '2. Navigate to Storage -> Create Database -> Postgres (Neon / Vercel Postgres).',
        '3. Or add POSTGRES_URL in Project Settings -> Environment Variables.',
        '4. Once added, redeploy or re-hit this endpoint to auto-seed all tables.',
      ],
    });
  }

  if (req.method === 'POST') {
    const result = await runDatabaseMigration();
    return res.status(result.success ? 200 : 500).json(result);
  }

  // GET: Check existing tables and status
  try {
    const ping = await query('SELECT 1 as ok, NOW() as server_time, version() as pg_version');
    const tableListRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tableListRes.rows.map((r: any) => r.table_name);

    // If tables are empty, automatically run migration
    if (tables.length === 0) {
      const autoMigrate = await runDatabaseMigration();
      return res.status(200).json({
        configured: true,
        autoMigrated: true,
        ...autoMigrate,
        serverTime: ping.rows[0]?.server_time,
        version: ping.rows[0]?.pg_version,
      });
    }

    return res.status(200).json({
      success: true,
      configured: true,
      status: 'operational',
      tableCount: tables.length,
      tables,
      serverTime: ping.rows[0]?.server_time,
      version: ping.rows[0]?.pg_version,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      configured: true,
      status: 'connection_error',
      message: 'Failed to connect to PostgreSQL: ' + err.message,
    });
  }
}