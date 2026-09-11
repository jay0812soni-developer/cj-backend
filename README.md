# ✨ ChandraKala Jewellers - Serverless Backend API

High-performance, secure, serverless TypeScript backend for **ChandraKala Jewellers**, designed for seamless deployment on **Vercel** and powered by **PostgreSQL** (Neon / Vercel Postgres).

---

## 🌟 Architecture & Highlights

- **Serverless Micro-APIs**: Fast, isolated edge/serverless functions running under Vercel Node.js 20 runtime.
- **ACID Row-Level Locking**: Atomic 24-hour stock lock reservation (`SELECT ... FOR UPDATE`) in `orders/reserve.ts` ensuring zero overselling or double-booking during peak customer traffic.
- **Dynamic Live Bullion Calculation**: Metal rate aggregator supporting standard & custom manual operator adjustments for 24K, 22K 916 Hallmark Gold, and 999 Silver.
- **Bank-Grade Payment Security**: Razorpay HMAC-SHA256 signature verification and tamper prevention.
- **Customer Authentication**: Secure password hashing with `bcryptjs` and stateless JWT tokens.
- **Local Dev Server**: Built-in HTTP dev runner (`npm run dev`) mirroring Vercel function routing for rapid local testing.

---

## 🏗️ Project Structure

```
backend/
├── .github/workflows/ci.yml   # GitHub Actions CI (Node 20 + TypeScript compile/lint)
├── api/                       # Vercel Serverless Function Endpoints
│   ├── auth/
│   │   ├── login.ts           # Customer JWT authentication
│   │   └── register.ts        # Customer signup with bcrypt hashing
│   ├── catalogue/
│   │   └── index.ts           # Custom order and design showcase
│   ├── inventory/
│   │   ├── [id].ts            # Single product detail with dynamic pricing
│   │   └── index.ts           # Paginated inventory search and category filter
│   ├── orders/
│   │   ├── reserve.ts         # 24h stock reservation with row-level locks
│   │   └── verify-payment.ts  # Razorpay webhook and payment verification
│   └── rates/
│       └── latest.ts          # Live gold and silver bullion rates
├── database/
│   ├── schema.sql             # Complete PostgreSQL DDL (tables, indexes, triggers)
│   └── seed.sql               # Seed data for rates, categories, and jewellery pieces
├── src/
│   ├── db/
│   │   └── index.ts           # PostgreSQL connection pooler (pg)
│   └── utils/
│       └── cors.ts            # Standardized preflight & cross-origin handler
├── dev-server.js              # Standalone local development HTTP server
├── package.json               # Scripts & dependencies
├── tsconfig.json              # TypeScript strict configuration
└── vercel.json                # Vercel deployment routes and headers config
```

---

## 🌐 Production URLs

- **Backend API & Health Interface**: [https://cj-backend-kappa.vercel.app](https://cj-backend-kappa.vercel.app)
- **Frontend Luxury App**: [https://chandrakala-jewellers.vercel.app](https://chandrakala-jewellers.vercel.app)

---

## 📡 API Endpoints

### 0. Health & Live Status Monitor
- `GET /` or `GET /health` or `GET /api/health`
  - **In Browser**: Renders a luxury dark obsidian & gold interactive Health Dashboard with database latency, system metrics, and live endpoint test ping runners.
  - **In API / JSON (`?format=json`)**: Returns structured JSON with service status, PostgreSQL ping time, and environment configurations.

### 1. Rates
- `GET /api/rates/latest`
  - Returns current 24K, 22K, and Silver rates along with operator adjustments and last updated timestamp.

### 2. Inventory & Catalogue
- `GET /api/inventory?category=necklaces&page=1&limit=20`
  - Returns paginated list of jewellery items with weights, purity, making charges, and stock status.
- `GET /api/inventory/:id`
  - Returns detailed product specification for a single item.
- `GET /api/catalogue`
  - Returns bespoke design showcase items.

### 3. Orders & Stock Locking
- `POST /api/orders/reserve`
  - Body: `{ "productId": "uuid", "customerId": "uuid" }`
  - Locks the stock for 24 hours using PostgreSQL row-level locks (`FOR UPDATE`).
- `POST /api/orders/verify-payment`
  - Body: `{ "orderId": "...", "razorpayPaymentId": "...", "razorpaySignature": "..." }`
  - Verifies cryptographic signature and confirms final purchase.

### 4. Authentication
- `POST /api/auth/register`
  - Body: `{ "fullName": "...", "phone": "...", "email": "...", "password": "..." }`
- `POST /api/auth/login`
  - Body: `{ "phone": "...", "password": "..." }`
  - Returns signed JWT token and customer profile.

---

## 🗄️ Database Setup (PostgreSQL)

You can use [Neon Serverless Postgres](https://neon.tech) (recommended free tier) or Vercel Postgres.

1. Create a database instance on Neon or Vercel.
2. In your database SQL editor, execute:
   - `database/schema.sql` (creates enum types, tables, row-level locks, and updated-at triggers)
   - `database/seed.sql` (populates default gold/silver rates, categories, and initial jewellery stock)

---

## ⚙️ Environment Variables

Create a `.env` file for local development or configure these in your **Vercel Project Settings**:

```env
# PostgreSQL Connection URL (Neon / Vercel Postgres / Supabase)
POSTGRES_URL=postgresql://user:password@ep-sample-123.us-east-2.aws.neon.tech/neondb?sslmode=require

# JWT Secret Key
JWT_SECRET=super_secret_jwt_key_here_change_in_production

# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_samplekeyid123
RAZORPAY_KEY_SECRET=sample_razorpay_secret_key_456

# Port for local dev server
PORT=3000
```

---

## 🚀 Development & Deployment

### Local Development
```bash
# Install dependencies
npm install

# Check TypeScript compilation
npm run lint

# Start local server on port 3000
npm run dev
```

### Deploying to Vercel
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy directly to Vercel
vercel

# Deploy to Production
vercel --prod
```

---

## 📱 Frontend Repository
The Flutter frontend client communicating with this API is hosted at:
- **Repository**: [jay0812soni-developer/chandrakala-jewellers](https://github.com/jay0812soni-developer/chandrakala-jewellers)

---

## 📄 License
All rights reserved © ChandraKala Jewellers.
