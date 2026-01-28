-- Migration: Add Medical Certificates Table
-- Date: 2025-01-22
-- Purpose: Store medical certificates for KRANK planning entries

CREATE TABLE IF NOT EXISTS medical_certificates (
    id VARCHAR(50) PRIMARY KEY,
    worker_id VARCHAR(50) NOT NULL,
    planning_entry_id VARCHAR(50) NULL,
    date DATE NOT NULL,
    filename_original VARCHAR(255) NOT NULL,
    filename_stored VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by_user_id VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_worker_id (worker_id),
    INDEX idx_planning_entry_id (planning_entry_id),
    INDEX idx_date (date),
    INDEX idx_uploaded_at (uploaded_at),
    UNIQUE KEY unique_planning_entry_certificate (planning_entry_id),
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (planning_entry_id) REFERENCES week_planning(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



