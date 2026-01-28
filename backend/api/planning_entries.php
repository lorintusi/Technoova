<?php
/**
 * Planning Entries API
 * CRUD operations for planning entries (individual blocks)
 * Supports ADMIN_PLAN and SELF_PLAN
 */

function handlePlanningEntries($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get planning entries (filtered by worker_id, date range, etc.)
            $workerId = $_GET['worker_id'] ?? null;
            $dateFrom = $_GET['date_from'] ?? null;
            $dateTo = $_GET['date_to'] ?? null;
            $date = $_GET['date'] ?? null;
            $status = $_GET['status'] ?? null;
            
            // Check permissions
            $currentWorkerId = $currentUser['worker_id'] ?? null;
            $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
            
            // Build WHERE clause
            $where = [];
            $params = [];
            
            if ($workerId) {
                // Permission check: worker can only see own entries
                if (!$isAdmin && $workerId !== $currentWorkerId) {
                    sendJSON(['success' => false, 'error' => 'Permission denied: can only view own planning'], 403);
                }
                $where[] = "worker_id = ?";
                $params[] = $workerId;
            } else if (!$isAdmin) {
                // Non-admin must filter by own worker_id
                if (!$currentWorkerId) {
                    sendJSON(['success' => false, 'error' => 'No worker ID associated with user'], 403);
                }
                $where[] = "worker_id = ?";
                $params[] = $currentWorkerId;
            }
            
            if ($date) {
                $where[] = "date = ?";
                $params[] = $date;
            } else if ($dateFrom && $dateTo) {
                $where[] = "date >= ? AND date <= ?";
                $params[] = $dateFrom;
                $params[] = $dateTo;
            }
            
            if ($status) {
                $where[] = "status = ?";
                $params[] = $status;
            }
            
            $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
            
            $stmt = $db->prepare("
                SELECT 
                    pe.*,
                    l.code as location_code,
                    l.address as location_address,
                    l.resources_required as location_resources_required
                FROM planning_entries pe
                LEFT JOIN locations l ON pe.location_id = l.id
                $whereClause
                ORDER BY pe.date, pe.start_time
            ");
            $stmt->execute($params);
            $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Normalize response
            foreach ($entries as &$entry) {
                $entry['all_day'] = (bool)$entry['all_day'];
                $entry['resources_required'] = $entry['location_resources_required'] 
                    ? json_decode($entry['location_resources_required'], true) 
                    : [];
                unset($entry['location_resources_required']);
            }
            
            sendJSON(['success' => true, 'data' => $entries]);
            break;
            
        case 'POST':
            // Create planning entry
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            // Validate required fields
            if (empty($data['worker_id']) || empty($data['date']) || empty($data['category'])) {
                sendJSON(['success' => false, 'error' => 'worker_id, date, and category are required'], 400);
            }
            
            // Permission check: worker can only create for themselves
            $currentWorkerId = $currentUser['worker_id'] ?? null;
            $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
            
            if (!$isAdmin && $data['worker_id'] !== $currentWorkerId) {
                sendJSON(['success' => false, 'error' => 'Permission denied: can only plan for yourself'], 403);
            }
            
            // Determine source and created_by_role
            $source = $isAdmin ? 'ADMIN_PLAN' : 'SELF_PLAN';
            $createdByRole = $isAdmin ? 'ADMIN' : 'WORKER';
            
            $entryId = $data['id'] ?? 'plan-' . uniqid();
            
            // Overlap validation: Check for conflicts with existing entries
            $overlapCheck = checkPlanningEntryOverlap($db, $data['worker_id'], $data['date'], 
                $data['start_time'] ?? null, $data['end_time'] ?? null, 
                isset($data['all_day']) ? (bool)$data['all_day'] : false, null);
            
            if (!$overlapCheck['ok']) {
                sendJSON(['success' => false, 'error' => $overlapCheck['message']], 409);
            }
            
            $stmt = $db->prepare("
                INSERT INTO planning_entries (
                    id, worker_id, date, start_time, end_time, all_day,
                    location_id, category, note, status, source,
                    created_by_user_id, created_by_role
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            try {
                $stmt->execute([
                    $entryId,
                    $data['worker_id'],
                    $data['date'],
                    $data['start_time'] ?? null,
                    $data['end_time'] ?? null,
                    isset($data['all_day']) ? (int)$data['all_day'] : 0,
                    $data['location_id'] ?? null,
                    $data['category'],
                    $data['note'] ?? null,
                    $data['status'] ?? 'PLANNED',
                    $source,
                    $currentUser['id'],
                    $createdByRole
                ]);
                
                // Fetch created entry
                $createdStmt = $db->prepare("
                    SELECT pe.*, l.code as location_code, l.address as location_address,
                           l.resources_required as location_resources_required
                    FROM planning_entries pe
                    LEFT JOIN locations l ON pe.location_id = l.id
                    WHERE pe.id = ?
                ");
                $createdStmt->execute([$entryId]);
                $created = $createdStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($created) {
                    $created['all_day'] = (bool)$created['all_day'];
                    $created['resources_required'] = $created['location_resources_required'] 
                        ? json_decode($created['location_resources_required'], true) 
                        : [];
                    unset($created['location_resources_required']);
                }
                
                sendJSON(['success' => true, 'data' => $created, 'id' => $entryId], 201);
            } catch (PDOException $e) {
                sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
            }
            break;
            
        case 'PUT':
            // Update planning entry
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Planning entry ID required'], 400);
            }
            
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            // Get existing entry
            $getStmt = $db->prepare("SELECT * FROM planning_entries WHERE id = ?");
            $getStmt->execute([$id]);
            $existing = $getStmt->fetch();
            
            if (!$existing) {
                sendJSON(['success' => false, 'error' => 'Planning entry not found'], 404);
            }
            
            // Permission check: worker can only update own entries
            $currentWorkerId = $currentUser['worker_id'] ?? null;
            $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
            
            if (!$isAdmin && $existing['worker_id'] !== $currentWorkerId && $existing['created_by_user_id'] !== $currentUser['id']) {
                sendJSON(['success' => false, 'error' => 'Permission denied: can only update own entries'], 403);
            }
            
            $data = getRequestData();
            $updates = [];
            $params = [];
            
            if (isset($data['date'])) {
                $updates[] = "date = ?";
                $params[] = $data['date'];
            }
            if (isset($data['start_time'])) {
                $updates[] = "start_time = ?";
                $params[] = $data['start_time'];
            }
            if (isset($data['end_time'])) {
                $updates[] = "end_time = ?";
                $params[] = $data['end_time'];
            }
            if (isset($data['all_day'])) {
                $updates[] = "all_day = ?";
                $params[] = (int)$data['all_day'];
            }
            if (isset($data['location_id'])) {
                $updates[] = "location_id = ?";
                $params[] = $data['location_id'];
            }
            if (isset($data['category'])) {
                $updates[] = "category = ?";
                $params[] = $data['category'];
            }
            if (isset($data['note'])) {
                $updates[] = "note = ?";
                $params[] = $data['note'];
            }
            if (isset($data['status'])) {
                $updates[] = "status = ?";
                $params[] = $data['status'];
            }
            if (isset($data['time_entry_id'])) {
                $updates[] = "time_entry_id = ?";
                $params[] = $data['time_entry_id'];
            }
            
            if (empty($updates)) {
                sendJSON(['success' => false, 'error' => 'No fields to update'], 400);
            }
            
            // Overlap validation: Check for conflicts if date/time is being changed
            $checkDate = $data['date'] ?? $existing['date'];
            $checkStartTime = $data['start_time'] ?? $existing['start_time'];
            $checkEndTime = $data['end_time'] ?? $existing['end_time'];
            $checkAllDay = isset($data['all_day']) ? (bool)$data['all_day'] : (bool)$existing['all_day'];
            
            $overlapCheck = checkPlanningEntryOverlap($db, $existing['worker_id'], $checkDate,
                $checkStartTime, $checkEndTime, $checkAllDay, $id);
            
            if (!$overlapCheck['ok']) {
                sendJSON(['success' => false, 'error' => $overlapCheck['message']], 409);
            }
            
            $params[] = $id;
            $sql = "UPDATE planning_entries SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            // Fetch updated entry
            $updatedStmt = $db->prepare("
                SELECT pe.*, l.code as location_code, l.address as location_address,
                       l.resources_required as location_resources_required
                FROM planning_entries pe
                LEFT JOIN locations l ON pe.location_id = l.id
                WHERE pe.id = ?
            ");
            $updatedStmt->execute([$id]);
            $updated = $updatedStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($updated) {
                $updated['all_day'] = (bool)$updated['all_day'];
                $updated['resources_required'] = $updated['location_resources_required'] 
                    ? json_decode($updated['location_resources_required'], true) 
                    : [];
                unset($updated['location_resources_required']);
            }
            
            sendJSON(['success' => true, 'data' => $updated]);
            break;
            
        case 'DELETE':
            // Delete planning entry
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Planning entry ID required'], 400);
            }
            
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            // Get existing entry
            $getStmt = $db->prepare("SELECT * FROM planning_entries WHERE id = ?");
            $getStmt->execute([$id]);
            $existing = $getStmt->fetch();
            
            if (!$existing) {
                sendJSON(['success' => false, 'error' => 'Planning entry not found'], 404);
            }
            
            // Permission check: worker can only delete own entries, and only if not confirmed
            $currentWorkerId = $currentUser['worker_id'] ?? null;
            $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
            
            if (!$isAdmin) {
                if ($existing['worker_id'] !== $currentWorkerId && $existing['created_by_user_id'] !== $currentUser['id']) {
                    sendJSON(['success' => false, 'error' => 'Permission denied: can only delete own entries'], 403);
                }
                if ($existing['status'] === 'CONFIRMED') {
                    sendJSON(['success' => false, 'error' => 'Cannot delete confirmed entries'], 403);
                }
            }
            
            $stmt = $db->prepare("DELETE FROM planning_entries WHERE id = ?");
            $stmt->execute([$id]);
            
            sendJSON(['success' => true]);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

/**
 * Check for planning entry overlaps (server-side validation)
 * @param PDO $db Database connection
 * @param string $workerId Worker ID
 * @param string $date Date (YYYY-MM-DD)
 * @param string|null $startTime Start time (HH:MM:SS or HH:MM)
 * @param string|null $endTime End time (HH:MM:SS or HH:MM)
 * @param bool $allDay Whether entry is all-day
 * @param string|null $excludeEntryId Entry ID to exclude from check (for updates)
 * @return array {ok: bool, message: string|null}
 */
function checkPlanningEntryOverlap($db, $workerId, $date, $startTime, $endTime, $allDay, $excludeEntryId = null) {
    // Get existing entries for same worker and date (excluding confirmed and self)
    // Security: Use prepared statements with proper parameter binding
    $where = "worker_id = ? AND date = ? AND status != 'CONFIRMED'";
    $params = [$workerId, $date];
    
    if ($excludeEntryId) {
        $where .= " AND id != ?";
        $params[] = $excludeEntryId;
    }
    
    // Security: Always use prepared statements (already done, but ensure it's correct)
    $stmt = $db->prepare("SELECT id, start_time, end_time, all_day, category, location_id FROM planning_entries WHERE " . $where);
    $stmt->execute($params);
    $existing = $stmt->fetchAll();
    
    // If new entry is all-day, it conflicts with ANY existing entry
    if ($allDay) {
        if (!empty($existing)) {
            $conflict = $existing[0];
            $category = $conflict['category'] ?? 'Allgemein';
            if ($conflict['all_day']) {
                return ['ok' => false, 'message' => "Konflikt: Ganztägige Planung kollidiert mit bereits vorhandener ganztägiger Planung ($category)"];
            } else {
                $start = substr($conflict['start_time'], 0, 5);
                $end = substr($conflict['end_time'], 0, 5);
                return ['ok' => false, 'message' => "Konflikt: Ganztägige Planung kollidiert mit bereits geplantem Block $category ($start–$end)"];
            }
        }
        return ['ok' => true, 'message' => null];
    }
    
    // If new entry has no time, it's invalid (unless all-day, which is handled above)
    if (!$startTime || !$endTime) {
        return ['ok' => false, 'message' => 'Zeitplanung erfordert Start- und Endzeit'];
    }
    
    // Normalize times (remove seconds if present)
    $startTimeNorm = substr($startTime, 0, 5);
    $endTimeNorm = substr($endTime, 0, 5);
    $startMinutes = timeToMinutes($startTimeNorm);
    $endMinutes = timeToMinutes($endTimeNorm);
    
    // Check each existing entry
    foreach ($existing as $entry) {
        // If existing is all-day, it conflicts
        if ($entry['all_day']) {
            $category = $entry['category'] ?? 'Allgemein';
            return ['ok' => false, 'message' => "Konflikt: Zeitplanung kollidiert mit ganztägigem Block ($category)"];
        }
        
        // Both are timed - check overlap
        if ($entry['start_time'] && $entry['end_time']) {
            $existingStart = substr($entry['start_time'], 0, 5);
            $existingEnd = substr($entry['end_time'], 0, 5);
            $existingStartMin = timeToMinutes($existingStart);
            $existingEndMin = timeToMinutes($existingEnd);
            
            // Check overlap: start1 < end2 && start2 < end1
            if ($startMinutes < $existingEndMin && $existingStartMin < $endMinutes) {
                $category = $entry['category'] ?? 'Allgemein';
                return ['ok' => false, 'message' => "Konflikt: Zeitplanung $startTimeNorm–$endTimeNorm überschneidet sich mit bereits geplantem Block $category ($existingStart–$existingEnd)"];
            }
        }
    }
    
    return ['ok' => true, 'message' => null];
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes($timeStr) {
    if (!$timeStr) return 0;
    $parts = explode(':', substr($timeStr, 0, 5));
    $hours = (int)($parts[0] ?? 0);
    $minutes = (int)($parts[1] ?? 0);
    return $hours * 60 + $minutes;
}


