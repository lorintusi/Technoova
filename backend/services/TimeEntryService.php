<?php
/**
 * Time Entry Service
 * Zentrale Geschäftslogik für Zeiterfassung
 */

class TimeEntryService {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Validiert Time Entry
     */
    public function validateTimeEntry($data, $excludeId = null) {
        $errors = [];
        
        // Required fields
        if (empty($data['worker_id'])) {
            $errors[] = 'Worker ID erforderlich';
        }
        
        if (empty($data['date'])) {
            $errors[] = 'Datum erforderlich';
        }
        
        if (empty($data['time_from'])) {
            $errors[] = 'Startzeit erforderlich';
        }
        
        if (empty($data['time_to'])) {
            $errors[] = 'Endzeit erforderlich';
        }
        
        // 15-Minuten-Intervalle
        if (isset($data['time_from']) && !$this->validateTimeInterval($data['time_from'])) {
            $errors[] = 'Startzeit muss in 15-Minuten-Intervallen sein (00, 15, 30, 45)';
        }
        
        if (isset($data['time_to']) && !$this->validateTimeInterval($data['time_to'])) {
            $errors[] = 'Endzeit muss in 15-Minuten-Intervallen sein (00, 15, 30, 45)';
        }
        
        // Zeit-Ordnung
        if (isset($data['time_from']) && isset($data['time_to'])) {
            if (strtotime($data['time_from']) >= strtotime($data['time_to'])) {
                $errors[] = 'Endzeit muss nach Startzeit liegen';
            }
        }
        
        // Overlap-Check (wenn nicht auto-replace)
        if (!empty($data['time_from']) && !empty($data['time_to']) && 
            !empty($data['worker_id']) && !empty($data['date']) &&
            empty($data['auto_replace'])) {
            
            if ($this->checkTimeOverlap($data['worker_id'], $data['date'], 
                $data['time_from'], $data['time_to'], $excludeId)) {
                $errors[] = 'Zeiteintrag überlappt mit bestehendem Eintrag';
            }
        }
        
        if (!empty($errors)) {
            throw new Exception(implode('; ', $errors));
        }
        
        return true;
    }
    
    /**
     * Erstellt Time Entry
     */
    public function create($data, $userId) {
        $this->validateTimeEntry($data);
        
        // Auto-replace für KRANKHEIT/FERIEN
        if (!empty($data['auto_replace']) && 
            in_array($data['category'] ?? '', ['KRANKHEIT', 'FERIEN'])) {
            
            $deleteStmt = $this->db->prepare("DELETE FROM time_entries WHERE worker_id = ? AND entry_date = ?");
            $deleteStmt->execute([$data['worker_id'], $data['date']]);
        }
        
        $hours = $this->calculateHours($data['time_from'], $data['time_to']);
        $entryType = $this->mapCategoryToEntryType($data['category'] ?? 'BUERO_ALLGEMEIN');
        
        $stmt = $this->db->prepare("
            INSERT INTO time_entries (
                worker_id, location_id, assignment_id, entry_date, entry_type, 
                category, time_from, time_to, hours, notes, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['worker_id'],
            $data['location_id'] ?? null,
            $data['assignment_id'] ?? null,
            $data['date'],
            $entryType,
            $data['category'] ?? 'BUERO_ALLGEMEIN',
            $data['time_from'],
            $data['time_to'],
            $hours,
            $data['notes'] ?? null,
            $userId,
            $userId
        ]);
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Aktualisiert Time Entry
     */
    public function update($id, $data, $userId) {
        $existing = $this->getById($id);
        if (!$existing) {
            throw new Exception('Time entry nicht gefunden');
        }
        
        // Merge mit existing für Validierung
        $merged = array_merge($existing, $data);
        $merged['date'] = $merged['date'] ?? $existing['entry_date'];
        $this->validateTimeEntry($merged, $id);
        
        $updates = [];
        $params = [];
        
        if (isset($data['time_from'])) {
            $updates[] = "time_from = ?";
            $params[] = $data['time_from'];
        }
        
        if (isset($data['time_to'])) {
            $updates[] = "time_to = ?";
            $params[] = $data['time_to'];
        }
        
        if (isset($data['time_from']) && isset($data['time_to'])) {
            $updates[] = "hours = ?";
            $params[] = $this->calculateHours($data['time_from'], $data['time_to']);
        }
        
        if (isset($data['category'])) {
            $updates[] = "category = ?";
            $updates[] = "entry_type = ?";
            $params[] = $data['category'];
            $params[] = $this->mapCategoryToEntryType($data['category']);
        }
        
        if (isset($data['notes'])) {
            $updates[] = "notes = ?";
            $params[] = $data['notes'];
        }
        
        if (isset($data['assignment_id'])) {
            $updates[] = "assignment_id = ?";
            $params[] = $data['assignment_id'];
        }
        
        if (empty($updates)) {
            throw new Exception('Keine Felder zum Aktualisieren');
        }
        
        $updates[] = "updated_by = ?";
        $updates[] = "updated_at = NOW()";
        $params[] = $userId;
        $params[] = $id;
        
        $sql = "UPDATE time_entries SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return true;
    }
    
    /**
     * Löscht Time Entry
     */
    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM time_entries WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Verknüpft Time Entry mit Assignment
     */
    public function linkToAssignment($timeEntryId, $assignmentId) {
        $stmt = $this->db->prepare("UPDATE time_entries SET assignment_id = ? WHERE id = ?");
        $stmt->execute([$assignmentId, $timeEntryId]);
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Liste Time Entries
     */
    public function listTimeEntries($dateFrom = null, $dateTo = null, $filters = []) {
        $sql = "SELECT te.*, l.code as location_code, l.address as location_address 
                FROM time_entries te
                LEFT JOIN locations l ON te.location_id = l.id
                WHERE 1=1";
        $params = [];
        
        if ($dateFrom) {
            $sql .= " AND te.entry_date >= ?";
            $params[] = $dateFrom;
        }
        
        if ($dateTo) {
            $sql .= " AND te.entry_date <= ?";
            $params[] = $dateTo;
        }
        
        if (!empty($filters['worker_id'])) {
            $sql .= " AND te.worker_id = ?";
            $params[] = $filters['worker_id'];
        }
        
        if (!empty($filters['assignment_id'])) {
            $sql .= " AND te.assignment_id = ?";
            $params[] = $filters['assignment_id'];
        }
        
        $sql .= " ORDER BY te.entry_date, te.time_from";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Holt Time Entry nach ID
     */
    public function getById($id) {
        $stmt = $this->db->prepare("SELECT * FROM time_entries WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Helper-Funktionen
    
    private function validateTimeInterval($time) {
        if (!preg_match('/^(\d{1,2}):(\d{2})$/', $time, $matches)) {
            return false;
        }
        $minute = (int)$matches[2];
        return in_array($minute, [0, 15, 30, 45]);
    }
    
    private function checkTimeOverlap($workerId, $date, $timeFrom, $timeTo, $excludeId = null) {
        $sql = "
            SELECT id FROM time_entries 
            WHERE worker_id = ? AND entry_date = ?
            AND (
                (time_from <= ? AND time_to > ?) OR
                (time_from < ? AND time_to >= ?) OR
                (time_from >= ? AND time_to <= ?)
            )
        ";
        
        $params = [$workerId, $date, $timeFrom, $timeFrom, $timeTo, $timeTo, $timeFrom, $timeTo];
        
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() !== false;
    }
    
    private function calculateHours($timeFrom, $timeTo) {
        $from = strtotime($timeFrom);
        $to = strtotime($timeTo);
        $seconds = $to - $from;
        return round($seconds / 3600, 2);
    }
    
    private function mapCategoryToEntryType($category) {
        $map = [
            'BUERO_ALLGEMEIN' => 'BUERO_ALLGEMEIN',
            'ENTWICKLUNG' => 'BUERO_ALLGEMEIN',
            'MEETING' => 'BUERO_ALLGEMEIN',
            'KRANKHEIT' => 'KRANK',
            'TRAINING' => 'BUERO_ALLGEMEIN',
            'PAUSE' => 'BUERO_ALLGEMEIN'
        ];
        return $map[$category] ?? 'BUERO_ALLGEMEIN';
    }
}



