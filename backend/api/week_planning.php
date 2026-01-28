<?php
/**
 * Week Planning API
 * Wochenplanung / Einsatzplanung für Personal
 */

function handleWeekPlanning($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get week planning data for a worker
            $workerId = $_GET['worker_id'] ?? null;
            $week = $_GET['week'] ?? null;
            $year = $_GET['year'] ?? null;
            $dateFrom = $_GET['date_from'] ?? null;
            $dateTo = $_GET['date_to'] ?? null;
            
            // Check permissions: worker can only see own planning, admin/dispo can see all
            $currentWorkerId = $currentUser['worker_id'] ?? null;
            $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
            
            if (!$isAdmin && empty($currentWorkerId)) {
                sendJSON(['success' => false, 'error' => 'No worker ID associated with user'], 403);
            }
            
            if (!$isAdmin && $workerId && $workerId !== $currentWorkerId) {
                sendJSON(['success' => false, 'error' => 'Permission denied: can only view own planning'], 403);
            }
            
            // Use worker's own ID if not admin and no worker_id provided
            if (!$isAdmin && !$workerId) {
                $workerId = $currentWorkerId;
            }
            
            if (!$workerId) {
                sendJSON(['success' => false, 'error' => 'Worker ID required'], 400);
            }
            
            // Calculate date range from week/year if provided
            if ($week && $year) {
                $dateFrom = getWeekStartDate($week, $year);
                $dateTo = getWeekEndDate($week, $year);
            }
            
            if (!$dateFrom || !$dateTo) {
                sendJSON(['success' => false, 'error' => 'Date range or week/year required'], 400);
            }
            
            // Try to get planning_entries first (new system)
            $planningEntries = [];
            try {
                $planningStmt = $db->prepare("
                    SELECT 
                        pe.*,
                        l.code as location_code,
                        l.address as location_address,
                        l.resources_required as location_resources_required
                    FROM planning_entries pe
                    LEFT JOIN locations l ON pe.location_id = l.id
                    WHERE pe.worker_id = ? 
                      AND pe.date >= ? 
                      AND pe.date <= ?
                    ORDER BY pe.date, pe.start_time
                ");
                $planningStmt->execute([$workerId, $dateFrom, $dateTo]);
                $planningEntries = $planningStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Normalize planning entries
                foreach ($planningEntries as &$entry) {
                    $entry['all_day'] = (bool)$entry['all_day'];
                    $entry['resources_required'] = $entry['location_resources_required'] 
                        ? json_decode($entry['location_resources_required'], true) 
                        : [];
                    unset($entry['location_resources_required']);
                }
            } catch (PDOException $e) {
                // planning_entries table might not exist yet, fall back to assignments
                $planningEntries = [];
            }
            
            // Fallback to assignments (old system) if no planning entries found
            if (empty($planningEntries)) {
                // Get assignments for this week and worker
                try {
                    $db->query("SELECT entry_type FROM assignments LIMIT 1");
                } catch (PDOException $e) {
                    // Column doesn't exist yet (before migration), that's ok
                }
                
                $stmt = $db->prepare("
                    SELECT a.*, l.code as location_code, l.description as location_name,
                           COALESCE(a.entry_type, 
                               CASE WHEN a.location_id IS NOT NULL THEN 'BAUSTELLE' ELSE 'BUERO_ALLGEMEIN' END
                           ) as entry_type
                    FROM assignments a
                    LEFT JOIN locations l ON a.location_id = l.id
                    WHERE a.worker_id = ? 
                      AND a.assignment_date >= ? 
                      AND a.assignment_date <= ?
                      AND a.deleted_at IS NULL
                    ORDER BY a.assignment_date, a.entry_type, a.location_id
                ");
                $stmt->execute([$workerId, $dateFrom, $dateTo]);
                $assignments = $stmt->fetchAll();
            } else {
                $assignments = [];
            }
            
            // Group by entry type and location for grid display
            $gridData = [];
            foreach ($assignments as $assignment) {
                // Determine entry type: check entry_type column if it exists, otherwise derive from location_id
                $entryType = null;
                if (isset($assignment['entry_type']) && $assignment['entry_type']) {
                    $entryType = $assignment['entry_type'];
                } else {
                    // Fallback: derive from location_id (for backward compatibility)
                    $entryType = $assignment['location_id'] ? 'BAUSTELLE' : 'BUERO_ALLGEMEIN';
                }
                
                // Normalize entry type values
                if ($entryType === 'BÜRO_ALLGEMEIN') {
                    $entryType = 'BUERO_ALLGEMEIN'; // Use consistent naming
                }
                
                // For BAUSTELLE, use location_id as key
                // For others, use entry_type
                $key = $entryType === 'BAUSTELLE' 
                    ? 'BAUSTELLE_' . $assignment['location_id']
                    : $entryType;
                
                if (!isset($gridData[$key])) {
                    $gridData[$key] = [
                        'type' => $entryType,
                        'location_id' => $assignment['location_id'] ?? null,
                        'location_code' => $assignment['location_code'] ?? null,
                        'location_name' => $assignment['location_name'] ?? null,
                        'days' => []
                    ];
                }
                
                // Calculate hours from time_from and time_to
                $hours = 0;
                if ($assignment['time_from'] && $assignment['time_to']) {
                    $from = strtotime($assignment['time_from']);
                    $to = strtotime($assignment['time_to']);
                    $hours = ($to - $from) / 3600; // Convert seconds to hours
                }
                
                $gridData[$key]['days'][$assignment['assignment_date']] = [
                    'id' => $assignment['id'],
                    'assignment_uid' => $assignment['assignment_uid'] ?? null,
                    'hours' => round($hours, 2),
                    'time_from' => $assignment['time_from'],
                    'time_to' => $assignment['time_to']
                ];
            }
            
            // Return planning entries if available, otherwise assignments
            if (!empty($planningEntries)) {
                sendJSON([
                    'success' => true,
                    'data' => $planningEntries,
                    'range' => ['from' => $dateFrom, 'to' => $dateTo],
                    'worker_id' => $workerId
                ]);
            } else {
                sendJSON([
                    'success' => true,
                    'data' => array_values($gridData),
                    'range' => ['from' => $dateFrom, 'to' => $dateTo],
                    'worker_id' => $workerId
                ]);
            }
            break;
            
        case 'POST':
            // Save week planning (batch operation) - DIFF/UPSERT statt DELETE-ALL
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            require_once __DIR__ . '/../services/AssignmentService.php';
            
            $data = getRequestData();
            $workerId = $data['worker_id'] ?? null;
            $weekData = $data['week_data'] ?? [];
            $dateFrom = $data['date_from'] ?? null;
            $dateTo = $data['date_to'] ?? null;
            
            // Check permissions
            $currentWorkerId = $currentUser['worker_id'] ?? null;
            $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
            
            if (!$isAdmin && $workerId && $workerId !== $currentWorkerId) {
                sendJSON(['success' => false, 'error' => 'Permission denied: can only edit own planning'], 403);
            }
            
            if (!$workerId || !$dateFrom || !$dateTo) {
                sendJSON(['success' => false, 'error' => 'Worker ID and date range required'], 400);
            }
            
            // Validate: BAUSTELLE rows must have location_id
            foreach ($weekData as $row) {
                if ($row['type'] === 'BAUSTELLE' && empty($row['location_id'])) {
                    sendJSON([
                        'success' => false, 
                        'error' => 'Baustelle muss ausgewählt werden (Pflichtfeld).'
                    ], 400);
                }
            }
            
            try {
                // Konvertiere weekData zu Assignment-Format für Service
                $dates = getDateRange($dateFrom, $dateTo);
                $payloadAssignments = [];
                
                foreach ($weekData as $row) {
                    $entryType = $row['type'];
                    $locationId = $row['location_id'] ?? null;
                    
                    foreach ($dates as $date) {
                        $dayData = $row['days']?.[$date] ?? null;
                        $hours = isset($dayData['hours']) ? (float)$dayData['hours'] : 0;
                        
                        if ($hours > 0) {
                            // Zeit berechnen
                            $timeFrom = $dayData['time_from'] ?? '08:00:00';
                            $timeTo = $dayData['time_to'] ?? date('H:i:s', strtotime("08:00:00 +{$hours} hours"));
                            
                            // Wenn nur hours gesetzt, aus hours berechnen
                            if (!isset($dayData['time_from']) && !isset($dayData['time_to'])) {
                                $timeFrom = '08:00:00';
                                $timeTo = date('H:i:s', strtotime("08:00:00 +{$hours} hours"));
                            }
                            
                            $assignment = [
                                'assignment_uid' => $dayData['assignment_uid'] ?? null,
                                'id' => $dayData['id'] ?? null,
                                'type' => $entryType,
                                'location_id' => ($entryType === 'BAUSTELLE') ? $locationId : null,
                                'assignment_date' => $date,
                                'time_from' => $timeFrom,
                                'time_to' => $timeTo
                            ];
                            
                            $payloadAssignments[] = $assignment;
                        }
                    }
                }
                
                // Nutze AssignmentService für Diff/Upsert
                $service = new AssignmentService($db);
                $result = $service->upsertAssignmentsForRange(
                    $dateFrom, 
                    $dateTo, 
                    $workerId, 
                    $payloadAssignments, 
                    $currentUser['id']
                );
                
                sendJSON([
                    'success' => true,
                    'message' => sprintf("%d erstellt, %d aktualisiert, %d gelöscht", 
                        $result['created'], $result['updated'], $result['deleted']),
                    'created' => $result['created'],
                    'updated' => $result['updated'],
                    'deleted' => $result['deleted']
                ]);
                
            } catch (Exception $e) {
                sendJSON(['success' => false, 'error' => $e->getMessage()], 400);
            }
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

function getWeekStartDate($week, $year) {
    $date = new DateTime();
    $date->setISODate($year, $week, 1);
    return $date->format('Y-m-d');
}

function getWeekEndDate($week, $year) {
    $date = new DateTime();
    $date->setISODate($year, $week, 7);
    return $date->format('Y-m-d');
}

function getDateRange($from, $to) {
    $dates = [];
    $start = new DateTime($from);
    $end = new DateTime($to);
    $end->modify('+1 day');
    
    $period = new DatePeriod($start, new DateInterval('P1D'), $end);
    foreach ($period as $date) {
        $dates[] = $date->format('Y-m-d');
    }
    
    return $dates;
}

