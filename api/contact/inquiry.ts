import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../src/utils/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const { name, phone, message } = req.body || {};

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[^0-9+]/g, '') : '';
  const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 1000) : '';

  if (!cleanName || !cleanPhone || !cleanMessage) {
    return res.status(400).json({
      ok: false,
      message: 'Please provide your name, phone number, and inquiry message.',
    });
  }

  const whatsappPhone = '919427080359';
  const waText = `*Inquiry via ChandraKala Jewellers*\n\n` +
    `*Name:* ${cleanName}\n` +
    `*Phone:* ${cleanPhone}\n` +
    `*Message:* ${cleanMessage}\n\n` +
    `_Sent from chandrakalajewellers.in_`;

  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(waText)}`;

  return res.status(200).json({
    ok: true,
    message: 'Inquiry prepared successfully',
    data: {
      name: cleanName,
      phone: cleanPhone,
      whatsappUrl,
    },
  });
}
