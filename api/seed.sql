-- ═══════════════════════════════════════════════════════
-- AGRI VISION — Seed Data
-- ═══════════════════════════════════════════════════════
USE `agrivision`;

-- Demo User (password: demo123)
INSERT INTO `users` (`name`, `email`, `phone`, `password_hash`, `language`, `lat`, `lng`, `village`) VALUES
('Karthik', 'karthik@example.com', '+919876543210',
 '$2y$10$xN5VCGf0nF7Q8qH8z5R4..KqR6gZiJ3X6J6vWz8K1JQp4xK6mK2S2',
 'en', 12.963400, 79.943100, 'Sriperumbudur');

-- Demo Farms
INSERT INTO `farms` (`user_id`, `name`, `lat`, `lng`, `area_ha`, `soil_type`) VALUES
(1, 'Main Paddy Field', 12.9634, 79.9431, 2.40, 'Alluvial Clay'),
(1, 'Groundnut Plot', 12.9580, 79.9510, 0.80, 'Red Sandy Loam');

-- Demo Crops
INSERT INTO `crops` (`farm_id`, `crop`, `variety`, `plant_date`, `harvest_date`, `stage`, `status`, `area_ha`, `expected_yield`, `cost_seed`, `cost_fert`, `cost_pest`, `cost_labor`, `cost_irrigation`) VALUES
(1, 'Paddy', 'ADT-43 (Samba)', '2025-08-15', '2025-12-20', 'Tillering', 'healthy', 1.20, '5.2 t/ha', 3200, 4800, 2100, 8500, 3000),
(2, 'Groundnut', 'TMV-7', '2025-07-20', '2025-11-15', 'Pegging', 'needs_attention', 0.80, '1.8 t/ha', 2800, 3200, 1500, 6000, 2000),
(1, 'Sugarcane', 'Co-86032', '2025-02-10', '2026-02-10', 'Grand Growth', 'healthy', 2.00, '85 t/ha', 8500, 6200, 3000, 12000, 5500),
(1, 'Brinjal', 'Arka Keshav', '2025-06-01', '2025-09-15', 'Harvesting', 'healthy', 0.30, '32 t/ha', 1200, 1800, 800, 4000, 1500);

-- Demo Soil Report
INSERT INTO `soil_reports` (`farm_id`, `ph`, `n`, `p`, `k`, `organic_c`, `source`, `diagnosis_json`, `prescription_json`) VALUES
(1, 6.80, 245, 18, 182, 0.620, 'soilgrids',
 '["Nitrogen: Adequate (245 kg/ha)","Phosphorus: Low (18 kg/ha)","Potassium: Medium (182 kg/ha)","Organic Carbon: Low (0.62%)","pH: Slightly acidic"]',
 '["Apply 25 kg/ha SSP at sowing","Add 2 t/ha farmyard manure","Apply 20 kg/ha MOP at tillering","Green manure with Dhaincha"]');

-- Demo Alerts
INSERT INTO `alerts` (`user_id`, `severity`, `type`, `title`, `body`, `action_required`) VALUES
(1, 'red', 'pest_risk', 'Blast Fungus Risk — Paddy', 'High humidity (85%) and temperatures 24–30°C. Apply Tricyclazole 75WP @ 0.6g/L.', 1),
(1, 'amber', 'heavy_rain', 'Heavy Rainfall Warning — 65mm/48h', 'Clear drainage. Delay fertilizer. Cover nursery beds.', 1),
(1, 'blue', 'irrigation', 'Skip Irrigation Advisory', 'Soil moisture adequate from recent rain. Save water for 3 days.', 0);

-- Demo Insurance Policy
INSERT INTO `insurance_policies` (`crop_id`, `scheme`, `sum_insured`, `premium`, `status`) VALUES
(1, 'PMFBY Kharif 2025', 150000.00, 3000.00, 'active'),
(2, 'PMFBY Kharif 2025', 80000.00, 1600.00, 'active');

-- Demo Market Data
INSERT INTO `market_cache` (`crop`, `market`, `price`, `date`) VALUES
('Paddy (Common)', 'Kancheepuram', 2183.00, CURDATE()),
('Groundnut', 'Kancheepuram', 5850.00, CURDATE()),
('Sugarcane', 'Kancheepuram', 315.00, CURDATE()),
('Brinjal', 'Kancheepuram', 1200.00, CURDATE());
