<?php
/**
 * Time Entries API
 * Handles time entry planning (Admin) and confirmation (Worker)
 */

require_once __DIR__ . '/../config.php';

function handleConfirmDay($currentUser) {
    $db = getDBConnection();
    $data = getRequestData();
    
    // Validate date
    $date = $data['date'] ?? null;
    if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        sendJSON(['ok' => false, 'error' => 'Invalid date format. Expected YYYY-MM-DD'], 400);
    }
    
    // Validate date is valid
    $dateObj = DateTime::createFromFormat('Y-m-d', $date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
        sendJSON(['ok' => false, 'error' => 'Invalid date'], 400);
    }
    
    // Get current user's worker_id or user_id
    $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
    $userStmt->execute([$currentUser['id']]);
    $userData = $userStmt->fetch();
    $workerId = $userData['worker_id'] ?? null;
    
    // Build WHERE clause: only entries for current user
    $whereConditions = ["entry_date = ?", "status = 'PLANNED'"];
    $bindings = [$date];
    
    if ($workerId) {
        $whereConditions[] = "worker_id = ?";
        $bindings[] = $workerId;
    } else {
        // If no worker_id, use created_by
        $whereConditions[] = "created_by = ?";
        $bindings[] = $currentUser['id'];
    }
    
    // Update all PLANNED entries for this user on this date
    $updateStmt = $db->prepare("
        UPDATE time_entries 
        SET status = 'CONFIRMED',
            confirmed_at = NOW(),
            confirmed_by = ?,
            updated_by = ?
        WHERE " . implode(' AND ', $whereConditions)
    );
    
    $updateBindings = array_merge([$currentUser['id'], $currentUser['id']], $bindings);
    
    try {
        $updateStmt->execute($updateBindings);
        $updatedCount = $updateStmt->rowCount();
        
        sendJSON([
            'ok' => true,
            'date' => $date,
            'updated_count' => $updatedCount
        ]);
    } catch (PDOException $e) {
        sendJSON(['ok' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleTimeEntries($method, $id, $action, $currentUser) {
    $db = getDBConnection();
    
    // Route to action handlers (confirm, reject)
    if ($id && $action) {
        switch ($action) {
            case 'confirm':
                handleConfirmTimeEntry($db, $id, $currentUser);
                break;
            case 'reject':
                handleRejectTimeEntry($db, $id, $currentUser);
                break;
            default:
                sendJSON(['success' => false, 'error' => 'Action not found'], 404);
        }
        return;
    }
    
    switch ($method) {
        case 'GET':
            handleGetTimeEntries($db, $currentUser);
            break;
            
        case 'POST':
            handleCreateTimeEntry($db, $currentUser);
            break;
            
        case 'PUT':
        case 'PATCH':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Time entry ID required'], 400);
            }
            handleUpdateTimeEntry($db, $id, $currentUser);
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Time entry ID required'], 400);
            }
            handleDeleteTimeEntry($db, $id, $currentUser);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

function handleGetTimeEntries($db, $currentUser) {
    $params = $_GET;
    
    // Build query
    $query = "SELECT te.*, 
                     l.code as location_code, 
                     l.address as location_address,
                     w.name as worker_name,
                     u1.name as planned_by_name,
                     u2.name as confirmed_by_name
              FROM time_entries te
              LEFT JOIN workers w ON te.worker_id = w.id
              LEFT JOIN locations l ON te.location_id = l.id
              LEFT JOIN users u1 ON te.planned_by = u1.id
              LEFT JOIN users u2 ON te.confirmed_by = u2.id
              WHERE 1=1";
    
    // Note: meta field is included in te.* and will be returned as JSON string
    
    $conditions = [];
    $bindings = [];
    
    // AuthZ: Admin can see all, Worker only own
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    if (!$isAdmin) {
        // Worker: only own entries via worker_id or user_id
        $workerId = $currentUser['worker_id'] ?? null;
        if ($workerId) {
            $conditions[] = "te.worker_id = ?";
            $bindings[] = $workerId;
        } else {
            // If no worker_id, filter by created_by (user_id)
            $conditions[] = "te.created_by = ?";
            $bindings[] = $currentUser['id'];
        }
    } else {
        // Admin: can filter by user_id or worker_id from params
        if (isset($params['user_id']) && $params['user_id']) {
            // Get worker_id from user
            $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
            $userStmt->execute([$params['user_id']]);
            $user = $userStmt->fetch();
            if ($user && $user['worker_id']) {
                $conditions[] = "te.worker_id = ?";
                $bindings[] = $user['worker_id'];
            }
        }
        if (isset($params['worker_id']) && $params['worker_id']) {
            $conditions[] = "te.worker_id = ?";
            $bindings[] = $params['worker_id'];
        }
    }
    
    // Additional filters
    if (isset($params['status']) && $params['status']) {
        $conditions[] = "te.status = ?";
        $bindings[] = $params['status'];
    }
    
    if (isset($params['date_from']) && $params['date_from']) {
        $conditions[] = "te.entry_date >= ?";
        $bindings[] = $params['date_from'];
    }
    
    if (isset($params['date_to']) && $params['date_to']) {
        $conditions[] = "te.entry_date <= ?";
        $bindings[] = $params['date_to'];
    }
    
    if (!empty($conditions)) {
        $query .= " AND " . implode(" AND ", $conditions);
    }
    
    $query .= " ORDER BY te.entry_date DESC, te.time_from ASC";
    
    $stmt = $db->prepare($query);
    $stmt->execute($bindings);
    $entries = $stmt->fetchAll();
    
    // Normalize field names for frontend - SINGLE SOURCE OF TRUTH format
    foreach ($entries as &$entry) {
        // Parse meta JSON if present
        if (isset($entry['meta']) && is_string($entry['meta'])) {
            $entry['meta'] = json_decode($entry['meta'], true) ?: null;
        }
        
        // Core fields (always present)
        $entry['id'] = $entry['id'];
        $entry['user_id'] = null; // Will be set below
        $entry['date'] = $entry['entry_date'];
        $entry['time_from'] = $entry['time_from'];
        $entry['time_to'] = $entry['time_to'];
        $entry['project_id'] = $entry['location_id'];
        $entry['project_name'] = $entry['location_address'] ?? ($entry['location_code'] ?? null);
        $entry['category'] = $entry['category'] ?? 'BUERO_ALLGEMEIN';
        $entry['status'] = $entry['status'] ?? 'PLANNED';
        $entry['notes'] = $entry['notes'] ?? '';
        
        // Determine user_id (owner): worker_id -> user, or created_by
        if ($entry['worker_id']) {
            $userStmt = $db->prepare("SELECT id FROM users WHERE worker_id = ? LIMIT 1");
            $userStmt->execute([$entry['worker_id']]);
            $user = $userStmt->fetch();
            $entry['user_id'] = $user['id'] ?? null;
        } else {
            $entry['user_id'] = $entry['created_by'] ?? null;
        }
        
        // Legacy compatibility fields
        $entry['workerId'] = $entry['worker_id'];
        $entry['locationId'] = $entry['location_id'];
        $entry['entryDate'] = $entry['entry_date'];
        $entry['timeFrom'] = $entry['time_from'];
        $entry['timeTo'] = $entry['time_to'];
        $entry['plannedBy'] = $entry['planned_by'];
        $entry['confirmedBy'] = $entry['confirmed_by'];
        $entry['confirmedAt'] = $entry['confirmed_at'];
    }
    
    sendJSON(['success' => true, 'data' => $entries]);
}

function handleCreateTimeEntry($db, $currentUser) {
    $data = getRequestData();
    
    // Validate required fields
    if (empty($data['entry_date']) || empty($data['time_from']) || empty($data['time_to'])) {
        sendJSON(['success' => false, 'error' => 'entry_date, time_from, and time_to are required'], 400);
    }
    
    // AuthZ: Admin can plan for any user, Worker only for themselves
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    
    $workerId = null;
    $userId = null;
    
    if (isset($data['worker_id']) && $data['worker_id']) {
        $workerId = $data['worker_id'];
    } elseif (isset($data['user_id']) && $data['user_id']) {
        // Get worker_id from user_id
        $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
        $userStmt->execute([$data['user_id']]);
        $user = $userStmt->fetch();
        if ($user && $user['worker_id']) {
            $workerId = $user['worker_id'];
        } else {
            $userId = $data['user_id'];
        }
    } else {
        // Default to current user's worker_id
        $workerId = $currentUser['worker_id'] ?? null;
        if (!$workerId) {
            $userId = $currentUser['id'];
        }
    }
    
    // AuthZ check: Worker can only create for themselves
    if (!$isAdmin) {
        $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
        $userStmt->execute([$currentUser['id']]);
        $currentUserData = $userStmt->fetch();
        $currentWorkerId = $currentUserData['worker_id'] ?? null;
        
        if ($workerId && $workerId !== $currentWorkerId) {
            sendJSON(['success' => false, 'error' => 'Permission denied: Can only create entries for yourself'], 403);
        }
        if ($userId && $userId !== $currentUser['id']) {
            sendJSON(['success' => false, 'error' => 'Permission denied: Can only create entries for yourself'], 403);
        }
    }
    
    // Calculate hours
    $timeFrom = $data['time_from'];
    $timeTo = $data['time_to'];
    $hours = calculateHours($timeFrom, $timeTo);
    
    // FIX #3: Overlap Validation with midnight handling
    // Convert times to minutes for proper overlap check
    list($fromHour, $fromMin) = explode(':', $timeFrom);
    list($toHour, $toMin) = explode(':', $timeTo);
    $fromMinutes = (int)$fromHour * 60 + (int)$fromMin;
    $toMinutes = (int)$toHour * 60 + (int)$toMin;
    $toMinutesAdjusted = $toMinutes <= $fromMinutes ? $toMinutes + (24 * 60) : $toMinutes;
    
    if ($workerId) {
        // Get all entries for this worker on this date
        $overlapCheckStmt = $db->prepare("
            SELECT id, time_from, time_to
            FROM time_entries 
            WHERE entry_date = ? 
              AND worker_id = ?
        ");
        $overlapCheckStmt->execute([$data['entry_date'], $workerId]);
    } else {
        $overlapCheckStmt = $db->prepare("
            SELECT id, time_from, time_to
            FROM time_entries 
            WHERE entry_date = ? 
              AND worker_id IS NULL
              AND created_by = ?
        ");
        $overlapCheckStmt->execute([$data['entry_date'], $userId ?? $currentUser['id']]);
    }
    
    $existingEntries = $overlapCheckStmt->fetchAll();
    foreach ($existingEntries as $existing) {
        list($eFromHour, $eFromMin) = explode(':', $existing['time_from']);
        list($eToHour, $eToMin) = explode(':', $existing['time_to']);
        $eFromMinutes = (int)$eFromHour * 60 + (int)$eFromMin;
        $eToMinutes = (int)$eToHour * 60 + (int)$eToMin;
        $eToMinutesAdjusted = $eToMinutes <= $eFromMinutes ? $eToMinutes + (24 * 60) : $eToMinutes;
        
        // Overlap if: newStart < existingEnd AND newEnd > existingStart
        if ($fromMinutes < $eToMinutesAdjusted && $toMinutesAdjusted > $eFromMinutes) {
            sendJSON([
                'ok' => false,
                'error' => 'OVERLAP',
                'message' => 'Zeit überschneidet sich für diesen Mitarbeiter'
            ], 409);
        }
    }
    
    $overlapping = $overlapCheckStmt->fetch();
    if ($overlapping) {
        sendJSON([
            'ok' => false,
            'error' => 'OVERLAP',
            'message' => 'Zeit überschneidet sich für diesen Mitarbeiter'
        ], 409);
    }
    
    // Default status: PLANNED if admin, or if explicitly set
    $status = isset($data['status']) ? $data['status'] : 'PLANNED';
    $plannedBy = $isAdmin ? $currentUser['id'] : null;
    
    $entryId = $data['id'] ?? 'time-entry-' . uniqid();
    
    // Handle meta field (JSON)
    $meta = null;
    if (isset($data['meta']) && is_array($data['meta'])) {
        $meta = json_encode($data['meta']);
    } else if (isset($data['meta']) && is_string($data['meta'])) {
        // Already JSON string
        $meta = $data['meta'];
    }
    
    $stmt = $db->prepare("
        INSERT INTO time_entries (
            id, worker_id, location_id, entry_date, entry_type, category,
            time_from, time_to, hours, notes, status, planned_by,
            created_by, updated_by, meta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $entryType = $data['entry_type'] ?? 'BUERO_ALLGEMEIN';
    $category = $data['category'] ?? 'BUERO_ALLGEMEIN';
    $locationId = $data['location_id'] ?? null;
    $notes = $data['notes'] ?? '';
    
    try {
        $stmt->execute([
            $entryId,
            $workerId,
            $locationId,
            $data['entry_date'],
            $entryType,
            $category,
            $timeFrom,
            $timeTo,
            $hours,
            $notes,
            $status,
            $plannedBy,
            $currentUser['id'],
            $currentUser['id'],
            $meta
        ]);
        
        // Fetch created entry with meta parsed
        $createdStmt = $db->prepare("SELECT * FROM time_entries WHERE id = ?");
        $createdStmt->execute([$entryId]);
        $created = $createdStmt->fetch();
        
        if ($created && isset($created['meta']) && is_string($created['meta'])) {
            $created['meta'] = json_decode($created['meta'], true) ?: null;
        }
        
        sendJSON(['success' => true, 'id' => $entryId, 'data' => $created], 201);
    } catch (PDOException $e) {
        sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleUpdateTimeEntry($db, $id, $currentUser) {
    $data = getRequestData();
    
    // Get existing entry
    $stmt = $db->prepare("SELECT * FROM time_entries WHERE id = ?");
    $stmt->execute([$id]);
    $entry = $stmt->fetch();
    
    if (!$entry) {
        sendJSON(['success' => false, 'error' => 'Time entry not found'], 404);
    }
    
    // AuthZ: Admin can update all, Worker only own
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    
    if (!$isAdmin) {
        // Check if entry belongs to current user
        $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
        $userStmt->execute([$currentUser['id']]);
        $currentUserData = $userStmt->fetch();
        $currentWorkerId = $currentUserData['worker_id'] ?? null;
        
        if ($entry['worker_id'] !== $currentWorkerId && $entry['created_by'] !== $currentUser['id']) {
            sendJSON(['success' => false, 'error' => 'Permission denied: Can only update own entries'], 403);
        }
    }
    
    // Build update query
    $updates = [];
    $params = [];
    
    if (isset($data['entry_date'])) {
        $updates[] = "entry_date = ?";
        $params[] = $data['entry_date'];
    }
    if (isset($data['time_from'])) {
        $updates[] = "time_from = ?";
        $params[] = $data['time_from'];
    }
    if (isset($data['time_to'])) {
        $updates[] = "time_to = ?";
        $params[] = $data['time_to'];
    }
    if (isset($data['category'])) {
        $updates[] = "category = ?";
        $params[] = $data['category'];
    }
    if (isset($data['location_id'])) {
        $updates[] = "location_id = ?";
        $params[] = $data['location_id'];
    }
    if (isset($data['notes'])) {
        $updates[] = "notes = ?";
        $params[] = $data['notes'];
    }
    if (isset($data['status'])) {
        // Only admin can change status manually (except confirm/reject actions)
        if ($isAdmin) {
            $updates[] = "status = ?";
            $params[] = $data['status'];
        }
    }
    if (isset($data['meta'])) {
        // Handle meta field (JSON)
        $meta = is_array($data['meta']) ? json_encode($data['meta']) : $data['meta'];
        $updates[] = "meta = ?";
        $params[] = $meta;
    }
    
    // Recalculate hours if time changed
    $newTimeFrom = isset($data['time_from']) ? $data['time_from'] : $entry['time_from'];
    $newTimeTo = isset($data['time_to']) ? $data['time_to'] : $entry['time_to'];
    $newDate = isset($data['entry_date']) ? $data['entry_date'] : $entry['entry_date'];
    
    // FIX #3: Overlap Validation with midnight handling (excluding current entry)
    if (isset($data['time_from']) || isset($data['time_to']) || isset($data['entry_date'])) {
        // Convert times to minutes for proper overlap check
        list($newFromHour, $newFromMin) = explode(':', $newTimeFrom);
        list($newToHour, $newToMin) = explode(':', $newTimeTo);
        $newFromMinutes = (int)$newFromHour * 60 + (int)$newFromMin;
        $newToMinutes = (int)$newToHour * 60 + (int)$newToMin;
        $newToMinutesAdjusted = $newToMinutes <= $newFromMinutes ? $newToMinutes + (24 * 60) : $newToMinutes;
        
        if ($entry['worker_id']) {
            $overlapCheckStmt = $db->prepare("
                SELECT id, time_from, time_to
                FROM time_entries 
                WHERE id != ?
                  AND entry_date = ? 
                  AND worker_id = ?
            ");
            $overlapCheckStmt->execute([$id, $newDate, $entry['worker_id']]);
        } else {
            $overlapCheckStmt = $db->prepare("
                SELECT id, time_from, time_to
                FROM time_entries 
                WHERE id != ?
                  AND entry_date = ? 
                  AND worker_id IS NULL
                  AND created_by = ?
            ");
            $overlapCheckStmt->execute([$id, $newDate, $entry['created_by']]);
        }
        
        $existingEntries = $overlapCheckStmt->fetchAll();
        foreach ($existingEntries as $existing) {
            list($eFromHour, $eFromMin) = explode(':', $existing['time_from']);
            list($eToHour, $eToMin) = explode(':', $existing['time_to']);
            $eFromMinutes = (int)$eFromHour * 60 + (int)$eFromMin;
            $eToMinutes = (int)$eToHour * 60 + (int)$eToMin;
            $eToMinutesAdjusted = $eToMinutes <= $eFromMinutes ? $eToMinutes + (24 * 60) : $eToMinutes;
            
            // Overlap if: newStart < existingEnd AND newEnd > existingStart
            if ($newFromMinutes < $eToMinutesAdjusted && $newToMinutesAdjusted > $eFromMinutes) {
                sendJSON([
                    'ok' => false,
                    'error' => 'OVERLAP',
                    'message' => 'Zeit überschneidet sich für diesen Mitarbeiter'
                ], 409);
            }
        }
    }
    
    if (isset($data['time_from']) || isset($data['time_to'])) {
        $hours = calculateHours($newTimeFrom, $newTimeTo);
        $updates[] = "hours = ?";
        $params[] = $hours;
    }
    
    $updates[] = "updated_by = ?";
    $params[] = $currentUser['id'];
    
    if (empty($updates)) {
        sendJSON(['success' => false, 'error' => 'No fields to update'], 400);
    }
    
    $params[] = $id;
    $sql = "UPDATE time_entries SET " . implode(', ', $updates) . " WHERE id = ?";
    
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        // Fetch updated entry with meta parsed
        $updatedStmt = $db->prepare("SELECT * FROM time_entries WHERE id = ?");
        $updatedStmt->execute([$id]);
        $updated = $updatedStmt->fetch();
        
        if ($updated && isset($updated['meta']) && is_string($updated['meta'])) {
            $updated['meta'] = json_decode($updated['meta'], true) ?: null;
        }
        
        sendJSON(['success' => true, 'data' => $updated]);
    } catch (PDOException $e) {
        sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleDeleteTimeEntry($db, $id, $currentUser) {
    // Get existing entry
    $stmt = $db->prepare("SELECT * FROM time_entries WHERE id = ?");
    $stmt->execute([$id]);
    $entry = $stmt->fetch();
    
    if (!$entry) {
        sendJSON(['success' => false, 'error' => 'Time entry not found'], 404);
    }
    
    // AuthZ: Only admin can delete
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    
    if (!$isAdmin) {
        sendJSON(['success' => false, 'error' => 'Permission denied: Only admin can delete entries'], 403);
    }
    
    try {
        $stmt = $db->prepare("DELETE FROM time_entries WHERE id = ?");
        $stmt->execute([$id]);
        sendJSON(['success' => true]);
    } catch (PDOException $e) {
        sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleConfirmTimeEntry($db, $id, $currentUser) {
    // Get existing entry
    $stmt = $db->prepare("SELECT te.*, u.worker_id as user_worker_id 
                          FROM time_entries te
                          LEFT JOIN users u ON u.id = ?
                          WHERE te.id = ?");
    $stmt->execute([$currentUser['id'], $id]);
    $entry = $stmt->fetch();
    
    if (!$entry) {
        sendJSON(['success' => false, 'error' => 'Time entry not found'], 404);
    }
    
    // AuthZ: Worker can only confirm own entries
    $userWorkerId = $entry['user_worker_id'] ?? null;
    if ($entry['worker_id'] !== $userWorkerId && $entry['created_by'] !== $currentUser['id']) {
        sendJSON(['success' => false, 'error' => 'Permission denied: Can only confirm own entries'], 403);
    }
    
    // Update status
    try {
        $stmt = $db->prepare("
            UPDATE time_entries 
            SET status = 'CONFIRMED', 
                confirmed_at = NOW(), 
                confirmed_by = ?,
                updated_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$currentUser['id'], $currentUser['id'], $id]);
        
        sendJSON(['success' => true]);
    } catch (PDOException $e) {
        sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleRejectTimeEntry($db, $id, $currentUser) {
    // Get existing entry
    $stmt = $db->prepare("SELECT te.*, u.worker_id as user_worker_id 
                          FROM time_entries te
                          LEFT JOIN users u ON u.id = ?
                          WHERE te.id = ?");
    $stmt->execute([$currentUser['id'], $id]);
    $entry = $stmt->fetch();
    
    if (!$entry) {
        sendJSON(['success' => false, 'error' => 'Time entry not found'], 404);
    }
    
    // AuthZ: Worker can only reject own entries
    $userWorkerId = $entry['user_worker_id'] ?? null;
    if ($entry['worker_id'] !== $userWorkerId && $entry['created_by'] !== $currentUser['id']) {
        sendJSON(['success' => false, 'error' => 'Permission denied: Can only reject own entries'], 403);
    }
    
    // Update status
    try {
        $stmt = $db->prepare("
            UPDATE time_entries 
            SET status = 'REJECTED', 
                updated_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$currentUser['id'], $id]);
        
        sendJSON(['success' => true]);
    } catch (PDOException $e) {
        sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function calculateHours($timeFrom, $timeTo) {
    list($fromHour, $fromMin) = explode(':', $timeFrom);
    list($toHour, $toMin) = explode(':', $timeTo);
    
    $fromMinutes = (int)$fromHour * 60 + (int)$fromMin;
    $toMinutes = (int)$toHour * 60 + (int)$toMin;
    
    $diffMinutes = $toMinutes - $fromMinutes;
    if ($diffMinutes < 0) {
        $diffMinutes += 24 * 60; // Next day
    }
    
    return round($diffMinutes / 60, 2);
}

/**
 * PHASE 2: Admin-only cleanup helper to delete all PLANNED entries
 */
function handleAdminCleanupPlanned($method, $currentUser) {
    if ($method !== 'POST') {
        sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // AuthZ: Only admin can perform cleanup
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    if (!$isAdmin) {
        sendJSON(['success' => false, 'error' => 'Permission denied: Admin only'], 403);
    }

    $db = getDBConnection();

    try {
        $stmt = $db->prepare("DELETE FROM time_entries WHERE status = 'PLANNED'");
        $stmt->execute();
        $deletedCount = $stmt->rowCount();

        sendJSON([
            'ok' => true,
            'deleted_count' => $deletedCount
        ]);
    } catch (PDOException $e) {
        sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}
