import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../src/utils/cors';
import { query } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const startTime = Date.now();
  let dbStatus: {
    connected: boolean;
    latencyMs?: number;
    dbTime?: string;
    version?: string;
    error?: string;
  } = { connected: false };

  // Check Database connection if POSTGRES_URL is configured
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    try {
      const dbStart = Date.now();
      const result = await query('SELECT 1 as ping, NOW() as current_time, version() as pg_version');
      const dbLatency = Date.now() - dbStart;
      dbStatus = {
        connected: true,
        latencyMs: dbLatency,
        dbTime: result.rows[0]?.current_time,
        version: result.rows[0]?.pg_version?.split(' ')?.[0] || 'PostgreSQL',
      };
    } catch (err: any) {
      dbStatus = {
        connected: false,
        error: err.message || 'Database connection error',
      };
    }
  } else {
    dbStatus = {
      connected: false,
      error: 'POSTGRES_URL environment variable is not configured in Vercel.',
    };
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.round(process.uptime() * 100) / 100;
  const isHealthy = dbStatus.connected;
  const overallStatus = isHealthy ? 'healthy' : (process.env.POSTGRES_URL ? 'degraded' : 'standby');

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    responseTimeMs: Date.now() - startTime,
    service: 'ChandraKala Jewellers Backend API',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    region: process.env.VERCEL_REGION || 'local',
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMB: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    },
    database: dbStatus,
    config: {
      postgresConfigured: !!(process.env.POSTGRES_URL || process.env.DATABASE_URL),
      jwtConfigured: !!process.env.JWT_SECRET,
      razorpayConfigured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
    endpoints: [
      { path: '/api/rates/latest', method: 'GET', description: 'Live gold and silver bullion rates' },
      { path: '/api/inventory', method: 'GET', description: 'Paginated jewellery inventory' },
      { path: '/api/catalogue', method: 'GET', description: 'Custom jewellery catalogue showcase' },
      { path: '/api/orders/reserve', method: 'POST', description: '24h stock reservation with row locks' },
      { path: '/api/orders/verify-payment', method: 'POST', description: 'Razorpay HMAC verification' },
      { path: '/api/auth/login', method: 'POST', description: 'Customer JWT authentication' },
      { path: '/api/auth/register', method: 'POST', description: 'Customer registration' },
      { path: '/api/health', method: 'GET', description: 'System health check and live monitor' },
    ],
    links: {
      frontendUrl: 'https://chandrakala-jewellers.vercel.app',
      backendUrl: 'https://cj-backend-kappa.vercel.app',
      frontendRepo: 'https://github.com/jay0812soni-developer/chandrakala-jewellers',
      backendRepo: 'https://github.com/jay0812soni-developer/cj-backend',
    },
  };

  // Content Negotiation: If requested from browser (HTML), render rich UI dashboard
  const acceptHeader = req.headers.accept || '';
  const isHtmlRequest = (acceptHeader.includes('text/html') || req.query.format === 'html') && req.query.format !== 'json';

  if (isHtmlRequest) {
    const statusColor = overallStatus === 'healthy' ? '#10B981' : (overallStatus === 'standby' ? '#F59E0B' : '#EF4444');
    const statusLabel = overallStatus === 'healthy' ? 'ALL SYSTEMS OPERATIONAL' : (overallStatus === 'standby' ? 'STANDBY - DB CONFIG NEEDED' : 'DEGRADED PERFORMANCE');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChandraKala Jewellers — API Health & Status</title>
  <link rel="icon" href="https://chandrakala-jewellers.vercel.app/favicon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090A0F;
      --card-bg: rgba(22, 24, 34, 0.75);
      --card-border: rgba(212, 175, 55, 0.18);
      --gold: #D4AF37;
      --gold-light: #F3E5AB;
      --gold-glow: rgba(212, 175, 55, 0.25);
      --text: #F8F9FA;
      --text-muted: #9CA3AF;
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --code-bg: #030407;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #1A1712 0%, var(--bg) 75%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      padding: 2.5rem 1rem;
      line-height: 1.5;
    }
    .container {
      max-width: 1080px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .brand {
      font-family: 'Cinzel', serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 2px;
      margin-bottom: 0.35rem;
      text-shadow: 0 0 20px var(--gold-glow);
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1.25rem;
    }
    .status-banner {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid ${statusColor}44;
      padding: 0.6rem 1.4rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.85rem;
      letter-spacing: 1px;
      color: ${statusColor};
      box-shadow: 0 0 24px ${statusColor}22;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 10px ${statusColor};
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${statusColor}77; }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0,0,0,0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,0,0,0); }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.37);
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      border-color: rgba(212, 175, 55, 0.4);
      transform: translateY(-2px);
    }
    .card-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--gold);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .metric-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .metric-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .pill {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .pill-green { background: rgba(16, 185, 129, 0.15); color: var(--success); }
    .pill-yellow { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
    .pill-red { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 2rem;
      backdrop-filter: blur(12px);
    }
    .table-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      padding: 0.9rem 1.5rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--gold);
      background: rgba(0,0,0,0.25);
    }
    td {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-size: 0.875rem;
    }
    tr:last-child td { border-bottom: none; }
    .method-get { color: #60A5FA; font-weight: 700; font-size: 0.75rem; }
    .method-post { color: #34D399; font-weight: 700; font-size: 0.75rem; }
    .test-btn {
      background: rgba(212, 175, 55, 0.12);
      color: var(--gold-light);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 0.35rem 0.8rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .test-btn:hover {
      background: var(--gold);
      color: #000;
    }
    .quick-links {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }
    .link-pill {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text);
      text-decoration: none;
      padding: 0.6rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .link-pill:hover {
      background: rgba(212, 175, 55, 0.15);
      border-color: var(--gold);
      color: var(--gold-light);
    }
    #test-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(6px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-box {
      background: #12131A;
      border: 1px solid var(--gold);
      border-radius: 12px;
      width: 100%;
      max-width: 640px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0,0,0,0.3);
    }
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.8rem;
      background: #090A0E;
      color: #A7F3D0;
      white-space: pre-wrap;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">CHANDRAKALA JEWELLERS</div>
      <div class="subtitle">Vercel Serverless Backend — System Health & Diagnostics</div>
      <div class="status-banner">
        <span class="pulse-dot"></span>
        <span>${statusLabel}</span>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">
          <span>PostgreSQL Database</span>
          <span class="pill ${dbStatus.connected ? 'pill-green' : (healthData.config.postgresConfigured ? 'pill-yellow' : 'pill-red')}">
            ${dbStatus.connected ? 'CONNECTED' : (healthData.config.postgresConfigured ? 'ERROR' : 'UNCONFIGURED')}
          </span>
        </div>
        <div class="metric-value">
          ${dbStatus.connected ? `${dbStatus.latencyMs} <span style="font-size:1rem;color:var(--text-muted)">ms</span>` : 'Offline'}
        </div>
        <div class="metric-desc">
          ${dbStatus.connected ? `Engine: ${dbStatus.version} • ACID Row Locks active` : (dbStatus.error || 'Add POSTGRES_URL to Vercel env')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Serverless Runtime</span>
          <span class="pill pill-green">ONLINE</span>
        </div>
        <div class="metric-value">
          ${healthData.system.nodeVersion}
        </div>
        <div class="metric-desc">
          Region: <strong>${healthData.region}</strong> • Memory: <strong>${healthData.system.memoryUsageMB.rss} MB</strong>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>Environment Config</span>
          <span class="pill ${healthData.config.jwtConfigured ? 'pill-green' : 'pill-yellow'}">
            ${healthData.config.jwtConfigured ? 'AUTHENTICATED' : 'PARTIAL'}
          </span>
        </div>
        <div class="metric-value" style="font-size:1.15rem; gap:0.4rem; padding-top:0.4rem;">
          <span>DB: ${healthData.config.postgresConfigured ? '✅' : '❌'}</span>
          <span>JWT: ${healthData.config.jwtConfigured ? '✅' : '❌'}</span>
          <span>RPAY: ${healthData.config.razorpayConfigured ? '✅' : '❌'}</span>
        </div>
        <div class="metric-desc" style="margin-top:0.35rem">
          Uptime: <strong>${healthData.uptimeSeconds}s</strong> • Response: <strong>${healthData.responseTimeMs}ms</strong>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">
        <div>
          <h3 style="font-size:1rem; font-weight:600">Active API Endpoints</h3>
          <p style="font-size:0.8rem; color:var(--text-muted)">Real-time serverless routes available for frontend consumption</p>
        </div>
        <a href="/api/health?format=json" target="_blank" class="test-btn">View Raw JSON</a>
      </div>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Description</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${healthData.endpoints.map(ep => `
            <tr>
              <td><span class="${ep.method === 'GET' ? 'method-get' : 'method-post'}">${ep.method}</span></td>
              <td><code>${ep.path}</code></td>
              <td style="color:var(--text-muted)">${ep.description}</td>
              <td>
                ${ep.method === 'GET' ? `<button class="test-btn" onclick="testEndpoint('${ep.path}')">Test Ping</button>` : `<span style="font-size:0.75rem; color:var(--text-muted)">POST Action</span>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="quick-links">
      <a href="https://chandrakala-jewellers.vercel.app" target="_blank" class="link-pill">
        <span>💎</span> Open Frontend (chandrakala-jewellers.vercel.app)
      </a>
      <a href="https://github.com/jay0812soni-developer/chandrakala-jewellers" target="_blank" class="link-pill">
        <span>🐙</span> Frontend GitHub
      </a>
      <a href="https://github.com/jay0812soni-developer/cj-backend" target="_blank" class="link-pill">
        <span>⚡</span> Backend GitHub
      </a>
    </div>
  </div>

  <div id="test-modal">
    <div class="modal-box">
      <div class="modal-header">
        <span id="modal-title" style="font-weight:600; font-size:0.9rem">Endpoint Response</span>
        <button class="close-btn" onclick="closeModal()">✕</button>
      </div>
      <div id="modal-content" class="modal-body">Loading...</div>
    </div>
  </div>

  <script>
    async function testEndpoint(path) {
      const modal = document.getElementById('test-modal');
      const title = document.getElementById('modal-title');
      const content = document.getElementById('modal-content');
      modal.style.display = 'flex';
      title.innerText = 'GET ' + path;
      content.innerText = 'Sending request...';

      const t0 = performance.now();
      try {
        const res = await fetch(path);
        const t1 = performance.now();
        const latency = Math.round(t1 - t0);
        const data = await res.json();
        title.innerText = 'GET ' + path + ' (' + res.status + ' ' + res.statusText + ' - ' + latency + 'ms)';
        content.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        content.innerText = 'Request error: ' + err.message;
      }
    }

    function closeModal() {
      document.getElementById('test-modal').style.display = 'none';
    }

    window.onclick = function(event) {
      const modal = document.getElementById('test-modal');
      if (event.target === modal) closeModal();
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(overallStatus === 'healthy' ? 200 : (overallStatus === 'standby' ? 200 : 503)).send(html);
  }

  // Otherwise return JSON
  return res.status(overallStatus === 'healthy' ? 200 : (overallStatus === 'standby' ? 200 : 503)).json(healthData);
}
