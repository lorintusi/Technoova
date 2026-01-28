<?php
/**
 * Todos API
 * CRUD operations for todos/notes
 */

function handleTodos($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // Get single todo
                $stmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
                $stmt->execute([$id]);
                $todo = $stmt->fetch();
                
                if (!$todo) {
                    sendJSON(['success' => false, 'error' => 'Todo not found'], 404);
                }
                
                // Permission check: user can only see own todos or admin can see all
                $isAdmin = hasPermission($currentUser, 'Verwalten') || $currentUser['role'] === 'Admin';
                if (!$isAdmin && $todo['created_by_user_id'] !== $currentUser['id']) {
                    sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
                }
                
                sendJSON(['success' => true, 'data' => $todo]);
            } else {
                // Get todos with filters
                $scope = $_GET['scope'] ?? null;
                $scopeId = $_GET['scope_id'] ?? null;
                $completed = isset($_GET['completed']) ? (int)$_GET['completed'] : null;
                
                $query = "SELECT * FROM todos WHERE 1=1";
                $params = [];
                
                // Permission filter: non-admin can only see own todos
                $isAdmin = hasPermission($currentUser, 'Verwalten') || $currentUser['role'] === 'Admin';
                if (!$isAdmin) {
                    $query .= " AND created_by_user_id = ?";
                    $params[] = $currentUser['id'];
                }
                
                if ($scope) {
                    $query .= " AND scope = ?";
                    $params[] = $scope;
                }
                
                if ($scopeId !== null) {
                    $query .= " AND scope_id = ?";
                    $params[] = $scopeId;
                }
                
                if ($completed !== null) {
                    $query .= " AND completed = ?";
                    $params[] = $completed;
                }
                
                $query .= " ORDER BY created_at DESC";
                
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $todos = $stmt->fetchAll();
                
                sendJSON(['success' => true, 'data' => $todos]);
            }
            break;
            
        case 'POST':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            if (empty($data['title'])) {
                sendJSON(['success' => false, 'error' => 'Title is required'], 400);
            }
            
            if (empty($data['scope'])) {
                sendJSON(['success' => false, 'error' => 'Scope is required'], 400);
            }
            
            // Validate scope
            $validScopes = ['PLAN_DAY', 'PLAN_WEEK', 'ADMIN_GLOBAL'];
            if (!in_array($data['scope'], $validScopes)) {
                sendJSON(['success' => false, 'error' => 'Invalid scope'], 400);
            }
            
            $todoId = $data['id'] ?? 'todo-' . uniqid();
            $scope = $data['scope'];
            $scopeId = $data['scope_id'] ?? null;
            $title = $data['title'];
            $description = $data['description'] ?? null;
            $completed = isset($data['completed']) ? (int)$data['completed'] : 0;
            $createdByUserId = $currentUser['id'];
            
            $stmt = $db->prepare("
                INSERT INTO todos (id, scope, scope_id, title, description, completed, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            try {
                $stmt->execute([$todoId, $scope, $scopeId, $title, $description, $completed, $createdByUserId]);
                
                // Fetch created todo
                $stmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
                $stmt->execute([$todoId]);
                $todo = $stmt->fetch();
                
                sendJSON(['success' => true, 'data' => $todo], 201);
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    sendJSON(['success' => false, 'error' => 'Todo with this ID already exists'], 409);
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
                sendJSON(['success' => false, 'error' => 'Todo ID required'], 400);
            }
            
            // Check if todo exists
            $stmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
            $stmt->execute([$id]);
            $existingTodo = $stmt->fetch();
            
            if (!$existingTodo) {
                sendJSON(['success' => false, 'error' => 'Todo not found'], 404);
            }
            
            // Permission check: user can only update own todos or admin can update all
            $isAdmin = hasPermission($currentUser, 'Verwalten') || $currentUser['role'] === 'Admin';
            if (!$isAdmin && $existingTodo['created_by_user_id'] !== $currentUser['id']) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $data = getRequestData();
            
            // Build update query dynamically
            $updates = [];
            $params = [];
            
            if (isset($data['title'])) {
                $updates[] = "title = ?";
                $params[] = $data['title'];
            }
            
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }
            
            if (isset($data['completed'])) {
                $updates[] = "completed = ?";
                $params[] = (int)$data['completed'];
            }
            
            if (isset($data['scope'])) {
                $updates[] = "scope = ?";
                $params[] = $data['scope'];
            }
            
            if (isset($data['scope_id'])) {
                $updates[] = "scope_id = ?";
                $params[] = $data['scope_id'];
            }
            
            if (empty($updates)) {
                sendJSON(['success' => false, 'error' => 'No fields to update'], 400);
            }
            
            $params[] = $id;
            
            $query = "UPDATE todos SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $db->prepare($query);
            
            try {
                $stmt->execute($params);
                
                // Fetch updated todo
                $stmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
                $stmt->execute([$id]);
                $todo = $stmt->fetch();
                
                sendJSON(['success' => true, 'data' => $todo]);
            } catch (PDOException $e) {
                sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
            }
            break;
            
        case 'DELETE':
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Todo ID required'], 400);
            }
            
            // Check if todo exists
            $stmt = $db->prepare("SELECT * FROM todos WHERE id = ?");
            $stmt->execute([$id]);
            $existingTodo = $stmt->fetch();
            
            if (!$existingTodo) {
                sendJSON(['success' => false, 'error' => 'Todo not found'], 404);
            }
            
            // Permission check: user can only delete own todos or admin can delete all
            $isAdmin = hasPermission($currentUser, 'Verwalten') || $currentUser['role'] === 'Admin';
            if (!$isAdmin && $existingTodo['created_by_user_id'] !== $currentUser['id']) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            $stmt = $db->prepare("DELETE FROM todos WHERE id = ?");
            
            try {
                $stmt->execute([$id]);
                sendJSON(['success' => true]);
            } catch (PDOException $e) {
                sendJSON(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
            }
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}



