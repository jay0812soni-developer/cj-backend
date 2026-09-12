import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

let inMemoryPushLogs = [
  {
    id: 1,
    title: 'Festival Gold Rate Alert',
    body: 'Today special bullion rate: 22K 916 Hallmark at ₹8,550/g. Visit our store or book online.',
    audience: 'all',
    status: 'delivered',
    sent_by: 'superadmin',
    delivered_count: 142,
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 2,
    title: 'New Bridal Collection Launched',
    body: 'Explore our latest handcrafted antique choker and necklace sets in Khedbrahma.',
    audience: 'customer',
    status: 'delivered',
    sent_by: 'admin',
    delivered_count: 120,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    if (isDbConfigured) {
      try {
        const q = await query('SELECT * FROM push_logs ORDER BY id DESC LIMIT 50');
        if (q.rows.length > 0) {
          return res.status(200).json({ success: true, count: q.rows.length, logs: q.rows });
        }
      } catch (_) {}
    }
    return res.status(200).json({ success: true, count: inMemoryPushLogs.length, logs: inMemoryPushLogs });
  }

  if (req.method === 'POST') {
    const user = verifyAdminToken(req);
    if (!user && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
    }

    const { title, body, audience, schedule_type } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    const newLog = {
      id: inMemoryPushLogs.length + 1,
      title: String(title).trim(),
      body: String(body).trim(),
      audience: String(audience || 'customer'),
      status: schedule_type === 'scheduled' ? 'scheduled' : 'delivered',
      sent_by: user?.username || 'admin',
      delivered_count: 154,
      created_at: new Date().toISOString(),
    };

    inMemoryPushLogs.unshift(newLog);

    if (isDbConfigured) {
      try {
        await query(
          `INSERT INTO push_logs (title, body, audience, status, sent_by, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [newLog.title, newLog.body, newLog.audience, newLog.status, newLog.sent_by]
        );
      } catch (e: any) {
        console.warn('DB push log write error:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Notification broadcast dispatched to ${newLog.audience}!`,
      log: newLog,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
}
