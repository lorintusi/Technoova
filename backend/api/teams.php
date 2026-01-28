<?php
/**
 * Teams API
 */

function handleTeams($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // Get single team with members
                $stmt = $db->prepare("SELECT * FROM teams WHERE id = ?");
                $stmt->execute([$id]);
                $team = $stmt->fetch();
                
                if (!$team) {
                    sendJSON(['success' => false, 'error' => 'Team not found'], 404);
                }
                
                // Get team members
                $team['members'] = getTeamMembers($db, $id);
                $team['contact'] = [
                    'phone' => $team['contact_phone'],
                    'email' => $team['contact_email'],
                    'address' => $team['contact_address']
                ];
                unset($team['contact_phone'], $team['contact_email'], $team['contact_address']);
                
                sendJSON(['success' => true, 'data' => $team]);
            } else {
                // Get all teams
                $stmt = $db->query("SELECT * FROM teams WHERE is_active = 1 ORDER BY name");
                $teams = $stmt->fetchAll();
                
                foreach ($teams as &$team) {
                    $team['members'] = getTeamMembers($db, $team['id']);
                    $team['contact'] = [
                        'phone' => $team['contact_phone'],
                        'email' => $team['contact_email'],
                        'address' => $team['contact_address']
                    ];
                    unset($team['contact_phone'], $team['contact_email'], $team['contact_address']);
                }
                
                sendJSON(['success' => true, 'data' => $teams]);
            }
            break;
            
        case 'POST':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            if (empty($data['name']) || empty($data['company'])) {
                sendJSON(['success' => false, 'error' => 'Name and company required'], 400);
            }
            
            $teamId = $data['id'] ?? 'team-' . uniqid();
            
            $stmt = $db->prepare("
                INSERT INTO teams (id, name, type, company, description, contact_phone, contact_email, contact_address, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $teamId,
                $data['name'],
                $data['type'] ?? 'intern',
                $data['company'],
                $data['description'] ?? null,
                $data['contact']['phone'] ?? null,
                $data['contact']['email'] ?? null,
                $data['contact']['address'] ?? null,
                $data['created_at'] ?? date('Y-m-d'),
                $data['is_active'] ?? true
            ]);
            
            // Add team members
            if (!empty($data['members']) && is_array($data['members'])) {
                addTeamMembers($db, $teamId, $data['members']);
            }
            
            sendJSON(['success' => true, 'id' => $teamId], 201);
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Team ID required'], 400);
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
            if (isset($data['type'])) {
                $updates[] = "type = ?";
                $params[] = $data['type'];
            }
            if (isset($data['company'])) {
                $updates[] = "company = ?";
                $params[] = $data['company'];
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }
            if (isset($data['contact']['phone'])) {
                $updates[] = "contact_phone = ?";
                $params[] = $data['contact']['phone'];
            }
            if (isset($data['contact']['email'])) {
                $updates[] = "contact_email = ?";
                $params[] = $data['contact']['email'];
            }
            if (isset($data['contact']['address'])) {
                $updates[] = "contact_address = ?";
                $params[] = $data['contact']['address'];
            }
            if (isset($data['is_active'])) {
                $updates[] = "is_active = ?";
                $params[] = $data['is_active'] ? 1 : 0;
            }
            
            if (!empty($updates)) {
                $params[] = $id;
                $sql = "UPDATE teams SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            }
            
            // Update team members
            if (isset($data['members']) && is_array($data['members'])) {
                // Remove old members
                $db->prepare("DELETE FROM team_members WHERE team_id = ?")->execute([$id]);
                // Add new members
                addTeamMembers($db, $id, $data['members']);
            }
            
            sendJSON(['success' => true]);
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Team ID required'], 400);
            }
            
            if (!hasPermission($currentUser, 'Verwalten')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            // Soft delete - set is_active to false
            $stmt = $db->prepare("UPDATE teams SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            
            sendJSON(['success' => true]);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

function getTeamMembers($db, $teamId) {
    $stmt = $db->prepare("
        SELECT w.id FROM workers w
        INNER JOIN team_members tm ON w.id = tm.worker_id
        WHERE tm.team_id = ?
    ");
    $stmt->execute([$teamId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function addTeamMembers($db, $teamId, $memberIds) {
    $stmt = $db->prepare("INSERT INTO team_members (team_id, worker_id) VALUES (?, ?)");
    foreach ($memberIds as $workerId) {
        try {
            $stmt->execute([$teamId, $workerId]);
            // Also update worker's team_id
            $db->prepare("UPDATE workers SET team_id = ? WHERE id = ?")->execute([$teamId, $workerId]);
        } catch (PDOException $e) {
            // Ignore duplicates
        }
    }
}

