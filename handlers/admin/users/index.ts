import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const user = verifyAdminToken(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'GET') {
    if (!isDbConfigured) {
      return res.status(503).json({ success: false, message: 'Database is not configured.' });
    }
    try {
      const q = await query(
        'SELECT id, username, role, display_name, last_login_at FROM admin_users ORDER BY id ASC'
      );
      return res.status(200).json({ success: true, users: q.rows });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load users.';
      return res.status(500).json({ success: false, message });
    }
  }

  if (req.method === 'POST') {
    if (user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only superadmin can manage admin team members.' });
    }
    return res.status(501).json({
      success: false,
      message: 'Creating staff accounts via API is not enabled yet. Use the PHP Super Admin panel or insert into admin_users.',
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
}
