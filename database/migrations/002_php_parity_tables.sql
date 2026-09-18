-- PHP parity tables missing from the first PostgreSQL schema.
-- Safe to run on an empty or existing CJ Postgres database (IF NOT EXISTS).
-- Do not run against MySQL production.

CREATE TABLE IF NOT EXISTS admin_remember_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    selector VARCHAR(32) NOT NULL UNIQUE,
    validator_hash VARCHAR(64) NOT NULL,
    user_agent VARCHAR(500) NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_remember_expires ON admin_remember_tokens(expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time ON admin_login_attempts(ip, attempted_at);

CREATE TABLE IF NOT EXISTS internal_messages (
    id SERIAL PRIMARY KEY,
    from_role VARCHAR(32) NOT NULL CHECK (from_role IN ('admin', 'superadmin', 'system')),
    to_role VARCHAR(32) NOT NULL CHECK (to_role IN ('admin', 'superadmin', 'customer', 'all')),
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cron_meta (
    meta_key VARCHAR(80) PRIMARY KEY,
    meta_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) NOT NULL,
    product_id INT NOT NULL DEFAULT 0,
    amount NUMERIC(10, 2) NOT NULL,
    user_name VARCHAR(255),
    user_mobile VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'Success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh VARCHAR(255) NOT NULL DEFAULT '',
    auth VARCHAR(255) NOT NULL DEFAULT '',
    audience VARCHAR(40) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_templates (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    audience VARCHAR(40) NOT NULL DEFAULT 'customer',
    url_path VARCHAR(160) NOT NULL DEFAULT 'index1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS push_queue (
    id SERIAL PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    audience VARCHAR(40) NOT NULL DEFAULT 'customer',
    url_path VARCHAR(160) NOT NULL DEFAULT 'index1',
    created_by VARCHAR(80) NOT NULL DEFAULT '',
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_logs (
    id SERIAL PRIMARY KEY,
    queue_id INT REFERENCES push_queue(id) ON DELETE SET NULL,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    audience VARCHAR(40) NOT NULL,
    success_count INT NOT NULL DEFAULT 0,
    fail_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitor_sessions (
    id SERIAL PRIMARY KEY,
    session_key VARCHAR(64) NOT NULL UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INT NOT NULL DEFAULT 0,
    page_count INT NOT NULL DEFAULT 0,
    landing_page VARCHAR(500) NOT NULL DEFAULT '',
    geo_label VARCHAR(160) NOT NULL DEFAULT '',
    geo_status VARCHAR(40) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS visitor_pageviews (
    id SERIAL PRIMARY KEY,
    session_key VARCHAR(64) NOT NULL,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seconds_on_page INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_visitor_pageviews_session ON visitor_pageviews(session_key);

DO $$
BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
        CHECK (payment_method IN ('whatsapp', 'razorpay', 'cod', 'cash'));
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;
