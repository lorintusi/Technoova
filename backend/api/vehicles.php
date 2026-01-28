<?php
/**
 * Vehicles API
 * CRUD operations for vehicles
 * REFACTORED: Uses new response/validation helpers
 */

require_once __DIR__ . '/../config.php';

function handleVehicles($method, $id, $currentUser) {
    $db = get_db();
    
    // Permission check: Only admin can manage vehicles
    if (!hasPermission($currentUser, 'Verwalten') && $currentUser['role'] !== 'Admin') {
        json_error('Keine Berechtigung', 403);
    }
    
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    // Get single vehicle
                    $vehicle = db_fetch_one($db, "SELECT * FROM vehicles WHERE id = ?", [$id]);
                    
                    if (!$vehicle) {
                        json_error('Fahrzeug nicht gefunden', 404);
                    }
                    
                    json_success($vehicle);
                } else {
                    // Get all vehicles
                    $status = $_GET['status'] ?? null;
                    
                    $query = "SELECT * FROM vehicles WHERE 1=1";
                    $params = [];
                    
                    if ($status) {
                        $query .= " AND status = ?";
                        $params[] = $status;
                    }
                    
                    $query .= " ORDER BY name";
                    
                    $vehicles = db_fetch_all($db, $query, $params);
                    json_success($vehicles);
                }
                break;
                
            case 'POST':
                // Create vehicle
                $data = getRequestData();
                
                // Validate required fields
                validate_required($data, ['name']);
                
                // Validate name length
                validate_length($data['name'], 'name', 1, 255);
                
                $vehicleId = $data['id'] ?? 'vehicle-' . uniqid();
                $name = $data['name'];
                $type = $data['type'] ?? '';
                $licensePlate = $data['license_plate'] ?? '';
                $status = $data['status'] ?? 'Verfügbar';
                $notes = $data['notes'] ?? '';
                
                // Validate status enum
                validate_enum($status, 'status', ['Verfügbar', 'Im Einsatz', 'Wartung', 'Außer Betrieb']);
                
                try {
                    db_execute($db, 
                        "INSERT INTO vehicles (id, name, type, license_plate, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
                        [$vehicleId, $name, $type, $licensePlate, $status, $notes]
                    );
                    
                    // Return created vehicle
                    $vehicle = db_fetch_one($db, "SELECT * FROM vehicles WHERE id = ?", [$vehicleId]);
                    json_success($vehicle, 201);
                    
                } catch (PDOException $e) {
                    if ($e->getCode() == 23000) {
                        json_error('Fahrzeug mit dieser ID existiert bereits', 409);
                    }
                    throw $e;
                }
                break;
                
            case 'PUT':
                // Update vehicle
                if (!$id) {
                    json_error('Fahrzeug-ID erforderlich', 400);
                }
                
                $data = getRequestData();
                
                // Check if vehicle exists
                $existing = db_fetch_one($db, "SELECT id FROM vehicles WHERE id = ?", [$id]);
                if (!$existing) {
                    json_error('Fahrzeug nicht gefunden', 404);
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
                $licensePlate = $data['license_plate'] ?? null;
                $status = $data['status'] ?? null;
                $notes = $data['notes'] ?? null;
                
                // Build dynamic update query
                $updates = [];
                $params = [];
                
                if ($name !== null) { $updates[] = "name = ?"; $params[] = $name; }
                if ($type !== null) { $updates[] = "type = ?"; $params[] = $type; }
                if ($licensePlate !== null) { $updates[] = "license_plate = ?"; $params[] = $licensePlate; }
                if ($status !== null) { $updates[] = "status = ?"; $params[] = $status; }
                if ($notes !== null) { $updates[] = "notes = ?"; $params[] = $notes; }
                
                if (empty($updates)) {
                    json_error('Keine Felder zum Aktualisieren', 400);
                }
                
                $params[] = $id;
                $query = "UPDATE vehicles SET " . implode(", ", $updates) . " WHERE id = ?";
                
                db_execute($db, $query, $params);
                
                // Return updated vehicle
                $vehicle = db_fetch_one($db, "SELECT * FROM vehicles WHERE id = ?", [$id]);
                json_success($vehicle);
                break;
                
            case 'DELETE':
                // Delete vehicle
                if (!$id) {
                    json_error('Fahrzeug-ID erforderlich', 400);
                }
                
                $affected = db_execute($db, "DELETE FROM vehicles WHERE id = ?", [$id]);
                
                if ($affected === 0) {
                    json_error('Fahrzeug nicht gefunden', 404);
                }
                
                json_success(['message' => 'Fahrzeug gelöscht', 'id' => $id]);
                break;
                
            default:
                json_error('Methode nicht erlaubt', 405);
        }
        
    } catch (ValidationError $e) {
        json_error($e->getMessage(), 400, 'VALIDATION_ERROR', $e->fieldErrors);
    } catch (PDOException $e) {
        error_log("Database error in vehicles.php: " . $e->getMessage());
        json_error('Datenbankfehler', 500, 'DATABASE_ERROR', null, $e->getMessage());
    } catch (Exception $e) {
        error_log("Error in vehicles.php: " . $e->getMessage());
        json_error('Interner Serverfehler', 500, 'INTERNAL_ERROR', null, $e->getMessage());
    }
}
