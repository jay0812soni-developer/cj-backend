/**
 * Local Development Server for ChandraKala Jewellers Backend
 * Runs on http://localhost:3000 with CORS enabled for Flutter Web
 */
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Import compiled API handlers
const latestRatesHandler = require('./dist/api/rates/latest').default;
const inventoryHandler = require('./dist/api/inventory/index').default;
const catalogueHandler = require('./dist/api/catalogue/index').default;
const reserveHandler = require('./dist/api/orders/reserve').default;
const healthHandler = require('./dist/api/health').default;

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  req.query = parsedUrl.query;

  // Read request body if present
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    if (body) {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = {};
      }
    } else {
      req.body = {};
    }

    // Mock Vercel response helper
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
    res.send = (content) => {
      res.end(content);
      return res;
    };

    try {
      if (pathname === '/api/health' || pathname === '/health' || pathname === '/') {
        return await healthHandler(req, res);
      } else if (pathname === '/api/rates/latest') {
        return await latestRatesHandler(req, res);
      } else if (pathname === '/api/inventory') {
        return await inventoryHandler(req, res);
      } else if (pathname === '/api/catalogue') {
        return await catalogueHandler(req, res);
      } else if (pathname === '/api/orders/reserve') {
        return await reserveHandler(req, res);
      } else {
        res.status(404).json({ ok: false, message: `Route ${pathname} not found` });
      }
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ ok: false, message: 'Internal server error', error: err.message });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[CJ Backend] Local development server running on http://localhost:${PORT}`);
  console.log(`[CJ Backend] Health & Diagnostics:`);
  console.log(` - GET  http://localhost:${PORT}/api/health (or /health or /)`);
  console.log(`[CJ Backend] API Endpoints:`);
  console.log(` - GET  http://localhost:${PORT}/api/rates/latest`);
  console.log(` - GET  http://localhost:${PORT}/api/inventory`);
  console.log(` - GET  http://localhost:${PORT}/api/catalogue`);
  console.log(` - POST http://localhost:${PORT}/api/orders/reserve`);
});
