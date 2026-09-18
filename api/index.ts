import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../src/utils/cors';

import health from '../handlers/health';
import rates from '../handlers/rates';
import inventory from '../handlers/inventory/index';
import inventoryById from '../handlers/inventory/[id]';
import catalogue from '../handlers/catalogue/index';
import reviews from '../handlers/reviews/index';
import reviewsSubmit from '../handlers/reviews/submit';
import blog from '../handlers/blog/index';
import contactInquiry from '../handlers/contact/inquiry';
import authLogin from '../handlers/auth/login';
import authRegister from '../handlers/auth/register';
import cartItems from '../handlers/cart/items';
import ordersMine from '../handlers/orders/mine';
import ordersReserve from '../handlers/orders/reserve';
import ordersVerify from '../handlers/orders/verify-payment';
import adminAuthLogin from '../handlers/admin/auth/login';
import adminUsers from '../handlers/admin/users/index';
import adminInventory from '../handlers/admin/inventory/index';
import adminInventoryById from '../handlers/admin/inventory/[id]';
import adminOrders from '../handlers/admin/orders/index';
import adminRatesUpdate from '../handlers/admin/rates/update';
import adminAnalytics from '../handlers/admin/analytics/overview';
import adminNotifications from '../handlers/admin/notifications/send';
import adminReviewsModerate from '../handlers/admin/reviews/moderate';
import adminDbSetup from '../handlers/admin/db/setup';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

function queryRoute(req: VercelRequest): string {
  const raw = req.query.route ?? req.query.path;
  if (!raw) return '';
  return Array.isArray(raw) ? raw.join('/') : String(raw);
}

function partsOf(req: VercelRequest): string[] {
  const urlPath = String(req.url || '').split('?')[0];
  const fromUrl = urlPath.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  if (fromUrl.length > 0) return fromUrl;

  const fromQuery = queryRoute(req);
  if (fromQuery) return fromQuery.split('/').filter(Boolean);

  return [];
}

function attachParam(req: VercelRequest, key: string, value: string): void {
  req.query = { ...req.query, [key]: value };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const parts = partsOf(req);
  const route = parts.join('/');
  let match: Handler | null = null;

  if (route === '' || route === 'health') {
    match = health;
  } else if (route === 'rates' || route === 'rates/latest') {
    match = rates;
  } else if (route === 'inventory') {
    match = inventory;
  } else if (parts[0] === 'inventory' && parts[1] && parts.length === 2) {
    attachParam(req, 'id', parts[1]);
    match = inventoryById;
  } else if (route === 'catalogue') {
    match = catalogue;
  } else if (route === 'reviews') {
    match = reviews;
  } else if (route === 'reviews/submit') {
    match = reviewsSubmit;
  } else if (route === 'blog') {
    match = blog;
  } else if (route === 'contact/inquiry') {
    match = contactInquiry;
  } else if (route === 'auth/login') {
    match = authLogin;
  } else if (route === 'auth/register') {
    match = authRegister;
  } else if (route === 'cart/items') {
    match = cartItems;
  } else if (route === 'orders/mine') {
    match = ordersMine;
  } else if (route === 'orders/reserve') {
    match = ordersReserve;
  } else if (route === 'orders/verify-payment') {
    match = ordersVerify;
  } else if (route === 'admin/auth/login') {
    match = adminAuthLogin;
  } else if (route === 'admin/users') {
    match = adminUsers;
  } else if (route === 'admin/inventory') {
    match = adminInventory;
  } else if (parts[0] === 'admin' && parts[1] === 'inventory' && parts[2] && parts.length === 3) {
    attachParam(req, 'id', parts[2]);
    match = adminInventoryById;
  } else if (route === 'admin/orders') {
    match = adminOrders;
  } else if (route === 'admin/rates/update') {
    match = adminRatesUpdate;
  } else if (route === 'admin/analytics/overview') {
    match = adminAnalytics;
  } else if (route === 'admin/notifications/send') {
    match = adminNotifications;
  } else if (route === 'admin/reviews/moderate') {
    match = adminReviewsModerate;
  } else if (route === 'admin/db/setup') {
    match = adminDbSetup;
  }

  if (!match) {
    return res.status(404).json({ ok: false, message: `Route /api/${route} not found` });
  }

  return match(req, res);
}
