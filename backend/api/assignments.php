<?php
/**
 * Assignments API
 */

function handleAssignments($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            // Get assignments with filters
            $locationId = $_GET['location_id'] ?? null;
            $workerId = $_GET['worker_id'] ?? null;
            $teamId = $_GET['team_id'] ?? null;
            $date = $_GET['date'] ?? null;
            $dateFrom = $_GET['date_from'] ?? null;
            $dateTo = $_GET['date_to'] ?? null;
            
            $sql = "SELECT * FROM assignments WHERE deleted_at IS NULL";
            $params = [];
            
            if ($locationId) {
                $sql .= " AND location_id = ?";
                $params[] = $locationId;
            }
            if ($workerId) {
                $sql .= " AND worker_id = ?";
                $params[] = $workerId;
            }
            if ($teamId) {
                $sql .= " AND team_id = ?";
                $params[] = $teamId;
            }
            if ($date) {
                $sql .= " AND assignment_date = ?";
                $params[] = $date;
            }
            if ($dateFrom) {
                $sql .= " AND assignment_date >= ?";
                $params[] = $dateFrom;
            }
            if ($dateTo) {
                $sql .= " AND assignment_date <= ?";
                $params[] = $dateTo;
            }
            
            $sql .= " ORDER BY assignment_date, time_from";
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $assignments = $stmt->fetchAll();
            
            sendJSON(['success' => true, 'data' => $assignments]);
            break;
            
        case 'POST':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            // Business Rule: location_id nur required wenn entry_type = BAUSTELLE
            // Prüfe assignment_date (immer required)
            if (empty($data['assignment_date'])) {
                sendJSON(['success' => false, 'error' => 'Datum ist erforderlich'], 400);
            }
            
            // Can assign either worker or team, not both
            if (empty($data['worker_id']) && empty($data['team_id'])) {
                sendJSON(['success' => false, 'error' => 'Worker ID or Team ID required'], 400);
            }
            
            try {
                // Business Rule: location_id nur required wenn entry_type = BAUSTELLE
                $entryType = $data['entry_type'] ?? 'BAUSTELLE';
                $locationId = ($entryType === 'BAUSTELLE') ? ($data['location_id'] ?? null) : null;
                
                if ($entryType === 'BAUSTELLE' && empty($locationId)) {
                    sendJSON(['success' => false, 'error' => 'Baustelle muss ausgewählt werden (Pflichtfeld für BAUSTELLE-Einträge)'], 400);
                }
                
                if (!empty($data['worker_id'])) {
                    // Assign worker
                    $stmt = $db->prepare("
                        INSERT INTO assignments (location_id, entry_type, worker_id, assignment_date, time_from, time_to)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE time_from = VALUES(time_from), time_to = VALUES(time_to)
                    ");
                    
                    $stmt->execute([
                        $locationId,
                        $entryType,
                        $data['worker_id'],
                        $data['assignment_date'],
                        $data['time_from'] ?? null,
                        $data['time_to'] ?? null
                    ]);
                } else {
                    // Assign team - create assignments for all team members
                    $teamId = $data['team_id'];
                    
                    // Get team members
                    $stmt = $db->prepare("SELECT worker_id FROM team_members WHERE team_id = ?");
                    $stmt->execute([$teamId]);
                    $memberIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    
                    if (empty($memberIds)) {
                        sendJSON(['success' => false, 'error' => 'Team has no members'], 400);
                    }
                    
                    // Create assignment for each team member
                    $stmt = $db->prepare("
                        INSERT INTO assignments (location_id, entry_type, worker_id, team_id, assignment_date, time_from, time_to)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE time_from = VALUES(time_from), time_to = VALUES(time_to)
                    ");
                    
                    foreach ($memberIds as $workerId) {
                        try {
                            $stmt->execute([
                                $locationId,
                                $entryType,
                                $workerId,
                                $teamId,
                                $data['assignment_date'],
                                $data['time_from'] ?? null,
                                $data['time_to'] ?? null
                            ]);
                        } catch (PDOException $e) {
                            // Ignore duplicates
                        }
                    }
                }
                
                sendJSON(['success' => true], 201);
            } catch (PDOException $e) {
                sendJSON(['success' => false, 'error' => $e->getMessage()], 400);
            }
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Assignment ID required'], 400);
            }
            
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            $updates = [];
            $params = [];
            
            if (isset($data['assignment_date'])) {
                $updates[] = "assignment_date = ?";
                $params[] = $data['assignment_date'];
            }
            if (isset($data['time_from'])) {
                $updates[] = "time_from = ?";
                $params[] = $data['time_from'];
            }
            if (isset($data['time_to'])) {
                $updates[] = "time_to = ?";
                $params[] = $data['time_to'];
            }
            
            if (empty($updates)) {
                sendJSON(['success' => false, 'error' => 'No fields to update'], 400);
            }
            
            $params[] = $id;
            $sql = "UPDATE assignments SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            sendJSON(['success' => true]);
            break;
            
        case 'DELETE':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            // Delete assignment or all assignments for location/date/worker combination
            $data = getRequestData();
            
            // Check if data is sent via POST with _method=DELETE (for browsers that don't support DELETE body)
            if (empty($data) && $_SERVER['REQUEST_METHOD'] === 'POST') {
                $rawData = file_get_contents('php://input');
                $data = json_decode($rawData, true) ?? [];
                if (isset($data['_method']) && $data['_method'] === 'DELETE') {
                    unset($data['_method']);
                }
            }
            
            if (!empty($data['location_id']) && !empty($data['assignment_date'])) {
                $sql = "DELETE FROM assignments WHERE location_id = ? AND assignment_date = ?";
                $params = [$data['location_id'], $data['assignment_date']];
                
                if (!empty($data['worker_id'])) {
                    $sql .= " AND worker_id = ?";
                    $params[] = $data['worker_id'];
                } elseif (!empty($data['team_id'])) {
                    $sql .= " AND team_id = ?";
                    $params[] = $data['team_id'];
                }
                
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            } elseif ($id) {
                // Delete by ID
                $stmt = $db->prepare("DELETE FROM assignments WHERE id = ?");
                $stmt->execute([$id]);
            } else {
                sendJSON(['success' => false, 'error' => 'Assignment ID or location/date required'], 400);
            }
            
            sendJSON(['success' => true]);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

