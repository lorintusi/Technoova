<?php
/**
 * Confirm Dispatch Day Endpoint
 * Idempotent: Converts dispatch items to time entries for a specific day
 * Returns transparent response with created/skipped counts
 */

require_once __DIR__ . '/../config.php';

function handleConfirmDispatchDay($currentUser) {
    $db = getDBConnection();
    $data = getRequestData();
    
    // Validate date
    $date = $data['date'] ?? null;
    if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        sendJSON(['success' => false, 'error' => 'Invalid date format. Expected YYYY-MM-DD'], 400);
    }
    
    // Validate date is valid
    $dateObj = DateTime::createFromFormat('Y-m-d', $date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
        sendJSON(['success' => false, 'error' => 'Invalid date'], 400);
    }
    
    // Get worker_id from request or current user
    $requestWorkerId = $data['worker_id'] ?? null;
    
    // Permission check
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    
    // Get current user's worker_id
    $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
    $userStmt->execute([$currentUser['id']]);
    $userData = $userStmt->fetch();
    $currentWorkerId = $userData['worker_id'] ?? null;
    
    // Determine target worker_id
    $workerId = null;
    if ($requestWorkerId && $isAdmin) {
        // Admin can confirm for any worker
        $workerId = $requestWorkerId;
    } else {
        // Worker can only confirm for themselves
        if ($requestWorkerId && $requestWorkerId !== $currentWorkerId) {
            sendJSON(['success' => false, 'error' => 'Permission denied: Can only confirm for yourself'], 403);
        }
        $workerId = $currentWorkerId;
    }
    
    if (!$workerId) {
        sendJSON(['success' => false, 'error' => 'Worker ID required'], 400);
    }
    
    // Get dispatch items for this day and worker
    $stmt = $db->prepare("
        SELECT di.* 
        FROM dispatch_items di
        INNER JOIN dispatch_assignments da ON di.id = da.dispatch_item_id
        WHERE di.date = ? 
        AND da.resource_type = 'WORKER'
        AND da.resource_id = ?
        AND di.status = 'PLANNED'
    ");
    $stmt->execute([$date, $workerId]);
    $dispatchItems = $stmt->fetchAll();
    
    if (empty($dispatchItems)) {
        sendJSON([
            'success' => true,
            'created' => 0,
            'skipped' => 0,
            'details' => [],
            'message' => 'Keine geplanten Einsätze für diesen Tag'
        ]);
    }
    
    // Get default work hours
    $workdayStart = '08:00';
    $workdayEnd = '16:30';
    
    // Process each dispatch item (idempotent)
    $created = 0;
    $skipped = 0;
    $details = [];
    
    foreach ($dispatchItems as $dispatchItem) {
        $dispatchItemId = $dispatchItem['id'];
        
        // IDEMPOTENCY CHECK: Check if time entry already exists with meta.sourceDispatchItemId
        $checkStmt = $db->prepare("
            SELECT id 
            FROM time_entries 
            WHERE entry_date = ? 
            AND worker_id = ?
            AND JSON_EXTRACT(meta, '$.sourceDispatchItemId') = ?
        ");
        $checkStmt->execute([$date, $workerId, $dispatchItemId]);
        $existingTimeEntry = $checkStmt->fetch();
        
        if ($existingTimeEntry) {
            // Already confirmed, skip (idempotent)
            $skipped++;
            $details[] = [
                'dispatchItemId' => $dispatchItemId,
                'status' => 'skipped',
                'timeEntryId' => $existingTimeEntry['id'],
                'reason' => 'Time entry already exists'
            ];
            continue;
        }
        
        // Determine time from dispatch item
        $timeFrom = $workdayStart;
        $timeTo = $workdayEnd;
        
        if (!$dispatchItem['all_day']) {
            if ($dispatchItem['start_time']) {
                $timeFrom = $dispatchItem['start_time'];
            }
            if ($dispatchItem['end_time']) {
                $timeTo = $dispatchItem['end_time'];
            }
        }
        
        // Calculate hours
        $fromParts = explode(':', $timeFrom);
        $toParts = explode(':', $timeTo);
        $fromMinutes = (int)$fromParts[0] * 60 + (int)$fromParts[1];
        $toMinutes = (int)$toParts[0] * 60 + (int)$toParts[1];
        $hours = ($toMinutes - $fromMinutes) / 60.0;
        
        // Create time entry with meta.sourceDispatchItemId
        $timeEntryId = 'te-' . uniqid();
        $meta = json_encode([
            'sourceDispatchItemId' => $dispatchItemId,
            'createdFromDispatchAt' => date('Y-m-d H:i:s'),
            'createdFromDispatchByUserId' => $currentUser['id']
        ]);
        
        $insertStmt = $db->prepare("
            INSERT INTO time_entries (
                id, worker_id, location_id, entry_date, entry_type, category,
                time_from, time_to, hours, notes, status, planned_by, created_by, updated_by, meta
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?)
        ");
        
        try {
            $insertStmt->execute([
                $timeEntryId,
                $workerId,
                $dispatchItem['location_id'],
                $date,
                $dispatchItem['category'] ?? 'PROJEKT',
                $dispatchItem['category'] ?? 'PROJEKT',
                $timeFrom,
                $timeTo,
                $hours,
                $dispatchItem['note'] ?? '',
                $currentUser['id'],
                $currentUser['id'],
                $currentUser['id'],
                $meta
            ]);
            
            $created++;
            $details[] = [
                'dispatchItemId' => $dispatchItemId,
                'status' => 'created',
                'timeEntryId' => $timeEntryId
            ];
            
            // Update dispatch item status to CONFIRMED
            $updateStmt = $db->prepare("UPDATE dispatch_items SET status = 'CONFIRMED' WHERE id = ?");
            $updateStmt->execute([$dispatchItemId]);
            
        } catch (PDOException $e) {
            // Log error but continue with other items
            error_log("Error creating time entry for dispatch item {$dispatchItemId}: " . $e->getMessage());
            $details[] = [
                'dispatchItemId' => $dispatchItemId,
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }
    
    sendJSON([
        'success' => true,
        'created' => $created,
        'skipped' => $skipped,
        'details' => $details,
        'date' => $date,
        'workerId' => $workerId
    ]);
}

