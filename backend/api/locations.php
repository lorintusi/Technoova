<?php
/**
 * Locations API
 * CRUD operations for locations/Baustellen
 * REFACTORED: Uses new response/validation helpers
 */

require_once __DIR__ . '/../config.php';

function handleLocations($method, $id, $currentUser) {
    $db = get_db();
    
    try {
        switch ($method) {
            case 'GET':
                if ($id) {
                    // Get single location
                    $location = db_fetch_one($db, "SELECT * FROM locations WHERE id = ?", [$id]);
                    
                    if (!$location) {
                        json_error('Baustelle nicht gefunden', 404);
                    }
                    
                    // Enrich location data
                    $location['crew'] = getLocationCrew($db, $id);
                    $location['tags'] = json_decode($location['tags'] ?? '[]', true);
                    $location['resourcesRequired'] = json_decode($location['resources_required'] ?? '[]', true);
                    $location['schedule'] = [
                        'status' => $location['schedule_status'],
                        'start' => $location['schedule_start'],
                        'end' => $location['schedule_end'],
                        'deadline' => $location['schedule_deadline'],
                        'progress' => (int)$location['schedule_progress']
                    ];
                    
                    json_success($location);
                } else {
                    // Get all locations
                    $locations = db_fetch_all($db, "SELECT * FROM locations ORDER BY code", []);
                    
                    foreach ($locations as &$location) {
                        $location['crew'] = getLocationCrew($db, $location['id']);
                        $location['tags'] = json_decode($location['tags'] ?? '[]', true);
                        $location['resourcesRequired'] = json_decode($location['resources_required'] ?? '[]', true);
                        $location['schedule'] = [
                            'status' => $location['schedule_status'],
                            'start' => $location['schedule_start'],
                            'end' => $location['schedule_end'],
                            'deadline' => $location['schedule_deadline'],
                            'progress' => (int)$location['schedule_progress']
                        ];
                    }
                    
                    json_success($locations);
                }
                break;
                
            case 'POST':
                // Create location
                if (!hasPermission($currentUser, 'Schreiben')) {
                    json_error('Keine Berechtigung', 403);
                }
                
                $data = getRequestData();
                
                // Validate required fields
                validate_required($data, ['code', 'address']);
                validate_length($data['code'], 'code', 1, 255);
                validate_length($data['address'], 'address', 1, 500);
                
                $locationId = $data['id'] ?? 'loc-' . uniqid();
                $code = $data['code'];
                $address = $data['address'];
                $description = $data['description'] ?? '';
                $tags = isset($data['tags']) ? json_encode($data['tags']) : '[]';
                $resourcesRequired = isset($data['resourcesRequired']) ? json_encode($data['resourcesRequired']) : '[]';
                $scheduleStatus = $data['schedule']['status'] ?? $data['scheduleStatus'] ?? 'Geplant';
                $scheduleStart = $data['schedule']['start'] ?? $data['scheduleStart'] ?? null;
                $scheduleEnd = $data['schedule']['end'] ?? $data['scheduleEnd'] ?? null;
                $scheduleDeadline = $data['schedule']['deadline'] ?? $data['scheduleDeadline'] ?? null;
                $scheduleProgress = $data['schedule']['progress'] ?? $data['scheduleProgress'] ?? 0;
                $planFile = $data['planFile'] ?? null;
                $planFileName = $data['planFileName'] ?? null;
                
                db_execute($db, 
                    "INSERT INTO locations (id, code, address, description, tags, resources_required, 
                     schedule_status, schedule_start, schedule_end, schedule_deadline, schedule_progress, 
                     plan_file, plan_file_name) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [$locationId, $code, $address, $description, $tags, $resourcesRequired,
                     $scheduleStatus, $scheduleStart, $scheduleEnd, $scheduleDeadline, $scheduleProgress,
                     $planFile, $planFileName]
                );
                
                // Return created location
                $location = db_fetch_one($db, "SELECT * FROM locations WHERE id = ?", [$locationId]);
                $location['crew'] = [];
                $location['tags'] = json_decode($tags, true);
                $location['resourcesRequired'] = json_decode($resourcesRequired, true);
                
                json_success($location, 201);
                break;
                
            case 'PUT':
                // Update location
                if (!hasPermission($currentUser, 'Schreiben')) {
                    json_error('Keine Berechtigung', 403);
                }
                
                if (!$id) {
                    json_error('Baustellen-ID erforderlich', 400);
                }
                
                $data = getRequestData();
                
                // Check if exists
                $existing = db_fetch_one($db, "SELECT id FROM locations WHERE id = ?", [$id]);
                if (!$existing) {
                    json_error('Baustelle nicht gefunden', 404);
                }
                
                // Build dynamic update
                $updates = [];
                $params = [];
                
                if (isset($data['code'])) { validate_length($data['code'], 'code', 1, 255); $updates[] = "code = ?"; $params[] = $data['code']; }
                if (isset($data['address'])) { validate_length($data['address'], 'address', 1, 500); $updates[] = "address = ?"; $params[] = $data['address']; }
                if (isset($data['description'])) { $updates[] = "description = ?"; $params[] = $data['description']; }
                if (isset($data['tags'])) { $updates[] = "tags = ?"; $params[] = json_encode($data['tags']); }
                if (isset($data['resourcesRequired'])) { $updates[] = "resources_required = ?"; $params[] = json_encode($data['resourcesRequired']); }
                if (isset($data['schedule']['status']) || isset($data['scheduleStatus'])) { 
                    $updates[] = "schedule_status = ?"; 
                    $params[] = $data['schedule']['status'] ?? $data['scheduleStatus']; 
                }
                if (isset($data['schedule']['start']) || isset($data['scheduleStart'])) { 
                    $updates[] = "schedule_start = ?"; 
                    $params[] = $data['schedule']['start'] ?? $data['scheduleStart']; 
                }
                if (isset($data['schedule']['end']) || isset($data['scheduleEnd'])) { 
                    $updates[] = "schedule_end = ?"; 
                    $params[] = $data['schedule']['end'] ?? $data['scheduleEnd']; 
                }
                if (isset($data['schedule']['deadline']) || isset($data['scheduleDeadline'])) { 
                    $updates[] = "schedule_deadline = ?"; 
                    $params[] = $data['schedule']['deadline'] ?? $data['scheduleDeadline']; 
                }
                if (isset($data['schedule']['progress']) || isset($data['scheduleProgress'])) { 
                    $updates[] = "schedule_progress = ?"; 
                    $params[] = $data['schedule']['progress'] ?? $data['scheduleProgress']; 
                }
                if (isset($data['planFile'])) { $updates[] = "plan_file = ?"; $params[] = $data['planFile']; }
                if (isset($data['planFileName'])) { $updates[] = "plan_file_name = ?"; $params[] = $data['planFileName']; }
                
                if (empty($updates)) {
                    json_error('Keine Felder zum Aktualisieren', 400);
                }
                
                $params[] = $id;
                $query = "UPDATE locations SET " . implode(", ", $updates) . " WHERE id = ?";
                db_execute($db, $query, $params);
                
                // Return updated location
                $location = db_fetch_one($db, "SELECT * FROM locations WHERE id = ?", [$id]);
                $location['crew'] = getLocationCrew($db, $id);
                $location['tags'] = json_decode($location['tags'] ?? '[]', true);
                $location['resourcesRequired'] = json_decode($location['resources_required'] ?? '[]', true);
                
                json_success($location);
                break;
                
            case 'DELETE':
                // Delete location
                if (!hasPermission($currentUser, 'Verwalten')) {
                    json_error('Keine Berechtigung', 403);
                }
                
                if (!$id) {
                    json_error('Baustellen-ID erforderlich', 400);
                }
                
                $affected = db_execute($db, "DELETE FROM locations WHERE id = ?", [$id]);
                
                if ($affected === 0) {
                    json_error('Baustelle nicht gefunden', 404);
                }
                
                json_success(['message' => 'Baustelle gelöscht', 'id' => $id]);
                break;
                
            default:
                json_error('Methode nicht erlaubt', 405);
        }
        
    } catch (ValidationError $e) {
        json_error($e->getMessage(), 400, 'VALIDATION_ERROR', $e->fieldErrors);
    } catch (PDOException $e) {
        error_log("Database error in locations.php: " . $e->getMessage());
        json_error('Datenbankfehler', 500, 'DATABASE_ERROR', null, $e->getMessage());
    } catch (Exception $e) {
        error_log("Error in locations.php: " . $e->getMessage());
        json_error('Interner Serverfehler', 500, 'INTERNAL_ERROR', null, $e->getMessage());
    }
}

function getLocationCrew($db, $locationId) {
    $stmt = $db->prepare("
        SELECT w.id, w.name, w.role, a.assignment_date, a.time_from, a.time_to
        FROM assignments a
        JOIN workers w ON a.worker_id = w.id
        WHERE a.location_id = ?
        ORDER BY a.assignment_date DESC
    ");
    $stmt->execute([$locationId]);
    return $stmt->fetchAll();
}
