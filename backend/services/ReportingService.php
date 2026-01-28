<?php
/**
 * Reporting Service
 * Plan vs. Ist Analysen
 */

class ReportingService {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Plan vs. Ist Vergleich
     * 
     * @param string $dateFrom Start-Datum
     * @param string $dateTo End-Datum
     * @param array $filters ['worker_id', 'location_id']
     * @return array Aggregierte Daten pro Tag/Worker/Location
     */
    public function planVsActual($dateFrom, $dateTo, $filters = []) {
        // Plan: assignments (geplante Stunden)
        $planSql = "
            SELECT 
                a.assignment_date as date,
                a.worker_id,
                a.location_id,
                l.code as location_code,
                SUM(
                    TIME_TO_SEC(COALESCE(a.time_to, '00:00:00')) - 
                    TIME_TO_SEC(COALESCE(a.time_from, '00:00:00'))
                ) / 3600 as planned_hours,
                COUNT(*) as assignment_count
            FROM assignments a
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.assignment_date >= ? 
              AND a.assignment_date <= ?
              AND a.deleted_at IS NULL
        ";
        
        $planParams = [$dateFrom, $dateTo];
        
        if (!empty($filters['worker_id'])) {
            $planSql .= " AND a.worker_id = ?";
            $planParams[] = $filters['worker_id'];
        }
        
        if (!empty($filters['location_id'])) {
            $planSql .= " AND a.location_id = ?";
            $planParams[] = $filters['location_id'];
        }
        
        $planSql .= " GROUP BY a.assignment_date, a.worker_id, a.location_id";
        
        $stmt = $this->db->prepare($planSql);
        $stmt->execute($planParams);
        $planned = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Ist: time_entries (erfasste Stunden)
        $actualSql = "
            SELECT 
                te.entry_date as date,
                te.worker_id,
                te.location_id,
                l.code as location_code,
                SUM(te.hours) as actual_hours,
                COUNT(*) as entry_count
            FROM time_entries te
            LEFT JOIN locations l ON te.location_id = l.id
            WHERE te.entry_date >= ? 
              AND te.entry_date <= ?
        ";
        
        $actualParams = [$dateFrom, $dateTo];
        
        if (!empty($filters['worker_id'])) {
            $actualSql .= " AND te.worker_id = ?";
            $actualParams[] = $filters['worker_id'];
        }
        
        if (!empty($filters['location_id'])) {
            $actualSql .= " AND te.location_id = ?";
            $actualParams[] = $filters['location_id'];
        }
        
        $actualSql .= " GROUP BY te.entry_date, te.worker_id, te.location_id";
        
        $stmt = $this->db->prepare($actualSql);
        $stmt->execute($actualParams);
        $actual = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Zusammenführen
        $result = [];
        $key = function($date, $workerId, $locationId) {
            return "$date|$workerId|" . ($locationId ?? 'NULL');
        };
        
        // Plan-Daten
        foreach ($planned as $row) {
            $k = $key($row['date'], $row['worker_id'], $row['location_id']);
            $result[$k] = [
                'date' => $row['date'],
                'worker_id' => $row['worker_id'],
                'location_id' => $row['location_id'],
                'location_code' => $row['location_code'],
                'planned_hours' => (float)$row['planned_hours'],
                'actual_hours' => 0,
                'delta_hours' => 0,
                'assignment_count' => (int)$row['assignment_count'],
                'entry_count' => 0
            ];
        }
        
        // Ist-Daten hinzufügen/merge
        foreach ($actual as $row) {
            $k = $key($row['date'], $row['worker_id'], $row['location_id']);
            if (isset($result[$k])) {
                $result[$k]['actual_hours'] = (float)$row['actual_hours'];
                $result[$k]['entry_count'] = (int)$row['entry_count'];
                $result[$k]['delta_hours'] = $result[$k]['actual_hours'] - $result[$k]['planned_hours'];
            } else {
                $result[$k] = [
                    'date' => $row['date'],
                    'worker_id' => $row['worker_id'],
                    'location_id' => $row['location_id'],
                    'location_code' => $row['location_code'],
                    'planned_hours' => 0,
                    'actual_hours' => (float)$row['actual_hours'],
                    'delta_hours' => (float)$row['actual_hours'],
                    'assignment_count' => 0,
                    'entry_count' => (int)$row['entry_count']
                ];
            }
        }
        
        return array_values($result);
    }
}



