-- ==============================================================================
-- ChandraKala Jewellers (CJ) — PostgreSQL Seed Data
-- ==============================================================================

-- Seed Current Live Rates
INSERT INTO rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, apply_making_to_silver)
VALUES (15100.00, 237.00, 650.00, 950.00, 28.00, TRUE);

INSERT INTO manual_rates (gold_rate, silver_rate, silver_925_rate, copper_rate, making_charges_percent, manual_making_charges_percent, manual_apply_making_to_silver)
VALUES (15100.00, 237.00, 650.00, 950.00, 28.00, 21.00, TRUE);

-- Seed Default Settings
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

-- Seed Sample In-Stock Jewellery Items
INSERT INTO jewellery_items (id, name, image, description, purity, stone, category, sku, dimensions, weight, cached_price, metal_type, is_favourite, is_sold_out)
VALUES
(110, 'Pendent Butti Set', 'item_6a72eda95a8789.42699417.jpg', 'New design made to order in 22K hallmark gold', '22K 916', 'Cubic Zirconia', 'Necklace Sets', 'CJ-G-110', 'Medium', 11.640, 224977.92, 'gold', TRUE, FALSE),
(109, 'Gold Set with Earrings', 'item_6a72ed6a62cde2.58667970.jpg', 'Traditional royal bridal set in 916 yellow gold', '22K 916', 'Kundan', 'Bridal Sets', 'CJ-G-109', 'Large', 22.210, 349390.17, 'gold', TRUE, FALSE),
(108, 'Chain with Pearl', 'item_6a72ecafaab347.25954770.jpg', '916 gold chain adorned with freshwater cultured pearls', '22K 916', 'Pearl', 'Chains', 'CJ-G-108', '18 inches', 7.000, 135296.00, 'gold', TRUE, FALSE),
(85, '925 Silver Folding Ring', 'item_68c250db9ca9d1.78704969.jpg', 'Sterling silver 925 folding ring with dual wear style', '925 Silver', 'CZ', 'Rings', 'CJ-S-085', 'Adjustable', 5.400, 3920.40, 'silver_925', TRUE, FALSE),
(64, 'Silver Fancy Kada', 'IMG_1395.jpeg', 'Pure silver solid gents kada with intricate carving', '99.9% Silver', 'None', 'Kada', 'CJ-S-064', 'Size 2.8', 31.800, 9811.89, 'silver', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Custom Catalogue Design Items
INSERT INTO products (id, name, description, image_filename, category) VALUES
(161, 'Royal Kundan Choker Design', 'Exquisite handcrafted bridal choker design for custom orders.', 'jewellery_6a72cfeba28383.08197860.jpg', 'Choker'),
(162, 'Antique Temple Jhumka Design', 'South Indian antique finish temple jhumkas.', 'jewellery_6a72cfeba37d68.10630799.jpg', 'Earrings'),
(163, 'Floral Diamond Dokiya Concept', 'Lightweight 18K/22K mangalsutra dokiya concept piece.', 'jewellery_6a72cfeba3c762.10799803.jpg', 'Pendant')
ON CONFLICT (id) DO NOTHING;
