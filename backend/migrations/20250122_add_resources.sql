-- Migration: Add Resources (Vehicles & Devices)
-- Created: 2025-01-22
-- Purpose: Add tables for vehicles and devices management

CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NULL, -- 'LKW', 'PKW', 'Kran', etc.
    license_plate VARCHAR(50) NULL,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'unavailable'
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NULL, -- 'Bagger', 'Kran', 'Kompressor', etc.
    serial_number VARCHAR(100) NULL,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'unavailable'
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



