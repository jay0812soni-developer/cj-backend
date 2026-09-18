import { query, isDbConfigured } from './index';
import bcrypt from 'bcryptjs';

export async function runDatabaseMigration(): Promise<{ success: boolean; message: string; tables: string[]; error?: string }> {
  if (!isDbConfigured) {
    return {
      success: false,
      message: 'POSTGRES_URL environment variable is not configured. Please add it in Vercel project settings.',
      tables: [],
    };
  }

  try {
    // 1. Create Tables
    await query(`
      CREATE TABLE IF NOT EXISTS rates (
        id SERIAL PRIMARY KEY,
        gold_rate NUMERIC(12, 2) NOT NULL DEFAULT 8550.00,
        silver_rate NUMERIC(12, 2) NOT NULL DEFAULT 98.50,
        silver_925_rate NUMERIC(12, 2) NOT NULL DEFAULT 110.00,
        copper_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.85,
        making_charges_percent NUMERIC(6, 2) NOT NULL DEFAULT 14.00,
        apply_making_to_silver BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS manual_rates (
        id SERIAL PRIMARY KEY,
        gold_rate NUMERIC(12, 2) NOT NULL DEFAULT 8550.00,
        silver_rate NUMERIC(12, 2) NOT NULL DEFAULT 98.50,
        silver_925_rate NUMERIC(12, 2) NOT NULL DEFAULT 110.00,
        copper_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.85,
        making_charges_percent NUMERIC(6, 2) NOT NULL DEFAULT 14.00,
        manual_making_charges_percent NUMERIC(6, 2) NOT NULL DEFAULT 14.00,
        manual_apply_making_to_silver BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(160) NOT NULL DEFAULT '',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(80) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'admin',
        display_name VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_no VARCHAR(32) NOT NULL UNIQUE,
        customer_name VARCHAR(120) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_address TEXT NOT NULL DEFAULT '',
        customer_pincode VARCHAR(10) NOT NULL DEFAULT '',
        customer_email VARCHAR(160) NOT NULL DEFAULT '',
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'reserved',
        source VARCHAR(32) NOT NULL DEFAULT 'checkout',
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        gst_rate NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
        gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(24) NOT NULL DEFAULT 'unpaid',
        payment_method VARCHAR(24) NOT NULL DEFAULT 'whatsapp',
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

      CREATE TABLE IF NOT EXISTS jewellery_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        purity VARCHAR(32) NOT NULL DEFAULT '22K 916',
        stone VARCHAR(80) NOT NULL DEFAULT 'None',
        category VARCHAR(80) NOT NULL DEFAULT 'Jewellery',
        sku VARCHAR(64) NOT NULL DEFAULT '',
        dimensions VARCHAR(80) NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
        cached_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        metal_type VARCHAR(32) NOT NULL DEFAULT 'gold',
        manual_price NUMERIC(12, 2),
        is_favourite BOOLEAN NOT NULL DEFAULT FALSE,
        is_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
        reserved_order_id INT REFERENCES orders(id) ON DELETE SET NULL,
        reserved_until TIMESTAMPTZ,
        use_manual_rates BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS jewellery_item_images (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES jewellery_items(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        sort_order SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image_filename VARCHAR(255) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'custom',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES jewellery_items(id) ON DELETE CASCADE,
        customer_name VARCHAR(80) NOT NULL,
        rating SMALLINT NOT NULL DEFAULT 5,
        comment VARCHAR(800) NOT NULL DEFAULT '',
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id BIGSERIAL PRIMARY KEY,
        action VARCHAR(120) NOT NULL,
        details TEXT,
        ip VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS push_logs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        audience VARCHAR(32) NOT NULL DEFAULT 'all',
        status VARCHAR(32) NOT NULL DEFAULT 'delivered',
        sent_by VARCHAR(80) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed Rates if not present
    const rateCheck = await query('SELECT COUNT(*)::int as c FROM rates');
    if (rateCheck.rows[0].c === 0) {
      await query(`
        INSERT INTO rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, apply_making_to_silver)
        VALUES (8550.00, 98.50, 110.00, 0.85, 14.00, FALSE);

        INSERT INTO manual_rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, manual_making_charges_percent, manual_apply_making_to_silver)
        VALUES (8550.00, 98.50, 110.00, 0.85, 14.00, 14.00, FALSE);
      `);
    }

    // 3. Seed Site Settings
    await query(`
      INSERT INTO site_settings (setting_key, setting_value) VALUES
      ('shop_name', 'ChandraKala Jewellers'),
      ('whatsapp_number', '919427080359'),
      ('shop_phone_display', '+91 9427080359'),
      ('shop_email', 'chandrakalajewellers849@gmail.com'),
      ('shop_address', 'Civil Road, Khedbrahma, Sabarkantha, Gujarat - 383255'),
      ('gst_percent', '3'),
      ('rate_formula_json', '{"gold":[{"op":"*","value":0.9166},{"op":"/","value":1.03}],"silver":[],"silver_925":[],"copper":[]}')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    // 4. Optional first admin from env — never hardcode staff passwords.
    // Production staff must be imported from MySQL (PHP bcrypt hashes). See docs/DATABASE_MIGRATION.md.
    const bootstrapUser = (process.env.ADMIN_BOOTSTRAP_USERNAME || '').trim().toLowerCase();
    const bootstrapPass = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
    const bootstrapRole = (process.env.ADMIN_BOOTSTRAP_ROLE || 'superadmin').trim();
    if (bootstrapUser && bootstrapPass.length >= 6) {
      const existingAdmins = await query('SELECT COUNT(*)::int AS c FROM admin_users');
      if (Number(existingAdmins.rows[0].c) === 0) {
        const hash = await bcrypt.hash(bootstrapPass, 10);
        const role = bootstrapRole === 'admin' ? 'admin' : 'superadmin';
        await query(
          `INSERT INTO admin_users (username, password_hash, role, display_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (username) DO NOTHING`,
          [bootstrapUser, hash, role, bootstrapUser]
        );
      }
    }

    // 5–6. Do not insert invented jewellery/catalogue copy.
    // Import real rows from the MySQL dump (docs/DATABASE_MIGRATION.md).

    const tableListRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables = tableListRes.rows.map((r) => r.table_name);

    return {
      success: true,
      message: `Database configured and seeded successfully! Created ${tables.length} tables.`,
      tables,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Migration failed: ' + error.message,
      tables: [],
      error: error.message,
    };
  }
}