-- PHASE 5: Cleanup all PLANNED entries
-- WARNING: This will delete all time entries with status='PLANNED'
-- Make sure you have a backup before running this!

-- Check current count
SELECT COUNT(*) as planned_count_before FROM time_entries WHERE status='PLANNED';

-- Delete all PLANNED entries
DELETE FROM time_entries WHERE status='PLANNED';

-- Verify deletion
SELECT COUNT(*) as planned_count_after FROM time_entries WHERE status='PLANNED';

-- Expected result: planned_count_after should be 0
