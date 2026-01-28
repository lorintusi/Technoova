<?php
/**
 * Workers API
 */

function handleWorkers($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // Get single worker
                $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
                $stmt->execute([$id]);
                $worker = $stmt->fetch();
                
                if (!$worker) {
                    sendJSON(['success' => false, 'error' => 'Worker not found'], 404);
                }
                
                // Get availability/assignments
                $worker['availability'] = getWorkerAvailability($db, $id);
                
                sendJSON(['success' => true, 'data' => $worker]);
            } else {
                // Get all workers
                $stmt = $db->query("SELECT * FROM workers ORDER BY name");
                $workers = $stmt->fetchAll();
                
                foreach ($workers as &$worker) {
                    $worker['availability'] = getWorkerAvailability($db, $worker['id']);
                }
                
                sendJSON(['success' => true, 'data' => $workers]);
            }
            break;
            
        case 'POST':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            if (empty($data['name'])) {
                sendJSON(['success' => false, 'error' => 'Name required'], 400);
            }
            
            $workerId = $data['id'] ?? 'worker-' . uniqid();
            
            $stmt = $db->prepare("
                INSERT INTO workers (id, name, role, company, team_id, status, contact_phone, contact_email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $workerId,
                $data['name'],
                $data['role'] ?? null,
                $data['company'] ?? null,
                $data['team_id'] ?? null,
                $data['status'] ?? 'Arbeitsbereit',
                $data['contact']['phone'] ?? null,
                $data['contact']['email'] ?? null
            ]);
            
            sendJSON(['success' => true, 'id' => $workerId], 201);
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Worker ID required'], 400);
            }
            
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            $updates = [];
            $params = [];
            
            if (isset($data['name'])) {
                $updates[] = "name = ?";
                $params[] = $data['name'];
            }
            if (isset($data['role'])) {
                $updates[] = "role = ?";
                $params[] = $data['role'];
            }
            if (isset($data['company'])) {
                $updates[] = "company = ?";
                $params[] = $data['company'];
            }
            if (isset($data['team_id'])) {
                $updates[] = "team_id = ?";
                $params[] = $data['team_id'];
            }
            if (isset($data['status'])) {
                $updates[] = "status = ?";
                $params[] = $data['status'];
            }
            if (isset($data['contact']['phone'])) {
                $updates[] = "contact_phone = ?";
                $params[] = $data['contact']['phone'];
            }
            if (isset($data['contact']['email'])) {
                $updates[] = "contact_email = ?";
                $params[] = $data['contact']['email'];
            }
            
            if (empty($updates)) {
                sendJSON(['success' => false, 'error' => 'No fields to update'], 400);
            }
            
            $params[] = $id;
            $sql = "UPDATE workers SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            sendJSON(['success' => true]);
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Worker ID required'], 400);
            }
            
            if (!hasPermission($currentUser, 'Verwalten')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $stmt = $db->prepare("DELETE FROM workers WHERE id = ?");
            $stmt->execute([$id]);
            
            sendJSON(['success' => true]);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

function getWorkerAvailability($db, $workerId) {
    $stmt = $db->prepare("
        SELECT a.*, l.code as site, l.address
        FROM assignments a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.worker_id = ? AND a.assignment_date >= CURDATE()
        ORDER BY a.assignment_date, a.time_from
    ");
    $stmt->execute([$workerId]);
    $assignments = $stmt->fetchAll();
    
    // Format as availability array
    $availability = [];
    foreach ($assignments as $assignment) {
        $dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        $dayOfWeek = (int)date('w', strtotime($assignment['assignment_date']));
        
        $availability[] = [
            'day' => $dayNames[$dayOfWeek],
            'from' => $assignment['time_from'] ? substr($assignment['time_from'], 0, 5) : null,
            'to' => $assignment['time_to'] ? substr($assignment['time_to'], 0, 5) : null,
            'site' => $assignment['site'] ?? $assignment['address'],
            'date' => $assignment['assignment_date']
        ];
    }
    
    return $availability;
}

