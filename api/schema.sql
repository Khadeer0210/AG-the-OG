-- ═══════════════════════════════════════════════════════
-- AGRI VISION (Krishi Saarthi) — MySQL Schema
-- Database: agrivision
-- ═══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS `agrivision` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agrivision`;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20),
  `password_hash` VARCHAR(255) NOT NULL,
  `language` VARCHAR(5) DEFAULT 'en',
  `lat` DECIMAL(10,6) DEFAULT 12.963400,
  `lng` DECIMAL(10,6) DEFAULT 79.943100,
  `village` VARCHAR(100) DEFAULT 'Sriperumbudur',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Farms
CREATE TABLE IF NOT EXISTS `farms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `lat` DECIMAL(10,6),
  `lng` DECIMAL(10,6),
  `area_ha` DECIMAL(8,2),
  `soil_type` VARCHAR(50),
  `boundary_geojson` TEXT,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Crops
CREATE TABLE IF NOT EXISTS `crops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `crop` VARCHAR(80) NOT NULL,
  `variety` VARCHAR(100),
  `plant_date` DATE,
  `harvest_date` DATE,
  `stage` VARCHAR(50) DEFAULT 'Sowing',
  `status` ENUM('healthy','needs_attention','diseased') DEFAULT 'healthy',
  `area_ha` DECIMAL(8,2),
  `expected_yield` VARCHAR(50),
  `cost_seed` DECIMAL(10,2) DEFAULT 0,
  `cost_fert` DECIMAL(10,2) DEFAULT 0,
  `cost_pest` DECIMAL(10,2) DEFAULT 0,
  `cost_labor` DECIMAL(10,2) DEFAULT 0,
  `cost_irrigation` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Soil Reports
CREATE TABLE IF NOT EXISTS `soil_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `ph` DECIMAL(4,2),
  `n` DECIMAL(8,2),
  `p` DECIMAL(8,2),
  `k` DECIMAL(8,2),
  `organic_c` DECIMAL(5,3),
  `micro_json` JSON,
  `source` ENUM('lab','soilgrids') DEFAULT 'soilgrids',
  `diagnosis_json` JSON,
  `prescription_json` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Weather Cache
CREATE TABLE IF NOT EXISTS `weather_cache` (
  `loc_key` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `json` JSON,
  `fetched_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`loc_key`, `date`)
) ENGINE=InnoDB;

-- NDVI Readings
CREATE TABLE IF NOT EXISTS `ndvi_readings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `farm_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `ndvi` DECIMAL(5,3),
  `source` VARCHAR(50) DEFAULT 'synthetic',
  FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Alerts
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `severity` ENUM('red','amber','blue') DEFAULT 'blue',
  `type` VARCHAR(50),
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT,
  `action_required` TINYINT(1) DEFAULT 0,
  `read_flag` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insurance Policies
CREATE TABLE IF NOT EXISTS `insurance_policies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `crop_id` INT NOT NULL,
  `scheme` VARCHAR(100) DEFAULT 'PMFBY Kharif',
  `sum_insured` DECIMAL(12,2),
  `premium` DECIMAL(10,2),
  `status` VARCHAR(30) DEFAULT 'active',
  FOREIGN KEY (`crop_id`) REFERENCES `crops`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insurance Assessments
CREATE TABLE IF NOT EXISTS `insurance_assessments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `crop_id` INT NOT NULL,
  `ndvi_now` DECIMAL(5,3),
  `ndvi_base` DECIMAL(5,3),
  `loss_pct` DECIMAL(5,2),
  `eligible` TINYINT(1) DEFAULT 0,
  `payout` DECIMAL(12,2),
  `evidence_json` JSON,
  `hash` VARCHAR(64),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`crop_id`) REFERENCES `crops`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Chat History
CREATE TABLE IF NOT EXISTS `chat_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role` ENUM('user','assistant','system') DEFAULT 'user',
  `content` TEXT NOT NULL,
  `lang` VARCHAR(5) DEFAULT 'en',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Market Cache
CREATE TABLE IF NOT EXISTS `market_cache` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `crop` VARCHAR(80) NOT NULL,
  `market` VARCHAR(100),
  `price` DECIMAL(10,2),
  `date` DATE
) ENGINE=InnoDB;
