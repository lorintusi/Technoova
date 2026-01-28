-- ====================================================================
-- CONSOLIDATION MIGRATION: Core Schema Final State
-- Datum: 2025-01-20
-- Zweck: Finaler Zielzustand unabhängig vom Migrationsstand
-- ====================================================================
-- WICHTIG: Diese Migration kann mehrfach ausgeführt werden (idempotent)
-- Sie prüft den IST-Zustand und passt nur an, was nötig ist.
-- ====================================================================

USE alefodas_loomone;

-- ====================================================================
-- TEIL 1: assignments Tabelle normalisieren
-- ====================================================================

-- Step 1.1: location_id NULLABLE machen (falls noch NOT NULL)
-- Prüfe zuerst, ob NOT NULL constraint existiert
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'assignments' 
      AND COLUMN_NAME = 'location_id' 
      AND IS_NULLABLE = 'NO'
);

SET @sql = IF(@exists > 0, 
    'ALTER TABLE assignments MODIFY COLUMN location_id VARCHAR(50) NULL',
    'SELECT "location_id ist bereits NULLABLE" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 1.2: entry_type Spalte hinzufügen (falls nicht vorhanden)
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'assignments' 
      AND COLUMN_NAME = 'entry_type'
);

SET @sql = IF(@exists = 0, 
    'ALTER TABLE assignments ADD COLUMN entry_type ENUM(\'BAUSTELLE\', \'KRANK\', \'BUERO_ALLGEMEIN\') NULL AFTER location_id',
    'SELECT "entry_type Spalte existiert bereits" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 1.3: Backfill entry_type für vorhandene Einträge
UPDATE assignments 
SET entry_type = 'BAUSTELLE' 
WHERE entry_type IS NULL AND location_id IS NOT NULL;

UPDATE assignments 
SET entry_type = COALESCE(entry_type, 'BUERO_ALLGEMEIN') 
WHERE entry_type IS NULL;

-- Step 1.4: assignment_uid Spalte hinzufügen (falls nicht vorhanden)
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'assignments' 
      AND COLUMN_NAME = 'assignment_uid'
);

SET @sql = IF(@exists = 0, 
    'ALTER TABLE assignments ADD COLUMN assignment_uid VARCHAR(36) NULL AFTER id',
    'SELECT "assignment_uid Spalte existiert bereits" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 1.5: Backfill assignment_uid für vorhandene Einträge (falls NULL)
-- WICHTIG: Dies wird im Backfill-Script gemacht, nicht hier (braucht UUID-Funktion)

-- Step 1.6: deleted_at Spalte hinzufügen (Soft Delete)
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'assignments' 
      AND COLUMN_NAME = 'deleted_at'
);

SET @sql = IF(@exists = 0, 
    'ALTER TABLE assignments ADD COLUMN deleted_at DATETIME NULL AFTER updated_at',
    'SELECT "deleted_at Spalte existiert bereits" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================================
-- TEIL 2: Unique Constraints konsolidieren
-- ====================================================================

-- Step 2.1: Alte Unique Constraints entfernen (falls vorhanden)
DROP INDEX IF EXISTS unique_assignment ON assignments;
DROP INDEX IF EXISTS unique_assignment_planning ON assignments;

-- Step 2.2: Unique Index auf assignment_uid erstellen (nach Backfill)
-- WICHTIG: Erst nach Backfill, wenn alle assignment_uid gesetzt sind
-- Dies wird im Backfill-Script gemacht

-- Step 2.3: Non-unique Index für Performance (worker_id, assignment_date)
DROP INDEX IF EXISTS idx_worker_date ON assignments;
CREATE INDEX idx_worker_date ON assignments(worker_id, assignment_date, deleted_at);

-- ====================================================================
-- TEIL 3: time_entries Verknüpfung zu assignments
-- ====================================================================

-- Step 3.1: assignment_id Spalte hinzufügen (falls nicht vorhanden)
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'time_entries' 
      AND COLUMN_NAME = 'assignment_id'
);

SET @sql = IF(@exists = 0, 
    'ALTER TABLE time_entries ADD COLUMN assignment_id INT NULL AFTER worker_id',
    'SELECT "assignment_id Spalte existiert bereits" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3.2: Foreign Key constraint (falls nicht vorhanden)
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'time_entries' 
      AND COLUMN_NAME = 'assignment_id' 
      AND REFERENCED_TABLE_NAME = 'assignments'
);

SET @sql = IF(@exists = 0, 
    'ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL',
    'SELECT "FK time_entries.assignment_id existiert bereits" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3.3: Index für assignment_id
DROP INDEX IF EXISTS idx_assignment_id ON time_entries;
CREATE INDEX idx_assignment_id ON time_entries(assignment_id);

-- Step 3.4: Index für Performance (entry_date, worker_id)
DROP INDEX IF EXISTS idx_entry_date_worker ON time_entries;
CREATE INDEX idx_entry_date_worker ON time_entries(entry_date, worker_id);

-- ====================================================================
-- TEIL 4: teams/workers Normalisierung (Single Source of Truth vorbereiten)
-- ====================================================================

-- Step 4.1: workers.team_id -> workers.primary_team_id umbenennen (falls team_id existiert)
SET @exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'workers' 
      AND COLUMN_NAME = 'team_id'
);

SET @exists_primary = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'workers' 
      AND COLUMN_NAME = 'primary_team_id'
);

-- Nur umbenennen, wenn team_id existiert aber primary_team_id nicht
SET @sql = IF(@exists > 0 AND @exists_primary = 0, 
    'ALTER TABLE workers CHANGE COLUMN team_id primary_team_id VARCHAR(50) NULL',
    'SELECT "team_id/primary_team_id bereits korrekt" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4.2: Index für primary_team_id (falls Spalte existiert)
SET @exists_primary = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'workers' 
      AND COLUMN_NAME = 'primary_team_id'
);

SET @sql = IF(@exists_primary > 0, 
    'CREATE INDEX IF NOT EXISTS idx_primary_team_id ON workers(primary_team_id)',
    'SELECT "primary_team_id existiert nicht, Index wird übersprungen" as info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================================
-- MIGRATION ABGESCHLOSSEN
-- ====================================================================
-- Nächster Schritt: Backfill-Script ausführen (assignment_uid setzen)
-- ====================================================================

SELECT 'CONSOLIDATION MIGRATION ABGESCHLOSSEN' as status;



