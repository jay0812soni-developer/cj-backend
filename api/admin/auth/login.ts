import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { SEEDED_ADMIN_USERS, generateAdminToken } from '../../../src/utils/admin-auth';

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
  const cleanPassword = String(password).trim();

  try {
    // 1. Try DB first if available
    if (isDbConfigured) {
      try {
        const dbRes = await query(
          'SELECT id, username, password_hash, role, display_name FROM admin_users WHERE LOWER(username) = $1 LIMIT 1',
          [cleanUsername]
        );

        if (dbRes.rows.length > 0) {
          const userRow = dbRes.rows[0];
          const match = await bcrypt.compare(cleanPassword, userRow.password_hash);
          if (match) {
            const user = {
              id: Number(userRow.id),
              username: userRow.username,
              role: userRow.role,
              displayName: userRow.display_name || userRow.username,
            };
            const token = generateAdminToken(user);

            // Log activity
            try {
              await query(
                'INSERT INTO activity_log (action, details, created_at) VALUES ($1, $2, NOW())',
                ['admin_login', `User ${user.username} (${user.role}) logged in`]
              );
            } catch (_) {}

            return res.status(200).json({
              success: true,
              token,
              user,
              message: `Welcome, ${user.displayName}!`,
            });
          }
        }
      } catch (dbErr) {
        console.warn('DB admin check failed, checking seeded fallback:', dbErr);
      }
    }

    // 2. Seeded fallback matching PHP credentials
    const seeded = SEEDED_ADMIN_USERS.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );

    if (seeded && seeded.passwordPlain === cleanPassword) {
      const user = {
        id: seeded.id,
        username: seeded.username,
        role: seeded.role,
        displayName: seeded.displayName,
      };
      const token = generateAdminToken(user);

      return res.status(200).json({
        success: true,
        token,
        user,
        message: `Welcome, ${user.displayName}!`,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please verify username and password.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to an internal error.',
      error: error.message,
    });
  }
}
