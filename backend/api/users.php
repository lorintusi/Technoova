<?php
/**
 * Users API
 * CRUD operations for users
 * REFACTORED: Uses new response/validation helpers
 */

require_once __DIR__ . '/../config.php';

function handleUsers($method, $id, $currentUser) {
    $db = get_db();
    
    // Check permissions
    if (!hasPermission($currentUser, 'manage_users')) {
        json_error('Keine Berechtigung', 403);
    }
    
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    // Get single user
                    $user = db_fetch_one($db, 
                        "SELECT id, username, name, email, role, permissions, worker_id, weekly_hours_target, first_login, last_login, created_at, updated_at FROM users WHERE id = ?", 
                        [$id]
                    );
                    
                    if (!$user) {
                        json_error('Benutzer nicht gefunden', 404);
                    }
                    
                    $user['permissions'] = json_decode($user['permissions'] ?? '[]', true);
                    if (isset($user['worker_id'])) {
                        $user['workerId'] = $user['worker_id'];
                    }
                    if (!isset($user['weekly_hours_target'])) {
                        $user['weekly_hours_target'] = 42.50;
                    }
                    
                    json_success($user);
                } else {
                    // Get all users
                    $users = db_fetch_all($db, 
                        "SELECT id, username, name, email, role, permissions, worker_id, weekly_hours_target, first_login, last_login, created_at, updated_at FROM users",
                        []
                    );
                    
                    foreach ($users as &$user) {
                        $user['permissions'] = json_decode($user['permissions'] ?? '[]', true);
                        if (isset($user['worker_id'])) {
                            $user['workerId'] = $user['worker_id'];
                        }
                        if (!isset($user['weekly_hours_target'])) {
                            $user['weekly_hours_target'] = 42.50;
                        }
                    }
                    
                    json_success($users);
                }
                break;
                
            case 'POST':
                // Create user
                $data = getRequestData();
                
                // Validate required fields
                validate_required($data, ['username', 'email', 'password']);
                validate_email($data['email'], 'email');
                validate_length($data['username'], 'username', 3, 100);
                validate_length($data['password'], 'password', 6, 255);
                
                // Check unique username/email
                validate_unique($db, 'users', 'username', $data['username']);
                validate_unique($db, 'users', 'email', $data['email']);
                
                $userId = $data['id'] ?? 'user-' . uniqid();
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                $permissions = json_encode($data['permissions'] ?? ['Lesen', 'view_own']);
                $weeklyHoursTarget = isset($data['weekly_hours_target']) ? (float)$data['weekly_hours_target'] : 42.50;
                
                db_execute($db,
                    "INSERT INTO users (id, username, name, email, password, role, permissions, worker_id, weekly_hours_target, first_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        $userId,
                        $data['username'],
                        $data['name'] ?? $data['username'],
                        $data['email'],
                        $hashedPassword,
                        $data['role'] ?? 'Worker',
                        $permissions,
                        $data['worker_id'] ?? null,
                        $weeklyHoursTarget,
                        true
                    ]
                );
                
                // Return created user
                $user = db_fetch_one($db, 
                    "SELECT id, username, name, email, role, permissions, worker_id, weekly_hours_target, first_login, created_at FROM users WHERE id = ?",
                    [$userId]
                );
                $user['permissions'] = json_decode($user['permissions'], true);
                if (isset($user['worker_id'])) {
                    $user['workerId'] = $user['worker_id'];
                }
                
                json_success($user, 201);
                break;
                
            case 'PUT':
                // Update user
                if (!$id) {
                    json_error('Benutzer-ID erforderlich', 400);
                }
                
                $data = getRequestData();
                
                // Check if exists
                $existing = db_fetch_one($db, "SELECT id FROM users WHERE id = ?", [$id]);
                if (!$existing) {
                    json_error('Benutzer nicht gefunden', 404);
                }
                
                // Validate if provided
                if (isset($data['username'])) {
                    validate_length($data['username'], 'username', 3, 100);
                    validate_unique($db, 'users', 'username', $data['username'], $id);
                }
                if (isset($data['email'])) {
                    validate_email($data['email'], 'email');
                    validate_unique($db, 'users', 'email', $data['email'], $id);
                }
                if (isset($data['password'])) {
                    validate_length($data['password'], 'password', 6, 255);
                }
                
                // Build dynamic update
                $updates = [];
                $params = [];
                
                if (isset($data['username'])) { $updates[] = "username = ?"; $params[] = $data['username']; }
                if (isset($data['name'])) { $updates[] = "name = ?"; $params[] = $data['name']; }
                if (isset($data['email'])) { $updates[] = "email = ?"; $params[] = $data['email']; }
                if (isset($data['password'])) { $updates[] = "password = ?"; $params[] = password_hash($data['password'], PASSWORD_DEFAULT); }
                if (isset($data['role'])) { $updates[] = "role = ?"; $params[] = $data['role']; }
                if (isset($data['permissions'])) { $updates[] = "permissions = ?"; $params[] = json_encode($data['permissions']); }
                if (isset($data['worker_id'])) { $updates[] = "worker_id = ?"; $params[] = $data['worker_id']; }
                if (isset($data['weekly_hours_target'])) { $updates[] = "weekly_hours_target = ?"; $params[] = (float)$data['weekly_hours_target']; }
                if (isset($data['first_login'])) { $updates[] = "first_login = ?"; $params[] = (bool)$data['first_login']; }
                
                if (empty($updates)) {
                    json_error('Keine Felder zum Aktualisieren', 400);
                }
                
                $params[] = $id;
                $query = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
                db_execute($db, $query, $params);
                
                // Return updated user
                $user = db_fetch_one($db,
                    "SELECT id, username, name, email, role, permissions, worker_id, weekly_hours_target, first_login, last_login, updated_at FROM users WHERE id = ?",
                    [$id]
                );
                $user['permissions'] = json_decode($user['permissions'], true);
                if (isset($user['worker_id'])) {
                    $user['workerId'] = $user['worker_id'];
                }
                
                json_success($user);
                break;
                
            case 'DELETE':
                // Delete user
                if (!$id) {
                    json_error('Benutzer-ID erforderlich', 400);
                }
                
                $affected = db_execute($db, "DELETE FROM users WHERE id = ?", [$id]);
                
                if ($affected === 0) {
                    json_error('Benutzer nicht gefunden', 404);
                }
                
                json_success(['message' => 'Benutzer gelöscht', 'id' => $id]);
                break;
                
            default:
                json_error('Methode nicht erlaubt', 405);
        }
        
    } catch (ValidationError $e) {
        json_error($e->getMessage(), 400, 'VALIDATION_ERROR', $e->fieldErrors);
    } catch (PDOException $e) {
        error_log("Database error in users.php: " . $e->getMessage());
        json_error('Datenbankfehler', 500, 'DATABASE_ERROR');
    } catch (Exception $e) {
        error_log("Error in users.php: " . $e->getMessage());
        json_error('Interner Serverfehler', 500, 'INTERNAL_ERROR');
    }
}
