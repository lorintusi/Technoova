-- Migration: Add planning_entries table and extend existing tables
-- Supports Self-Planning and Planning->Confirm->TimeEntry flow

-- 1. Create planning_entries table
CREATE TABLE IF NOT EXISTS planning_entries (
    id VARCHAR(50) PRIMARY KEY,
    worker_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location_id VARCHAR(50) NULL,
    category VARCHAR(100) NOT NULL,
    note TEXT NULL,
    status ENUM('PLANNED', 'CONFIRMED') DEFAULT 'PLANNED',
    source ENUM('ADMIN_PLAN', 'SELF_PLAN') DEFAULT 'ADMIN_PLAN',
    created_by_user_id VARCHAR(50) NOT NULL,
    created_by_role ENUM('ADMIN', 'WORKER') DEFAULT 'ADMIN',
    time_entry_id INT NULL,
    confirmed_at TIMESTAMP NULL,
    confirmed_by_user_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_worker_date (worker_id, date),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_source (source),
    INDEX idx_time_entry_id (time_entry_id),
    
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add resourcesRequired to locations (JSON array)
-- Check if column exists first
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'locations' 
    AND COLUMN_NAME = 'resources_required'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE locations ADD COLUMN resources_required JSON NULL COMMENT "Array of required resources (e.g. [\"LKW\", \"Schweissgerät\"])"',
    'SELECT "Column resources_required already exists" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add meta to time_entries (JSON for flexible metadata)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'time_entries' 
    AND COLUMN_NAME = 'meta'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE time_entries ADD COLUMN meta JSON NULL COMMENT "JSON metadata (e.g. {\"sourcePlanningEntryId\": \"plan-123\"})"',
    'SELECT "Column meta already exists" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Ensure status column exists in time_entries (from previous migration)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'time_entries' 
    AND COLUMN_NAME = 'status'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE time_entries ADD COLUMN status ENUM(\'PLANNED\', \'CONFIRMED\', \'REJECTED\') DEFAULT \'PLANNED\'',
    'SELECT "Column status already exists" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Add indexes for performance
-- Check if index exists before creating
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'planning_entries' 
    AND INDEX_NAME = 'idx_planning_entries_worker_date'
);
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_planning_entries_worker_date ON planning_entries(worker_id, date)',
    'SELECT "Index idx_planning_entries_worker_date already exists" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'planning_entries' 
    AND INDEX_NAME = 'idx_planning_entries_status'
);
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_planning_entries_status ON planning_entries(status)',
    'SELECT "Index idx_planning_entries_status already exists" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

