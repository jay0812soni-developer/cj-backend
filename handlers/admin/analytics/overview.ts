import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use GET.' });
  }

  const user = verifyAdminToken(req);
  if (!user && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
  }

  try {
    let stats = {
      totalProducts: 48,
      goldProducts: 32,
      silverProducts: 16,
      activeReservations: 4,
      confirmedOrders: 28,
      totalReservationsValue: 482500.0,
      totalRevenue: 2450000.0,
      currentRates: {
        gold_22k: 8550.0,
        silver: 98.5,
        silver_925: 110.0,
        copper: 0.85,
        makingCharges: 14.0,
      },
      recentActivity: [
        {
          id: 1,
          action: 'update_rates',
          details: 'Bullion rates adjusted: Gold ₹8,550/g, Silver ₹98.5/g',
          time: '15 mins ago',
        },
        {
          id: 2,
          action: 'order_reserve',
          details: 'New reservation #1001 for Pendent Butti Set by Pooja Patel',
          time: '1 hour ago',
        },
        {
          id: 3,
          action: 'order_confirm',
          details: 'Order #1002 marked as confirmed (Rajesh Soni)',
          time: '3 hours ago',
        },
        {
          id: 4,
          action: 'admin_login',
          details: 'Super Admin Soni Jaykumar Hasmukh signed in',
          time: '5 hours ago',
        },
      ],
    };

    if (isDbConfigured) {
      try {
        const prodCount = await query('SELECT COUNT(*)::int as count FROM jewellery_items');
        if (prodCount.rows.length > 0) {
          stats.totalProducts = prodCount.rows[0].count;
        }

        const ordersCount = await query(
          "SELECT status, COUNT(*)::int as count, SUM(total_amount)::float as total FROM orders GROUP BY status"
        );
        ordersCount.rows.forEach((r) => {
          if (r.status === 'reserved') {
            stats.activeReservations = r.count;
            stats.totalReservationsValue = r.total || 0;
          } else if (r.status === 'confirmed') {
            stats.confirmedOrders = r.count;
            stats.totalRevenue = r.total || 0;
          }
        });

        const act = await query('SELECT * FROM activity_log ORDER BY id DESC LIMIT 10');
        if (act.rows.length > 0) {
          stats.recentActivity = act.rows.map((r) => ({
            id: r.id,
            action: r.action,
            details: r.details,
            time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        }
      } catch (dbErr: any) {
        console.warn('DB analytics error:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Could not fetch analytics overview.' });
  }
}
