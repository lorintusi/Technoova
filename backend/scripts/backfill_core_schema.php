<?php
/**
 * Backfill Script: Core Schema
 * Setzt assignment_uid für vorhandene Einträge und bietet Auto-Link Vorschläge
 */

require_once __DIR__ . '/../config.php';

function generateUUID() {
    // Einfache UUID v4 Generierung (für MySQL ohne UUID() Funktion)
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

try {
    $db = getDBConnection();
    $db->beginTransaction();
    
    echo "=== BACKFILL CORE SCHEMA ===\n";
    echo "Start: " . date('Y-m-d H:i:s') . "\n\n";
    
    // ====================================================================
    // 1. assignment_uid für vorhandene assignments setzen
    // ====================================================================
    echo "1. Backfill assignment_uid...\n";
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM assignments WHERE assignment_uid IS NULL");
    $result = $stmt->fetch();
    $nullCount = (int)$result['count'];
    
    echo "   Gefunden: $nullCount Einträge ohne assignment_uid\n";
    
    if ($nullCount > 0) {
        $stmt = $db->prepare("SELECT id FROM assignments WHERE assignment_uid IS NULL");
        $stmt->execute();
        $assignments = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $updateStmt = $db->prepare("UPDATE assignments SET assignment_uid = ? WHERE id = ?");
        $updated = 0;
        
        foreach ($assignments as $assignmentId) {
            $uid = generateUUID();
            $updateStmt->execute([$uid, $assignmentId]);
            $updated++;
        }
        
        echo "   Aktualisiert: $updated Einträge\n";
    }
    
    // Unique Index auf assignment_uid erstellen (falls noch nicht vorhanden)
    echo "\n2. Unique Index auf assignment_uid erstellen...\n";
    
    $stmt = $db->query("
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'assignments' 
          AND INDEX_NAME = 'idx_assignment_uid'
    ");
    $result = $stmt->fetch();
    
    if ((int)$result['count'] === 0) {
        $db->exec("CREATE UNIQUE INDEX idx_assignment_uid ON assignments(assignment_uid)");
        echo "   Index erstellt\n";
    } else {
        echo "   Index existiert bereits\n";
    }
    
    // ====================================================================
    // 2. Auto-Link Vorschläge für time_entries -> assignments
    // ====================================================================
    echo "\n3. Auto-Link Vorschläge generieren...\n";
    
    $stmt = $db->query("
        SELECT 
            te.id as time_entry_id,
            te.worker_id,
            te.entry_date,
            te.location_id as te_location_id,
            te.time_from as te_from,
            te.time_to as te_to,
            a.id as assignment_id,
            a.assignment_uid,
            a.location_id as a_location_id,
            a.time_from as a_from,
            a.time_to as a_to
        FROM time_entries te
        LEFT JOIN assignments a ON (
            te.worker_id = a.worker_id 
            AND te.entry_date = a.assignment_date
            AND a.deleted_at IS NULL
        )
        WHERE te.assignment_id IS NULL
        ORDER BY te.entry_date DESC, te.worker_id
        LIMIT 100
    ");
    
    $suggestions = [];
    while ($row = $stmt->fetch()) {
        $matches = false;
        $confidence = 'low';
        
        // Match-Kriterien:
        // 1. Gleicher Worker + gleiches Datum
        if ($row['assignment_id']) {
            // 2. Location match (beide gesetzt und gleich)
            if ($row['te_location_id'] && $row['a_location_id'] && 
                $row['te_location_id'] === $row['a_location_id']) {
                $matches = true;
                $confidence = 'high';
            }
            // 3. Zeit-Overlap (auch wenn Location nicht matcht)
            elseif ($row['te_from'] && $row['a_from'] && $row['te_to'] && $row['a_to']) {
                // Prüfe Overlap
                $teFrom = strtotime($row['te_from']);
                $teTo = strtotime($row['te_to']);
                $aFrom = strtotime($row['a_from']);
                $aTo = strtotime($row['a_to']);
                
                if (!($teTo <= $aFrom || $teFrom >= $aTo)) {
                    $matches = true;
                    $confidence = $row['te_location_id'] === $row['a_location_id'] ? 'high' : 'medium';
                }
            }
            // 4. Nur gleicher Worker + Datum (keine Zeit/Location Info)
            elseif (!$row['te_from'] && !$row['a_from']) {
                $matches = true;
                $confidence = 'low';
            }
        }
        
        if ($matches) {
            $suggestions[] = [
                'time_entry_id' => $row['time_entry_id'],
                'assignment_id' => $row['assignment_id'],
                'assignment_uid' => $row['assignment_uid'],
                'worker_id' => $row['worker_id'],
                'date' => $row['entry_date'],
                'confidence' => $confidence,
                'te_location' => $row['te_location_id'],
                'a_location' => $row['a_location_id'],
                'te_time' => $row['te_from'] . '-' . $row['te_to'],
                'a_time' => $row['a_from'] . '-' . $row['a_to']
            ];
        }
    }
    
    echo "   Gefunden: " . count($suggestions) . " mögliche Links\n";
    
    if (count($suggestions) > 0) {
        $highConfidence = array_filter($suggestions, fn($s) => $s['confidence'] === 'high');
        $mediumConfidence = array_filter($suggestions, fn($s) => $s['confidence'] === 'medium');
        $lowConfidence = array_filter($suggestions, fn($s) => $s['confidence'] === 'low');
        
        echo "   - High confidence: " . count($highConfidence) . "\n";
        echo "   - Medium confidence: " . count($mediumConfidence) . "\n";
        echo "   - Low confidence: " . count($lowConfidence) . "\n";
        
        // Report in Datei schreiben
        $reportFile = __DIR__ . '/../reports/auto_link_suggestions_' . date('Ymd_His') . '.json';
        if (!is_dir(dirname($reportFile))) {
            mkdir(dirname($reportFile), 0755, true);
        }
        file_put_contents($reportFile, json_encode($suggestions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo "   Report gespeichert: $reportFile\n";
        echo "   HINWEIS: Links werden NICHT automatisch gesetzt. Manuell prüfen!\n";
    }
    
    // ====================================================================
    // 3. Backfill primary_team_id -> team_members (wenn primary_team_id gesetzt aber kein team_members Eintrag)
    // ====================================================================
    echo "\n4. Backfill team_members aus primary_team_id...\n";
    
    $stmt = $db->query("
        SELECT w.id as worker_id, w.primary_team_id 
        FROM workers w
        LEFT JOIN team_members tm ON w.id = tm.worker_id AND w.primary_team_id = tm.team_id
        WHERE w.primary_team_id IS NOT NULL AND tm.worker_id IS NULL
    ");
    
    $workersToLink = $stmt->fetchAll();
    $linked = 0;
    
    if (count($workersToLink) > 0) {
        echo "   Gefunden: " . count($workersToLink) . " Workers mit primary_team_id aber ohne team_members Eintrag\n";
        
        $insertStmt = $db->prepare("INSERT IGNORE INTO team_members (team_id, worker_id) VALUES (?, ?)");
        
        foreach ($workersToLink as $worker) {
            $insertStmt->execute([$worker['primary_team_id'], $worker['worker_id']]);
            $linked++;
        }
        
        echo "   Verknüpft: $linked Workers\n";
    } else {
        echo "   Keine fehlenden Verknüpfungen gefunden\n";
    }
    
    $db->commit();
    
    echo "\n=== BACKFILL ABGESCHLOSSEN ===\n";
    echo "Ende: " . date('Y-m-d H:i:s') . "\n";
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "FEHLER: " . $e->getMessage() . "\n";
    exit(1);
}



