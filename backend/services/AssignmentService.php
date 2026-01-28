<?php
/**
 * Assignment Service
 * Zentrale Geschäftslogik für Assignments
 */

class AssignmentService {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Validiert Assignment-Daten
     */
    public function validateAssignment($data) {
        $errors = [];
        
        // Business Rule: location_id required wenn entry_type = BAUSTELLE
        $entryType = $data['entry_type'] ?? 'BAUSTELLE';
        if ($entryType === 'BAUSTELLE' && empty($data['location_id'])) {
            $errors[] = 'Baustelle muss ausgewählt werden (Pflichtfeld für BAUSTELLE-Einträge)';
        }
        
        // assignment_date required
        if (empty($data['assignment_date'])) {
            $errors[] = 'Datum ist erforderlich';
        }
        
        // worker_id oder team_id required
        if (empty($data['worker_id']) && empty($data['team_id'])) {
            $errors[] = 'Worker ID oder Team ID erforderlich';
        }
        
        // Zeit-Validierung (wenn gesetzt)
        if (isset($data['time_from']) && isset($data['time_to'])) {
            if (strtotime($data['time_from']) >= strtotime($data['time_to'])) {
                $errors[] = 'Endzeit muss nach Startzeit liegen';
            }
        }
        
        if (!empty($errors)) {
            throw new Exception(implode('; ', $errors));
        }
        
        return true;
    }
    
    /**
     * Upsert Assignments für Datumsbereich (DIFF statt DELETE-ALL)
     * 
     * @param string $dateFrom Start-Datum (Y-m-d)
     * @param string $dateTo End-Datum (Y-m-d)
     * @param string $workerId Worker ID
     * @param array $payloadAssignments Array von Assignment-Objekten mit assignment_uid oder id
     * @param string $userId User ID für Audit
     * @return array ['created' => n, 'updated' => n, 'deleted' => n]
     */
    public function upsertAssignmentsForRange($dateFrom, $dateTo, $workerId, $payloadAssignments, $userId) {
        $this->db->beginTransaction();
        
        try {
            // 1. Lade bestehende Assignments im Range (nur nicht gelöschte)
            $stmt = $this->db->prepare("
                SELECT id, assignment_uid, location_id, entry_type, assignment_date, time_from, time_to
                FROM assignments
                WHERE worker_id = ? 
                  AND assignment_date >= ? 
                  AND assignment_date <= ?
                  AND deleted_at IS NULL
            ");
            $stmt->execute([$workerId, $dateFrom, $dateTo]);
            $existing = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Index nach assignment_uid und id
            $existingByUid = [];
            $existingById = [];
            foreach ($existing as $ass) {
                if ($ass['assignment_uid']) {
                    $existingByUid[$ass['assignment_uid']] = $ass;
                }
                $existingById[$ass['id']] = $ass;
            }
            
            // 2. Verarbeite Payload: create, update, delete
            $toCreate = [];
            $toUpdate = [];
            $payloadUids = [];
            $payloadIds = [];
            
            foreach ($payloadAssignments as $row) {
                $uid = $row['assignment_uid'] ?? null;
                $id = $row['id'] ?? null;
                
                if ($uid && isset($existingByUid[$uid])) {
                    // Update: hat assignment_uid und existiert
                    $toUpdate[$uid] = $row;
                    $payloadUids[] = $uid;
                } elseif ($id && isset($existingById[$id])) {
                    // Update: hat id und existiert (Fallback für alte Daten)
                    $toUpdate[$id] = $row;
                    $payloadIds[] = $id;
                } else {
                    // Create: keine uid/id oder existiert nicht
                    $toCreate[] = $row;
                }
            }
            
            // 3. Delete: existiert in DB, fehlt im Payload
            $toDelete = [];
            foreach ($existing as $ass) {
                $uid = $ass['assignment_uid'];
                $id = $ass['id'];
                
                $inPayload = false;
                if ($uid && in_array($uid, $payloadUids)) {
                    $inPayload = true;
                }
                if ($id && in_array($id, $payloadIds)) {
                    $inPayload = true;
                }
                
                if (!$inPayload) {
                    // Prüfe ob time_entries verknüpft sind
                    $checkStmt = $this->db->prepare("SELECT COUNT(*) as count FROM time_entries WHERE assignment_id = ?");
                    $checkStmt->execute([$ass['id']]);
                    $result = $checkStmt->fetch();
                    $hasTimeEntries = (int)$result['count'] > 0;
                    
                    if ($hasTimeEntries) {
                        // Soft delete wenn time_entries vorhanden
                        $toDelete[] = ['id' => $ass['id'], 'soft' => true];
                    } else {
                        // Hard delete möglich
                        $toDelete[] = ['id' => $ass['id'], 'soft' => false];
                    }
                }
            }
            
            // 4. Execute: creates
            $created = 0;
            $insertStmt = $this->db->prepare("
                INSERT INTO assignments (
                    assignment_uid, location_id, entry_type, worker_id, team_id, 
                    assignment_date, time_from, time_to, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            require_once __DIR__ . '/../config.php';
            
            foreach ($toCreate as $row) {
                $uid = $this->generateUid();
                $entryType = $row['type'] ?? 'BAUSTELLE';
                $locationId = ($entryType === 'BAUSTELLE') ? ($row['location_id'] ?? null) : null;
                
                $insertStmt->execute([
                    $uid,
                    $locationId,
                    $entryType,
                    $workerId,
                    $row['team_id'] ?? null,
                    $row['assignment_date'] ?? $row['date'],
                    $row['time_from'] ?? null,
                    $row['time_to'] ?? null
                ]);
                $created++;
            }
            
            // 5. Execute: updates
            $updated = 0;
            $updateStmt = $this->db->prepare("
                UPDATE assignments 
                SET location_id = ?, entry_type = ?, assignment_date = ?, 
                    time_from = ?, time_to = ?, updated_at = NOW()
                WHERE id = ?
            ");
            
            foreach ($toUpdate as $key => $row) {
                $ass = isset($existingByUid[$key]) ? $existingByUid[$key] : $existingById[$key];
                $entryType = $row['type'] ?? $ass['entry_type'] ?? 'BAUSTELLE';
                $locationId = ($entryType === 'BAUSTELLE') ? ($row['location_id'] ?? $ass['location_id']) : null;
                
                $updateStmt->execute([
                    $locationId,
                    $entryType,
                    $row['assignment_date'] ?? $row['date'] ?? $ass['assignment_date'],
                    $row['time_from'] ?? $ass['time_from'],
                    $row['time_to'] ?? $ass['time_to'],
                    $ass['id']
                ]);
                $updated++;
            }
            
            // 6. Execute: deletes (soft oder hard)
            $deleted = 0;
            $softDeleteStmt = $this->db->prepare("UPDATE assignments SET deleted_at = NOW() WHERE id = ?");
            $hardDeleteStmt = $this->db->prepare("DELETE FROM assignments WHERE id = ?");
            
            foreach ($toDelete as $del) {
                if ($del['soft']) {
                    $softDeleteStmt->execute([$del['id']]);
                } else {
                    $hardDeleteStmt->execute([$del['id']]);
                }
                $deleted++;
            }
            
            $this->db->commit();
            
            return [
                'created' => $created,
                'updated' => $updated,
                'deleted' => $deleted
            ];
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    /**
     * Soft Delete Assignment
     */
    public function softDeleteAssignment($id) {
        $stmt = $this->db->prepare("UPDATE assignments SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Liste Assignments mit Filtern
     */
    public function listAssignments($dateFrom = null, $dateTo = null, $filters = []) {
        $sql = "SELECT * FROM assignments WHERE deleted_at IS NULL";
        $params = [];
        
        if ($dateFrom) {
            $sql .= " AND assignment_date >= ?";
            $params[] = $dateFrom;
        }
        
        if ($dateTo) {
            $sql .= " AND assignment_date <= ?";
            $params[] = $dateTo;
        }
        
        if (!empty($filters['worker_id'])) {
            $sql .= " AND worker_id = ?";
            $params[] = $filters['worker_id'];
        }
        
        if (!empty($filters['location_id'])) {
            $sql .= " AND location_id = ?";
            $params[] = $filters['location_id'];
        }
        
        $sql .= " ORDER BY assignment_date, time_from";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Generiert assignment_uid
     */
    private function generateUid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}



