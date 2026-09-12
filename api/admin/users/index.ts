import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { SEEDED_ADMIN_USERS, verifyAdminToken } from '../../../src/utils/admin-auth';

let inMemoryUsers = SEEDED_ADMIN_USERS.map((u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  displayName: u.displayName,
  last_login_at: new Date().toISOString(),
}));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const user = verifyAdminToken(req);
  if (!user && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
  }

  if (req.method === 'GET') {
    if (isDbConfigured) {
      try {
        const q = await query('SELECT id, username, role, display_name, last_login_at FROM admin_users ORDER BY id ASC');
        if (q.rows.length > 0) {
          return res.status(200).json({ success: true, users: q.rows });
        }
      } catch (_) {}
    }
    return res.status(200).json({ success: true, users: inMemoryUsers });
  }

  if (req.method === 'POST') {
    if (user && user.role !== 'superadmin' && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Only superadmin can manage admin team members.' });
    }

    const { username, role, displayName } = req.body || {};
    if (!username || !role) {
      return res.status(400).json({ success: false, message: 'Username and role are required.' });
    }

    const newUser = {
      id: inMemoryUsers.length + 1,
      username: String(username).trim().toLowerCase(),
      role: role as any,
      displayName: String(displayName || username).trim(),
      last_login_at: new Date().toISOString(),
    };

    inMemoryUsers.push(newUser);
    return res.status(201).json({ success: true, message: 'Team member added.', user: newUser });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed.' });
}
