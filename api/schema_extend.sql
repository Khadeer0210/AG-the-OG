-- ═══════════════════════════════════════════════════════
-- AGRI VISION — Schema Extensions (Field-Centric)
-- Run AFTER the base schema.sql
-- ═══════════════════════════════════════════════════════
USE `agrivision`;

-- Weather History (per-field weather observations)
CREATE TABLE IF NOT EXISTS `weather_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `temp_max` DECIMAL(5,2),
  `temp_min` DECIMAL(5,2),
  `temp_avg` DECIMAL(5,2),
  `humidity_avg` DECIMAL(5,2),
  `rainfall_mm` DECIMAL(8,2),
  `wind_speed` DECIMAL(5,2),
  `soil_temp_0cm` DECIMAL(5,2),
  `soil_moisture_1_3cm` DECIMAL(5,3),
  `weather_code` INT,
  `source` VARCHAR(50) DEFAULT 'open-meteo',
  `fetched_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `farm_date` (`farm_id`, `date`),
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Plant Health Events
CREATE TABLE IF NOT EXISTS `plant_health_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `image_path` VARCHAR(500),
  `predicted_condition` VARCHAR(200),
  `crop` VARCHAR(80),
  `confidence` DECIMAL(5,2),
  `severity` VARCHAR(30),
  `observations_json` JSON,
  `treatment_json` JSON,
  `model_used` VARCHAR(50) DEFAULT 'llava:7b',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ML Predictions
CREATE TABLE IF NOT EXISTS `predictions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `prediction_type` VARCHAR(50),
  `prediction_json` JSON,
  `confidence` DECIMAL(5,3),
  `model_name` VARCHAR(100),
  `model_version` VARCHAR(30),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- AI Recommendations
CREATE TABLE IF NOT EXISTS `recommendations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `recommendation` TEXT,
  `source` VARCHAR(50) DEFAULT 'ollama',
  `language` VARCHAR(5) DEFAULT 'en',
  `context_json` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Field Timeline (all events for a field)
CREATE TABLE IF NOT EXISTS `field_timeline` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `severity` VARCHAR(20) DEFAULT 'info',
  `data_json` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_farm_date` (`farm_id`, `created_at`),
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insurance Events (field-level)
CREATE TABLE IF NOT EXISTS `insurance_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `event_type` VARCHAR(50),
  `severity` VARCHAR(30),
  `evidence_json` JSON,
  `status` VARCHAR(30) DEFAULT 'detected',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Notifications (farmer + field aware)
ALTER TABLE `alerts` ADD COLUMN IF NOT EXISTS `farm_id` INT NULL AFTER `user_id`;

-- Extend market_cache with more fields
ALTER TABLE `market_cache` ADD COLUMN IF NOT EXISTS `min_price` DECIMAL(10,2) NULL AFTER `price`;
ALTER TABLE `market_cache` ADD COLUMN IF NOT EXISTS `max_price` DECIMAL(10,2) NULL AFTER `min_price`;
ALTER TABLE `market_cache` ADD COLUMN IF NOT EXISTS `source` VARCHAR(50) DEFAULT 'data.gov.in' AFTER `date`;

-- Extend farms with creation timestamp
ALTER TABLE `farms` ADD COLUMN IF NOT EXISTS `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `farms` ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
