import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/utils/cors';
import { query, isDbConfigured } from '../../../src/db';
import { verifyAdminToken } from '../../../src/utils/admin-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const user = verifyAdminToken(req);
  if (!user && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin credentials required.' });
  }

  const itemId = Number(req.query.id);
  if (!itemId) {
    return res.status(400).json({ success: false, message: 'Item ID is required.' });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const {
      name,
      description,
      weight,
      metal_type,
      image,
      manual_price,
      is_favourite,
      is_sold_out,
      use_manual_rates,
      purity,
      stone,
      category,
      sku,
      dimensions,
      tags,
    } = req.body || {};

    if (isDbConfigured) {
      try {
        await query(
          `UPDATE jewellery_items SET
             name = COALESCE($1, name),
             description = COALESCE($2, description),
             weight = COALESCE($3, weight),
             metal_type = COALESCE($4, metal_type),
             image = COALESCE($5, image),
             manual_price = $6,
             is_favourite = COALESCE($7, is_favourite),
             is_sold_out = COALESCE($8, is_sold_out),
             use_manual_rates = COALESCE($9, use_manual_rates),
             purity = COALESCE($10, purity),
             stone = COALESCE($11, stone),
             category = COALESCE($12, category),
             sku = COALESCE($13, sku),
             dimensions = COALESCE($14, dimensions),
             tags = COALESCE($15, tags)
           WHERE id = $16`,
          [
            name,
            description,
            weight != null ? Number(weight) : null,
            metal_type,
            image,
            manual_price != null ? Number(manual_price) : null,
            is_favourite != null ? Boolean(is_favourite) : null,
            is_sold_out != null ? Boolean(is_sold_out) : null,
            use_manual_rates != null ? Boolean(use_manual_rates) : null,
            purity,
            stone,
            category,
            sku,
            dimensions,
            tags,
            itemId,
          ]
        );
      } catch (e: any) {
        console.warn('DB update error:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Jewellery piece #${itemId} updated successfully.`,
      updatedId: itemId,
    });
  }

  if (req.method === 'DELETE') {
    if (isDbConfigured) {
      try {
        await query('DELETE FROM jewellery_items WHERE id = $1', [itemId]);
      } catch (e: any) {
        console.warn('DB delete error:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Jewellery piece #${itemId} removed from inventory.`,
      deletedId: itemId,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed. Use PUT or DELETE.' });
}
