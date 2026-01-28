<?php
/**
 * Admin Overview API
 * Returns aggregated time entry data for admin overview grid
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/time_entries.php'; // Include calculateHours function

function handleAdminOverview($method, $currentUser) {
    // AuthZ: Only admin can access
    $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
    
    if (!$isAdmin) {
        sendJSON(['success' => false, 'error' => 'Permission denied: Admin only'], 403);
    }
    
    if ($method !== 'GET') {
        sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
    
    $db = getDBConnection();
    $params = $_GET;
    
    // Get date range (default: current week)
    $dateFrom = $params['date_from'] ?? null;
    $dateTo = $params['date_to'] ?? null;
    
    if (!$dateFrom || !$dateTo) {
        // Default to current week
        $today = new DateTime();
        $dayOfWeek = $today->format('w'); // 0 = Sunday, 1 = Monday
        $daysFromMonday = $dayOfWeek == 0 ? 6 : $dayOfWeek - 1;
        $monday = clone $today;
        $monday->modify("-{$daysFromMonday} days");
        $sunday = clone $monday;
        $sunday->modify('+6 days');
        
        $dateFrom = $monday->format('Y-m-d');
        $dateTo = $sunday->format('Y-m-d');
    }
    
    // Get all users (inkl. solcher ohne worker_id), damit jeder Owner im Teamkalender abgebildet werden kann
    $usersStmt = $db->prepare("
        SELECT u.id, u.name, u.weekly_hours_target, u.worker_id, w.name as worker_name
        FROM users u
        LEFT JOIN workers w ON u.worker_id = w.id
        ORDER BY u.name
    ");
    $usersStmt->execute();
    $users = $usersStmt->fetchAll();
    
    // Get time entries for date range with berechnetem user_id (Owner)
    // FIX #1: Include entries by worker_id OR created_by (owner identification)
    $entriesStmt = $db->prepare("
        SELECT te.*, 
               l.code as location_code,
               l.address as location_address,
               COALESCE(u1.id, u2.id) as user_id,
               u1.id as worker_user_id,
               u2.id as created_by_user_id
        FROM time_entries te
        LEFT JOIN locations l ON te.location_id = l.id
        LEFT JOIN users u1 ON te.worker_id = u1.worker_id
        LEFT JOIN users u2 ON te.created_by = u2.id AND te.worker_id IS NULL
        WHERE te.entry_date >= ? AND te.entry_date <= ?
        ORDER BY COALESCE(u1.id, u2.id), te.entry_date, te.time_from
    ");
    $entriesStmt->execute([$dateFrom, $dateTo]);
    $entries = $entriesStmt->fetchAll();
    
    // Aggregate by user and day
    $result = [];
    
    foreach ($users as $user) {
        $workerId = $user['worker_id'];
        $userId = $user['id'];
        // FIX #1: Filter by worker_id OR created_by (if no worker_id)
        $userEntries = array_filter($entries, function($e) use ($workerId, $userId) {
            return ($e['worker_id'] === $workerId) || 
                   ($e['worker_id'] === null && $e['created_by'] === $userId);
        });
        
        // Group by day
        $days = [];
        $projectCodes = []; // Track project codes for summary
        
        foreach ($userEntries as $entry) {
            $day = $entry['entry_date'];
            if (!isset($days[$day])) {
                $days[$day] = [
                    'hours' => 0,
                    'planned' => 0,
                    'confirmed' => 0,
                    'projects' => []
                ];
            }
            
            // FIX #4: Calculate hours from time_from/time_to (single source of truth)
            // Use calculateHours helper (handles midnight) if time_from/time_to exist, else use entry.hours
            if ($entry['time_from'] && $entry['time_to']) {
                $hours = calculateHours($entry['time_from'], $entry['time_to']);
            } else {
                $hours = (float)$entry['hours'];
            }
            $days[$day]['hours'] += $hours;
            
            if ($entry['status'] === 'PLANNED') {
                $days[$day]['planned'] += $hours;
            } elseif ($entry['status'] === 'CONFIRMED') {
                $days[$day]['confirmed'] += $hours;
            }
            
            // Track project codes
            if ($entry['location_code']) {
                $code = $entry['location_code'];
                if (!in_array($code, $projectCodes)) {
                    $projectCodes[] = $code;
                }
                if (!in_array($code, $days[$day]['projects'])) {
                    $days[$day]['projects'][] = $code;
                }
            }
        }
        
        // Calculate week totals
        $weekHours = array_sum(array_column($days, 'hours'));
        $weekPlanned = array_sum(array_column($days, 'planned'));
        $weekConfirmed = array_sum(array_column($days, 'confirmed'));
        $weeklyTarget = (float)($user['weekly_hours_target'] ?? 42.5);
        
        // Generate initials from name
        $nameParts = explode(' ', $user['name']);
        $initials = '';
        foreach ($nameParts as $part) {
            if (!empty($part)) {
                $initials .= mb_substr($part, 0, 1, 'UTF-8');
            }
        }
        $initials = mb_substr($initials, 0, 3, 'UTF-8'); // Max 3 chars
        
        $result[] = [
            'user_id' => $user['id'],
            'worker_id' => $workerId,
            'name' => $user['name'],
            'initials' => strtoupper($initials),
            'weekly_target' => $weeklyTarget,
            'week_total' => round($weekHours, 2),
            'week_planned' => round($weekPlanned, 2),
            'week_confirmed' => round($weekConfirmed, 2),
            'days' => $days,
            'top_projects' => array_slice($projectCodes, 0, 2) // Top 2 projects
        ];
    }
    
    // Format response compatible with frontend
    $usersList = [];
    $entriesList = [];
    
    foreach ($result as $userData) {
        $usersList[] = [
            'id' => $userData['user_id'],
            'name' => $userData['name'],
            'initials' => $userData['initials'],
            'weekly_hours_target' => $userData['weekly_target']
        ];
    }
    
    // Flatten entries for frontend – nur Einträge mit gültigem Owner (user_id) berücksichtigen
    foreach ($entries as $entry) {
        // Wenn kein user_id ermittelt werden konnte, ist das ein Datenintegritätsproblem.
        // Für das UI überspringen wir diese Einträge, damit keine "unknown_*" Gruppierung entsteht.
        if (!isset($entry['user_id']) || !$entry['user_id']) {
            // Optional: hier könnte serverseitig geloggt werden (error_log), wird aber aus Performancegründen weggelassen.
            continue;
        }

        $entriesList[] = [
            'id' => $entry['id'],
            'user_id' => $entry['user_id'],
            'date' => $entry['entry_date'],
            'time_from' => $entry['time_from'],
            'time_to' => $entry['time_to'],
            'project_id' => $entry['location_id'],
            'project_code' => $entry['location_code'] ?? null,
            'project_name' => $entry['location_address'] ?? null,
            'category' => $entry['category'],
            'status' => $entry['status']
        ];
    }
    
    sendJSON([
        'ok' => true,
        'success' => true,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'users' => $usersList,
        'entries' => $entriesList,
        'data' => $result // Keep aggregated format for backward compatibility
    ]);
}

