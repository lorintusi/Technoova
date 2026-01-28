-- Migration: Add planning status and weekly hours target
-- Adds status field to time_entries and weekly_hours_target to users

-- Add status, confirmed_at, confirmed_by, planned_by to time_entries
ALTER TABLE time_entries 
ADD COLUMN status ENUM('PLANNED', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'PLANNED'
COMMENT 'Status: PLANNED (Admin plant), CONFIRMED (Mitarbeiter bestätigt), REJECTED (Mitarbeiter lehnt ab)'
AFTER hours;

ALTER TABLE time_entries 
ADD COLUMN confirmed_at DATETIME NULL
COMMENT 'Zeitpunkt der Bestätigung durch Mitarbeiter'
AFTER status;

ALTER TABLE time_entries 
ADD COLUMN confirmed_by VARCHAR(50) NULL
COMMENT 'User ID der Bestätigung'
AFTER confirmed_at;

ALTER TABLE time_entries 
ADD COLUMN planned_by VARCHAR(50) NULL
COMMENT 'User ID der Planung (Admin)'
AFTER confirmed_by;

-- Add foreign keys
ALTER TABLE time_entries 
ADD CONSTRAINT fk_time_entries_confirmed_by 
FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE time_entries 
ADD CONSTRAINT fk_time_entries_planned_by 
FOREIGN KEY (planned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for performance
ALTER TABLE time_entries 
ADD INDEX idx_status (status);

ALTER TABLE time_entries 
ADD INDEX idx_user_status (worker_id, status);

ALTER TABLE time_entries 
ADD INDEX idx_confirmed_by (confirmed_by);

ALTER TABLE time_entries 
ADD INDEX idx_planned_by (planned_by);

-- Add weekly_hours_target to users
ALTER TABLE users 
ADD COLUMN weekly_hours_target DECIMAL(4,2) NOT NULL DEFAULT 42.50
COMMENT 'Wochenstunden-Soll (Standard 42.5h)'
AFTER last_login;

-- Update existing entries to PLANNED status (backward compatibility)
UPDATE time_entries SET status = 'PLANNED' WHERE status IS NULL;

