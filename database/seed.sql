-- ChandraKala Jewellers — PostgreSQL seed
-- Rates/settings only. Do not invent jewellery names or staff passwords.
-- Import real catalogue/stock from MySQL: docs/DATABASE_MIGRATION.md

INSERT INTO rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, apply_making_to_silver)
VALUES (15100.00, 237.00, 650.00, 0.00, 28.00, TRUE);

INSERT INTO manual_rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, manual_making_charges_percent, manual_apply_making_to_silver)
VALUES (13001.00, 255.00, 600.00, 0.00, 0.00, 21.00, TRUE);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('shop_name', 'ChandraKala Jewellers'),
('whatsapp_number', '919427080359'),
('shop_phone_display', '+91 9427080359'),
('shop_email', 'chandrakalajewellers849@gmail.com'),
('shop_address', 'Civil Road, Khedbrahma, Sabarkantha, Gujarat - 383255'),
('rate_formula_json', '{"gold":[{"op":"*","value":0.9166},{"op":"/","value":1.03}],"silver":[],"silver_925":[],"copper":[]}'),
('gst_percent', '3'),
('feat_reviews', '1'),
('feat_wishlist', '1'),
('feat_online_pay', '1')
ON CONFLICT (setting_key) DO NOTHING;
