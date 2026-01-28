<?php
/**
 * Admin Overview API
 * Returns aggregated time entry data for admin overview grid
 */

require_once __DIR__ . '/../config.php';

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
    
    // Get all users with worker_id
    $usersStmt = $db->prepare("
        SELECT u.id, u.name, u.weekly_hours_target, u.worker_id, w.name as worker_name
        FROM users u
        LEFT JOIN workers w ON u.worker_id = w.id
        WHERE u.worker_id IS NOT NULL
        ORDER BY u.name
    ");
    $usersStmt->execute();
    $users = $usersStmt->fetchAll();
    
    // Get time entries for date range
    $entriesStmt = $db->prepare("
        SELECT te.*, l.code as location_code
        FROM time_entries te
        LEFT JOIN locations l ON te.location_id = l.id
        WHERE te.entry_date >= ? AND te.entry_date <= ?
        ORDER BY te.worker_id, te.entry_date, te.time_from
    ");
    $entriesStmt->execute([$dateFrom, $dateTo]);
    $entries = $entriesStmt->fetchAll();
    
    // Aggregate by user and day
    $result = [];
    
    foreach ($users as $user) {
        $workerId = $user['worker_id'];
        $userEntries = array_filter($entries, function($e) use ($workerId) {
            return $e['worker_id'] === $workerId;
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
            
            $hours = (float)$entry['hours'];
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
    
    sendJSON([
        'success' => true,
        'data' => $result,
        'date_from' => $dateFrom,
        'date_to' => $dateTo
    ]);
}

