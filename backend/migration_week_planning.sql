-- Migration: Enable week planning / Einsatzplanung
-- Makes location_id optional in assignments table to support KRANK/BÜRO entries

-- Step 1: Remove NOT NULL constraint from location_id (for KRANK/BÜRO entries)
ALTER TABLE assignments MODIFY COLUMN location_id VARCHAR(50) NULL;

-- Step 2: Add entry_type column to distinguish between BAUSTELLE, KRANK, BÜRO_ALLGEMEIN
-- This allows better tracking of different planning entry types
ALTER TABLE assignments 
ADD COLUMN entry_type ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN') NULL 
AFTER location_id;

-- Step 3: Update existing assignments to BAUSTELLE type (since they all have location_id)
UPDATE assignments SET entry_type = 'BAUSTELLE' WHERE location_id IS NOT NULL;

-- Step 4: Update unique constraint to handle NULL location_id
-- Remove old constraint
ALTER TABLE assignments DROP INDEX IF EXISTS unique_assignment;

-- Add new constraint that allows NULL location_id (MySQL handles NULLs specially in UNIQUE constraints)
-- Note: In MySQL, NULL values are not considered equal, so multiple NULLs are allowed
ALTER TABLE assignments 
ADD UNIQUE KEY unique_assignment_planning (
    worker_id, 
    assignment_date, 
    COALESCE(location_id, ''), 
    COALESCE(entry_type, 'BAUSTELLE')
);

-- Index for entry_type for faster filtering
ALTER TABLE assignments ADD INDEX idx_entry_type (entry_type);

-- Note: Foreign key constraint on location_id will still work with NULL values
-- (NULLs are allowed in foreign keys)



