<?php
/**
 * Devices API
 * CRUD operations for devices
 * REFACTORED: Uses new response/validation helpers
 */

require_once __DIR__ . '/../config.php';

function handleDevices($method, $id, $currentUser) {
    $db = get_db();
    
    // Permission check: Only admin can manage devices
    if (!hasPermission($currentUser, 'Verwalten') && $currentUser['role'] !== 'Admin') {
        json_error('Keine Berechtigung', 403);
    }
    
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    // Get single device
                    $device = db_fetch_one($db, "SELECT * FROM devices WHERE id = ?", [$id]);
                    
                    if (!$device) {
                        json_error('Gerät nicht gefunden', 404);
                    }
                    
                    json_success($device);
                } else {
                    // Get all devices
                    $status = $_GET['status'] ?? null;
                    
                    $query = "SELECT * FROM devices WHERE 1=1";
                    $params = [];
                    
                    if ($status) {
                        $query .= " AND status = ?";
                        $params[] = $status;
                    }
                    
                    $query .= " ORDER BY name";
                    
                    $devices = db_fetch_all($db, $query, $params);
                    json_success($devices);
                }
                break;
                
            case 'POST':
                // Create device
                $data = getRequestData();
                
                // Validate required fields
                validate_required($data, ['name']);
                
                // Validate name length
                validate_length($data['name'], 'name', 1, 255);
                
                $deviceId = $data['id'] ?? 'device-' . uniqid();
                $name = $data['name'];
                $type = $data['type'] ?? '';
                $serialNumber = $data['serial_number'] ?? $data['serialNumber'] ?? '';
                $status = $data['status'] ?? 'Verfügbar';
                $notes = $data['notes'] ?? '';
                
                // Validate status enum
                validate_enum($status, 'status', ['Verfügbar', 'Im Einsatz', 'Wartung', 'Außer Betrieb']);
                
                try {
                    db_execute($db, 
                        "INSERT INTO devices (id, name, type, serial_number, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
                        [$deviceId, $name, $type, $serialNumber, $status, $notes]
                    );
                    
                    // Return created device
                    $device = db_fetch_one($db, "SELECT * FROM devices WHERE id = ?", [$deviceId]);
                    json_success($device, 201);
                    
                } catch (PDOException $e) {
                    if ($e->getCode() == 23000) {
                        json_error('Gerät mit dieser ID existiert bereits', 409);
                    }
                    throw $e;
                }
                break;
                
            case 'PUT':
                // Update device
                if (!$id) {
                    json_error('Geräte-ID erforderlich', 400);
                }
                
                $data = getRequestData();
                
                // Check if device exists
                $existing = db_fetch_one($db, "SELECT id FROM devices WHERE id = ?", [$id]);
                if (!$existing) {
                    json_error('Gerät nicht gefunden', 404);
                }
                
                // Validate if provided
                if (isset($data['name'])) {
                    validate_required(['name' => $data['name']], ['name']);
                    validate_length($data['name'], 'name', 1, 255);
                }
                
                if (isset($data['status'])) {
                    validate_enum($data['status'], 'status', ['Verfügbar', 'Im Einsatz', 'Wartung', 'Außer Betrieb']);
                }
                
                $name = $data['name'] ?? null;
                $type = $data['type'] ?? null;
                $serialNumber = $data['serial_number'] ?? $data['serialNumber'] ?? null;
                $status = $data['status'] ?? null;
                $notes = $data['notes'] ?? null;
                
                // Build dynamic update query
                $updates = [];
                $params = [];
                
                if ($name !== null) { $updates[] = "name = ?"; $params[] = $name; }
                if ($type !== null) { $updates[] = "type = ?"; $params[] = $type; }
                if ($serialNumber !== null) { $updates[] = "serial_number = ?"; $params[] = $serialNumber; }
                if ($status !== null) { $updates[] = "status = ?"; $params[] = $status; }
                if ($notes !== null) { $updates[] = "notes = ?"; $params[] = $notes; }
                
                if (empty($updates)) {
                    json_error('Keine Felder zum Aktualisieren', 400);
                }
                
                $params[] = $id;
                $query = "UPDATE devices SET " . implode(", ", $updates) . " WHERE id = ?";
                
                db_execute($db, $query, $params);
                
                // Return updated device
                $device = db_fetch_one($db, "SELECT * FROM devices WHERE id = ?", [$id]);
                json_success($device);
                break;
                
            case 'DELETE':
                // Delete device
                if (!$id) {
                    json_error('Geräte-ID erforderlich', 400);
                }
                
                $affected = db_execute($db, "DELETE FROM devices WHERE id = ?", [$id]);
                
                if ($affected === 0) {
                    json_error('Gerät nicht gefunden', 404);
                }
                
                json_success(['message' => 'Gerät gelöscht', 'id' => $id]);
                break;
                
            default:
                json_error('Methode nicht erlaubt', 405);
        }
        
    } catch (ValidationError $e) {
        json_error($e->getMessage(), 400, 'VALIDATION_ERROR', $e->fieldErrors);
    } catch (PDOException $e) {
        error_log("Database error in devices.php: " . $e->getMessage());
        json_error('Datenbankfehler', 500, 'DATABASE_ERROR', null, $e->getMessage());
    } catch (Exception $e) {
        error_log("Error in devices.php: " . $e->getMessage());
        json_error('Interner Serverfehler', 500, 'INTERNAL_ERROR', null, $e->getMessage());
    }
}
