-- ═══════════════════════════════════════════════════════
-- AGRI VISION — Schema V2 Extensions
-- Run AFTER schema.sql and schema_extend.sql
-- ═══════════════════════════════════════════════════════
USE `agrivision`;

-- Crop Activities (Crop Log tracking)
CREATE TABLE IF NOT EXISTS `crop_activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `crop_id` INT NOT NULL,
  `activity_type` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `amount` DECIMAL(12,2) DEFAULT 0,
  `quantity` VARCHAR(50),
  `activity_date` DATE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`crop_id`) REFERENCES `crops`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Extend crops with revenue fields
ALTER TABLE `crops` ADD COLUMN IF NOT EXISTS `revenue` DECIMAL(12,2) DEFAULT 0;
ALTER TABLE `crops` ADD COLUMN IF NOT EXISTS `selling_price` DECIMAL(10,2) DEFAULT 0;
ALTER TABLE `crops` ADD COLUMN IF NOT EXISTS `production_qty` DECIMAL(10,2) DEFAULT 0;

-- Soil Reports — AI Analysis storage
ALTER TABLE `soil_reports` ADD COLUMN IF NOT EXISTS `ai_analysis` TEXT NULL;
ALTER TABLE `soil_reports` ADD COLUMN IF NOT EXISTS `ec` DECIMAL(6,3) NULL;
ALTER TABLE `soil_reports` ADD COLUMN IF NOT EXISTS `zinc` DECIMAL(6,2) NULL;
ALTER TABLE `soil_reports` ADD COLUMN IF NOT EXISTS `iron` DECIMAL(6,2) NULL;
ALTER TABLE `soil_reports` ADD COLUMN IF NOT EXISTS `manganese` DECIMAL(6,2) NULL;
ALTER TABLE `soil_reports` ADD COLUMN IF NOT EXISTS `sulphur` DECIMAL(6,2) NULL;

-- SDG Metrics tracking
CREATE TABLE IF NOT EXISTS `sdg_metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `farm_id` INT NULL,
  `metric_key` VARCHAR(50) NOT NULL,
  `metric_value` DECIMAL(12,2),
  `source` VARCHAR(30) DEFAULT 'calculated',
  `period` VARCHAR(20),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Monitoring snapshots
CREATE TABLE IF NOT EXISTS `monitoring_snapshots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `ndvi` DECIMAL(5,3),
  `soil_moisture` DECIMAL(5,3),
  `temperature` DECIMAL(5,2),
  `humidity` DECIMAL(5,2),
  `rainfall_mm` DECIMAL(8,2),
  `crop_stress` VARCHAR(20),
  `disease_risk` VARCHAR(20),
  `irrigation_need` VARCHAR(20),
  `source` VARCHAR(30) DEFAULT 'calculated',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
