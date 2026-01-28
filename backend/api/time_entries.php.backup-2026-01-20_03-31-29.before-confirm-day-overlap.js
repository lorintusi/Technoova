<?php
/**
 * Time Entries API
 * Handles time entry planning (Admin) and confirmation (Worker)
 */

require_once __DIR__ . '/../config.php';

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
    
    // Normalize field names for frontend
    foreach ($entries as &$entry) {
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
    
    // Default status: PLANNED if admin, or if explicitly set
    $status = isset($data['status']) ? $data['status'] : 'PLANNED';
    $plannedBy = $isAdmin ? $currentUser['id'] : null;
    
    $entryId = $data['id'] ?? 'time-entry-' . uniqid();
    
    $stmt = $db->prepare("
        INSERT INTO time_entries (
            id, worker_id, location_id, entry_date, entry_type, category,
            time_from, time_to, hours, notes, status, planned_by,
            created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            $currentUser['id']
        ]);
        
        sendJSON(['success' => true, 'id' => $entryId], 201);
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
    
    // Recalculate hours if time changed
    if (isset($data['time_from']) || isset($data['time_to'])) {
        $timeFrom = $data['time_from'] ?? $entry['time_from'];
        $timeTo = $data['time_to'] ?? $entry['time_to'];
        $hours = calculateHours($timeFrom, $timeTo);
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
        sendJSON(['success' => true]);
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
