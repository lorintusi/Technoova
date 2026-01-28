-- Migration: Create time_entries table for manual time tracking
-- Stores individual time entries for workers per day/location

CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id VARCHAR(50) NOT NULL,
    location_id VARCHAR(50) NULL,
    entry_date DATE NOT NULL,
    entry_type ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN') NOT NULL DEFAULT 'BUERO_ALLGEMEIN',
    category ENUM('BUERO_ALLGEMEIN', 'ENTWICKLUNG', 'MEETING', 'KRANKHEIT', 'TRAINING', 'PAUSE') NOT NULL DEFAULT 'BUERO_ALLGEMEIN',
    time_from TIME NOT NULL,
    time_to TIME NOT NULL,
    hours DECIMAL(4,2) NOT NULL,
    notes TEXT NULL,
    created_by VARCHAR(50) NOT NULL,
    updated_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_worker_date (worker_id, entry_date),
    INDEX idx_location_date (location_id, entry_date),
    INDEX idx_date (entry_date),
    INDEX idx_category (category),
    INDEX idx_entry_type (entry_type),
    
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Prevent overlapping entries per worker/day
    -- Note: This is handled in application logic, but we add an index for performance
    UNIQUE KEY unique_time_entry (worker_id, entry_date, time_from, time_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE time_entries 
    MODIFY COLUMN category ENUM('BUERO_ALLGEMEIN', 'ENTWICKLUNG', 'MEETING', 'KRANKHEIT', 'TRAINING', 'PAUSE') 
    NOT NULL DEFAULT 'BUERO_ALLGEMEIN'
    COMMENT 'Kategorie der Zeiterfassung: Büro allgemein, Entwicklung, Meeting, Krankheit, Training, Pause';

ALTER TABLE time_entries 
    MODIFY COLUMN entry_type ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN') 
    NOT NULL DEFAULT 'BUERO_ALLGEMEIN'
    COMMENT 'Typ des Eintrags: Baustelle (mit location_id), Krank, Büro allgemein';



