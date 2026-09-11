-- ==============================================================================
-- ChandraKala Jewellers (CJ) — PostgreSQL Production Schema (Vercel Postgres / Neon)
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Daily Live Rates Table
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    gold_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    silver_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    silver_925_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    copper_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    making_charges_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    apply_making_to_silver BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Manual Override Rates Table
CREATE TABLE IF NOT EXISTS manual_rates (
    id SERIAL PRIMARY KEY,
    gold_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    silver_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    silver_925_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    copper_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    making_charges_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    manual_making_charges_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    manual_apply_making_to_silver BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customers Table (Mobile-first auth)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admin Users (Staff & Family Access)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    display_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- 5. Orders Table (With 24h stock reservation)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL DEFAULT '',
    customer_pincode VARCHAR(10) NOT NULL DEFAULT '',
    customer_email VARCHAR(160) NOT NULL DEFAULT '',
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'expired', 'refunded')),
    source VARCHAR(32) NOT NULL DEFAULT 'checkout',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(24) NOT NULL DEFAULT 'whatsapp' CHECK (payment_method IN ('whatsapp', 'razorpay', 'cod')),
    razorpay_order_id VARCHAR(80),
    razorpay_payment_id VARCHAR(80),
    razorpay_signature VARCHAR(160),
    reserved_until TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_id VARCHAR(80),
    refund_reason VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. In-Stock Jewellery Items
CREATE TABLE IF NOT EXISTS jewellery_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    purity VARCHAR(32) NOT NULL DEFAULT '',
    stone VARCHAR(80) NOT NULL DEFAULT '',
    category VARCHAR(80) NOT NULL DEFAULT '',
    sku VARCHAR(64) NOT NULL DEFAULT '',
    dimensions VARCHAR(80) NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    cached_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    metal_type VARCHAR(32) NOT NULL DEFAULT 'gold' CHECK (metal_type IN ('gold', 'silver', 'silver_925', 'copper')),
    manual_price NUMERIC(12, 2),
    is_favourite BOOLEAN NOT NULL DEFAULT FALSE,
    is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
    reserved_order_id INT REFERENCES orders(id) ON DELETE SET NULL,
    reserved_until TIMESTAMPTZ,
    use_manual_rates BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Extra Gallery Images for Jewellery Items
CREATE TABLE IF NOT EXISTS jewellery_item_images (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES jewellery_items(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Order Line Items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES jewellery_items(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    metal_type VARCHAR(32) NOT NULL DEFAULT '',
    weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    qty INT NOT NULL DEFAULT 1
);

-- 9. Custom Design Photo Catalogue (Showcase for WhatsApp inquiries)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_filename VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'custom',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Product Reviews
CREATE TABLE IF NOT EXISTS product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES jewellery_items(id) ON DELETE CASCADE,
    customer_name VARCHAR(80) NOT NULL,
    rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(800) NOT NULL DEFAULT '',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Abandoned Carts Tracker
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id SERIAL PRIMARY KEY,
    session_key VARCHAR(64) NOT NULL UNIQUE,
    product_ids VARCHAR(500) NOT NULL DEFAULT '',
    item_count INT NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Admin Activity Logs
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
    username VARCHAR(80) NOT NULL DEFAULT 'unknown',
    role VARCHAR(40) NOT NULL DEFAULT 'admin',
    action VARCHAR(120) NOT NULL,
    details TEXT,
    ip VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Site Settings (Key-Value)
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for 0-lag and high query performance
CREATE INDEX IF NOT EXISTS idx_jewellery_metal_price ON jewellery_items(metal_type, cached_price);
CREATE INDEX IF NOT EXISTS idx_jewellery_sold_out ON jewellery_items(is_sold_out);
CREATE INDEX IF NOT EXISTS idx_jewellery_reserved_until ON jewellery_items(reserved_until);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_reserved_until ON orders(reserved_until);
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON product_reviews(product_id, is_approved);
