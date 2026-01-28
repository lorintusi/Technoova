<?php
/**
 * Dispatch Items API
 * CRUD operations for dispatch items
 */

function handleDispatchItems($method, $id, $currentUser) {
    $db = getDBConnection();
    
    // Permission check: Only admin can manage dispatch items
    if (!hasPermission($currentUser, 'Schreiben')) {
        sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
    }
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // Get single dispatch item
                $stmt = $db->prepare("SELECT * FROM dispatch_items WHERE id = ?");
                $stmt->execute([$id]);
                $item = $stmt->fetch();
                
                if (!$item) {
                    sendJSON(['success' => false, 'error' => 'Dispatch item not found'], 404);
                }
                
                // Get assignments
                $item['assignments'] = getDispatchAssignmentsForItem($db, $id);
                
                sendJSON(['success' => true, 'data' => $item]);
            } else {
                // Get all dispatch items with filters
                $dateFrom = $_GET['date_from'] ?? null;
                $dateTo = $_GET['date_to'] ?? null;
                $status = $_GET['status'] ?? null;
                $locationId = $_GET['location_id'] ?? null;
                
                $query = "SELECT * FROM dispatch_items WHERE 1=1";
                $params = [];
                
                if ($dateFrom) {
                    $query .= " AND date >= ?";
                    $params[] = $dateFrom;
                }
                if ($dateTo) {
                    $query .= " AND date <= ?";
                    $params[] = $dateTo;
                }
                if ($status) {
                    $query .= " AND status = ?";
                    $params[] = $status;
                }
                if ($locationId) {
                    $query .= " AND location_id = ?";
                    $params[] = $locationId;
                }
                
                $query .= " ORDER BY date, start_time";
                
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $items = $stmt->fetchAll();
                
                // Get assignments for each item
                foreach ($items as &$item) {
                    $item['assignments'] = getDispatchAssignmentsForItem($db, $item['id']);
                }
                
                sendJSON(['success' => true, 'data' => $items]);
            }
            break;
            
        case 'POST':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            if (empty($data['date'])) {
                sendJSON(['success' => false, 'error' => 'Date is required'], 400);
            }
            
            $itemId = $data['id'] ?? 'disp-' . uniqid();
            $locationId = $data['locationId'] ?? $data['location_id'] ?? null;
            $date = $data['date'];
            $startTime = $data['startTime'] ?? $data['start_time'] ?? null;
            $endTime = $data['endTime'] ?? $data['end_time'] ?? null;
            $allDay = isset($data['allDay']) ? (int)$data['allDay'] : (isset($data['all_day']) ? (int)$data['all_day'] : 0);
            $category = $data['category'] ?? null;
            $note = $data['note'] ?? null;
            $status = $data['status'] ?? 'PLANNED';
            $createdByUserId = $currentUser['id'] ?? null;
            
            $stmt = $db->prepare("
                INSERT INTO dispatch_items (id, location_id, date, start_time, end_time, all_day, category, note, status, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            try {
                $stmt->execute([$itemId, $locationId, $date, $startTime, $endTime, $allDay, $category, $note, $status, $createdByUserId]);
                
                // Return created item
                $stmt = $db->prepare("SELECT * FROM dispatch_items WHERE id = ?");
                $stmt->execute([$itemId]);
                $item = $stmt->fetch();
                $item['assignments'] = [];
                
                sendJSON(['success' => true, 'data' => $item], 201);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    sendJSON(['success' => false, 'error' => 'Dispatch item with this ID already exists'], 409);
                } else {
                    sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
                }
            }
            break;
            
        case 'PUT':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Dispatch item ID required'], 400);
            }
            
            $data = getRequestData();
            
            // Check if item exists
            $stmt = $db->prepare("SELECT * FROM dispatch_items WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            
            if (!$existing) {
                sendJSON(['success' => false, 'error' => 'Dispatch item not found'], 404);
            }
            
            $locationId = $data['locationId'] ?? $data['location_id'] ?? $existing['location_id'];
            $date = $data['date'] ?? $existing['date'];
            $startTime = $data['startTime'] ?? $data['start_time'] ?? $existing['start_time'];
            $endTime = $data['endTime'] ?? $data['end_time'] ?? $existing['end_time'];
            $allDay = isset($data['allDay']) ? (int)$data['allDay'] : (isset($data['all_day']) ? (int)$data['all_day'] : $existing['all_day']);
            $category = $data['category'] ?? $existing['category'];
            $note = $data['note'] ?? $existing['note'];
            $status = $data['status'] ?? $existing['status'];
            
            $stmt = $db->prepare("
                UPDATE dispatch_items 
                SET location_id = ?, date = ?, start_time = ?, end_time = ?, all_day = ?, category = ?, note = ?, status = ?
                WHERE id = ?
            ");
            
            $stmt->execute([$locationId, $date, $startTime, $endTime, $allDay, $category, $note, $status, $id]);
            
            // Return updated item
            $stmt = $db->prepare("SELECT * FROM dispatch_items WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();
            $item['assignments'] = getDispatchAssignmentsForItem($db, $id);
            
            sendJSON(['success' => true, 'data' => $item]);
            break;
            
        case 'DELETE':
            if (!hasPermission($currentUser, 'Verwalten')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Dispatch item ID required'], 400);
            }
            
            // Check if item exists
            $stmt = $db->prepare("SELECT * FROM dispatch_items WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            
            if (!$existing) {
                sendJSON(['success' => false, 'error' => 'Dispatch item not found'], 404);
            }
            
            // Delete assignments first (CASCADE should handle this, but explicit is safer)
            $stmt = $db->prepare("DELETE FROM dispatch_assignments WHERE dispatch_item_id = ?");
            $stmt->execute([$id]);
            
            // Delete item
            $stmt = $db->prepare("DELETE FROM dispatch_items WHERE id = ?");
            $stmt->execute([$id]);
            
            sendJSON(['success' => true, 'message' => 'Dispatch item deleted']);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

/**
 * Get dispatch assignments for a dispatch item
 */
function getDispatchAssignmentsForItem($db, $dispatchItemId) {
    $stmt = $db->prepare("SELECT * FROM dispatch_assignments WHERE dispatch_item_id = ?");
    $stmt->execute([$dispatchItemId]);
    return $stmt->fetchAll();
}



