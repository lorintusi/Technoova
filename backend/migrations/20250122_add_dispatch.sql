-- Migration: Add Dispatch System
-- Created: 2025-01-22
-- Purpose: Add dispatch_items and dispatch_assignments tables for resource planning

CREATE TABLE IF NOT EXISTS dispatch_items (
    id VARCHAR(50) PRIMARY KEY,
    location_id VARCHAR(50) NULL,
    date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    all_day BOOLEAN DEFAULT 0,
    category VARCHAR(50) NULL, -- 'PROJEKT', 'SCHULUNG', etc.
    note TEXT NULL,
    status VARCHAR(50) DEFAULT 'PLANNED', -- 'PLANNED', 'CONFIRMED', 'CANCELLED'
    created_by_user_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_location_id (location_id),
    INDEX idx_created_by_user_id (created_by_user_id),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dispatch_assignments (
    id VARCHAR(50) PRIMARY KEY,
    dispatch_item_id VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'WORKER', 'VEHICLE', 'DEVICE'
    resource_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_assignment (dispatch_item_id, resource_type, resource_id, date),
    INDEX idx_dispatch_item (dispatch_item_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_date (date),
    FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



