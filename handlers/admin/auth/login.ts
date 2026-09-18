import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { generateAdminToken } from '../../../src/utils/admin-auth';
import { verifyPassword } from '../../../src/utils/passwords';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.',
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password);

  if (!isDbConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Admin login requires a configured PostgreSQL database.',
    });
  }

  try {
    const dbRes = await query(
      'SELECT id, username, password_hash, role, display_name FROM admin_users WHERE LOWER(username) = $1 LIMIT 1',
      [cleanUsername]
    );

    if (dbRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify username and password.',
      });
    }

    const userRow = dbRes.rows[0];
    const match = await verifyPassword(cleanPassword, String(userRow.password_hash || ''));
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify username and password.',
      });
    }

    const user = {
      id: Number(userRow.id),
      username: String(userRow.username),
      role: String(userRow.role),
      displayName: String(userRow.display_name || userRow.username),
    };
    const token = generateAdminToken(user);

    try {
      await query(
        'INSERT INTO admin_activity_log (user_id, username, role, action, details) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.username, user.role, 'login', `Signed in as ${user.role}`]
      );
    } catch {
      // Activity log is optional if the table is not migrated yet.
    }

    try {
      await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    } catch {
      // Column may be missing on a partial schema.
    }

    return res.status(200).json({
      success: true,
      token,
      user,
      message: `Welcome, ${user.displayName}!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed due to an internal error.';
    return res.status(500).json({
      success: false,
      message,
    });
  }
}
