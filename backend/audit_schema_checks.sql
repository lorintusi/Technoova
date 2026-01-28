-- ====================================================================
-- PHASE 0.1: SCHEMA IST-ZUSTAND ANALYSE
-- Ermittelt exakten Zustand der Datenbank (nicht Annahmen)
-- ====================================================================

-- 1. Tabellen-Struktur: assignments
SHOW CREATE TABLE assignments\G

-- 2. Spalten-Details: assignments (Typ, Nullable, Default)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'assignments'
ORDER BY ORDINAL_POSITION;

-- 3. Alle Indizes/Unique Constraints: assignments
SHOW INDEXES FROM assignments;

-- 4. Foreign Keys: assignments
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME,
    UPDATE_RULE,
    DELETE_RULE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'assignments'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 5. Tabellen-Struktur: workers
SHOW CREATE TABLE workers\G

-- 6. Spalten-Details: workers (team_id prüfen)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workers'
  AND COLUMN_NAME IN ('id', 'team_id', 'name');

-- 7. Tabellen-Struktur: team_members
SHOW CREATE TABLE team_members\G

-- 8. Tabellen-Struktur: time_entries
SHOW CREATE TABLE time_entries\G

-- 9. Spalten-Details: time_entries (assignment_id prüfen)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'time_entries'
ORDER BY ORDINAL_POSITION;

-- 10. Alle Indizes/Unique Constraints: time_entries
SHOW INDEXES FROM time_entries;

-- ====================================================================
-- PHASE 0.2: INKONSISTENZ-CHECKS
-- ====================================================================

-- Check 1: assignments mit NULL location_id aber entry_type='BAUSTELLE' (sollte nicht passieren)
SELECT 
    COUNT(*) as count_invalid,
    GROUP_CONCAT(DISTINCT entry_type) as entry_types
FROM assignments
WHERE location_id IS NULL 
  AND (entry_type = 'BAUSTELLE' OR entry_type IS NULL);

-- Check 2: Doppelte assignments (nach gewünschtem Unique-Key)
-- Prüfe ob unique_assignment_planning wirklich greift
SELECT 
    worker_id, 
    assignment_date, 
    COALESCE(location_id, '') as loc_id, 
    COALESCE(entry_type, 'BAUSTELLE') as entry_type,
    COUNT(*) as count_duplicates
FROM assignments
GROUP BY worker_id, assignment_date, COALESCE(location_id, ''), COALESCE(entry_type, 'BAUSTELLE')
HAVING count_duplicates > 1;

-- Check 3: workers.team_id gesetzt aber kein team_members Eintrag
SELECT 
    w.id as worker_id,
    w.name as worker_name,
    w.team_id
FROM workers w
LEFT JOIN team_members tm ON w.id = tm.worker_id AND w.team_id = tm.team_id
WHERE w.team_id IS NOT NULL 
  AND tm.worker_id IS NULL;

-- Check 4: team_members Eintrag aber team existiert nicht (FK fehlt?)
SELECT 
    tm.team_id,
    tm.worker_id,
    t.id as team_exists
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
WHERE t.id IS NULL;

-- Check 5: team_members Eintrag aber worker existiert nicht (FK fehlt?)
SELECT 
    tm.team_id,
    tm.worker_id,
    w.id as worker_exists
FROM team_members tm
LEFT JOIN workers w ON tm.worker_id = w.id
WHERE w.id IS NULL;

-- Check 6: time_entries Overlaps (sollte durch App-Logik verhindert sein, aber prüfen)
SELECT 
    te1.id as entry1_id,
    te1.worker_id,
    te1.entry_date,
    te1.time_from as entry1_from,
    te1.time_to as entry1_to,
    te2.id as entry2_id,
    te2.time_from as entry2_from,
    te2.time_to as entry2_to
FROM time_entries te1
INNER JOIN time_entries te2 
    ON te1.worker_id = te2.worker_id 
    AND te1.entry_date = te2.entry_date
    AND te1.id < te2.id
WHERE (
    (te1.time_from <= te2.time_from AND te1.time_to > te2.time_from)
    OR (te1.time_from < te2.time_to AND te1.time_to >= te2.time_to)
    OR (te1.time_from >= te2.time_from AND te1.time_to <= te2.time_to)
);

-- Check 7: time_entries die logisch zu assignments passen könnten (für späteres Auto-Linking)
-- (Nur wenn assignment_id Spalte existiert)
-- SELECT COUNT(*) as time_entries_without_assignment_id
-- FROM time_entries
-- WHERE assignment_id IS NULL;

-- Check 8: assignments ohne location_id (sollten entry_type KRANK/BUERO haben)
SELECT 
    COUNT(*) as count_null_location,
    GROUP_CONCAT(DISTINCT entry_type) as entry_types
FROM assignments
WHERE location_id IS NULL;

-- Check 9: assignments mit location_id aber entry_type nicht BAUSTELLE
SELECT 
    COUNT(*) as count_inconsistent,
    GROUP_CONCAT(DISTINCT entry_type) as entry_types
FROM assignments
WHERE location_id IS NOT NULL 
  AND entry_type IS NOT NULL 
  AND entry_type != 'BAUSTELLE';

-- Check 10: Welche Unique Constraints existieren wirklich? (gegen Migration prüfen)
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    ORDINAL_POSITION,
    CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS t 
    ON k.CONSTRAINT_NAME = t.CONSTRAINT_NAME 
    AND k.TABLE_SCHEMA = t.TABLE_SCHEMA
WHERE k.TABLE_SCHEMA = DATABASE()
  AND k.TABLE_NAME = 'assignments'
  AND t.CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION;

-- Check 11: Statistiken: Wieviele assignments existieren?
SELECT 
    COUNT(*) as total_assignments,
    COUNT(DISTINCT worker_id) as distinct_workers,
    COUNT(DISTINCT location_id) as distinct_locations,
    COUNT(CASE WHEN location_id IS NULL THEN 1 END) as null_location_count,
    COUNT(CASE WHEN entry_type IS NOT NULL THEN 1 END) as has_entry_type_count
FROM assignments;

-- Check 12: Statistiken: Wieviele time_entries existieren?
SELECT 
    COUNT(*) as total_time_entries,
    COUNT(DISTINCT worker_id) as distinct_workers,
    COUNT(DISTINCT location_id) as distinct_locations
FROM time_entries;

-- Check 13: workers die in team_members sind, aber workers.team_id nicht synchron
SELECT 
    w.id,
    w.name,
    w.team_id as workers_team_id,
    tm.team_id as team_members_team_id,
    GROUP_CONCAT(DISTINCT tm.team_id) as all_teams_in_members
FROM workers w
INNER JOIN team_members tm ON w.id = tm.worker_id
GROUP BY w.id, w.name, w.team_id
HAVING w.team_id IS NULL OR w.team_id NOT IN (tm.team_id);



