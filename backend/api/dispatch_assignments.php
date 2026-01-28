<?php
/**
 * Dispatch Assignments API
 * CRUD operations for dispatch assignments
 */

function handleDispatchAssignments($method, $id, $currentUser) {
    $db = getDBConnection();
    
    // Permission check: Only admin can manage dispatch assignments
    if (!hasPermission($currentUser, 'Schreiben')) {
        sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
    }
    
    switch ($method) {
        case 'GET':
            $dispatchItemId = $_GET['dispatch_item_id'] ?? null;
            
            if (!$dispatchItemId) {
                sendJSON(['success' => false, 'error' => 'dispatch_item_id parameter required'], 400);
            }
            
            $stmt = $db->prepare("SELECT * FROM dispatch_assignments WHERE dispatch_item_id = ? ORDER BY resource_type, resource_id");
            $stmt->execute([$dispatchItemId]);
            $assignments = $stmt->fetchAll();
            
            sendJSON(['success' => true, 'data' => $assignments]);
            break;
            
        case 'POST':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            $dispatchItemId = $data['dispatch_item_id'] ?? $data['dispatchItemId'] ?? null;
            
            if (!$dispatchItemId) {
                sendJSON(['success' => false, 'error' => 'dispatch_item_id is required'], 400);
            }
            
            // Check if dispatch item exists
            $stmt = $db->prepare("SELECT * FROM dispatch_items WHERE id = ?");
            $stmt->execute([$dispatchItemId]);
            $dispatchItem = $stmt->fetch();
            
            if (!$dispatchItem) {
                sendJSON(['success' => false, 'error' => 'Dispatch item not found'], 404);
            }
            
            // Support batch upsert
            $assignments = $data['assignments'] ?? [];
            
            if (empty($assignments)) {
                sendJSON(['success' => false, 'error' => 'assignments array is required'], 400);
            }
            
            $created = [];
            $errors = [];
            
            // Start transaction
            $db->beginTransaction();
            
            try {
                foreach ($assignments as $assignment) {
                    $resourceType = $assignment['resourceType'] ?? $assignment['resource_type'] ?? null;
                    $resourceId = $assignment['resourceId'] ?? $assignment['resource_id'] ?? null;
                    $date = $assignment['date'] ?? $dispatchItem['date'];
                    
                    if (!$resourceType || !$resourceId) {
                        $errors[] = 'Missing resourceType or resourceId in assignment';
                        continue;
                    }
                    
                    // Validate resource type
                    if (!in_array($resourceType, ['WORKER', 'VEHICLE', 'DEVICE'])) {
                        $errors[] = "Invalid resourceType: {$resourceType}";
                        continue;
                    }
                    
                    $assignmentId = $assignment['id'] ?? 'dass-' . uniqid();
                    
                    // Upsert assignment (INSERT ... ON DUPLICATE KEY UPDATE)
                    $stmt = $db->prepare("
                        INSERT INTO dispatch_assignments (id, dispatch_item_id, resource_type, resource_id, date)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            resource_type = VALUES(resource_type),
                            resource_id = VALUES(resource_id),
                            date = VALUES(date)
                    ");
                    
                    $stmt->execute([$assignmentId, $dispatchItemId, $resourceType, $resourceId, $date]);
                    
                    $created[] = [
                        'id' => $assignmentId,
                        'dispatch_item_id' => $dispatchItemId,
                        'resource_type' => $resourceType,
                        'resource_id' => $resourceId,
                        'date' => $date
                    ];
                }
                
                $db->commit();
                
                sendJSON([
                    'success' => true,
                    'data' => $created,
                    'errors' => $errors
                ], 201);
            } catch (PDOException $e) {
                $db->rollBack();
                sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
            }
            break;
            
        case 'DELETE':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Assignment ID required'], 400);
            }
            
            // Check if assignment exists
            $stmt = $db->prepare("SELECT * FROM dispatch_assignments WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            
            if (!$existing) {
                sendJSON(['success' => false, 'error' => 'Assignment not found'], 404);
            }
            
            $stmt = $db->prepare("DELETE FROM dispatch_assignments WHERE id = ?");
            $stmt->execute([$id]);
            
            sendJSON(['success' => true, 'message' => 'Assignment deleted']);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}



