<?php
/**
 * Script to fix user-worker relationship
 * Ensures user "Ibni.z" has a worker_id assigned
 */

require_once __DIR__ . '/config.php';

try {
    $db = getDBConnection();
    
    // Find user "Ibni.z"
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute(['Ibni.z']);
    $user = $stmt->fetch();
    
    if (!$user) {
        die("User 'Ibni.z' nicht gefunden in der Datenbank.\n");
    }
    
    echo "User gefunden: {$user['username']} (ID: {$user['id']})\n";
    echo "Aktuelle worker_id: " . ($user['worker_id'] ?? 'NULL') . "\n\n";
    
    // Check if user already has a worker_id
    if (!empty($user['worker_id'])) {
        // Verify that the worker exists
        $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
        $stmt->execute([$user['worker_id']]);
        $worker = $stmt->fetch();
        
        if ($worker) {
            echo "✓ User hat bereits eine worker_id: {$user['worker_id']}\n";
            echo "✓ Worker existiert: {$worker['name']}\n";
            echo "\nAlles ist korrekt konfiguriert!\n";
            exit(0);
        } else {
            echo "⚠ Worker mit ID '{$user['worker_id']}' existiert nicht!\n";
        }
    }
    
    // Try to find a worker by name (could be "Ibni" or similar)
    $searchNames = ['Ibni', 'ibni', 'Ibni.z', 'ibni.z'];
    $worker = null;
    
    foreach ($searchNames as $searchName) {
        $stmt = $db->prepare("SELECT * FROM workers WHERE name LIKE ?");
        $stmt->execute(["%{$searchName}%"]);
        $worker = $stmt->fetch();
        if ($worker) {
            echo "Worker gefunden: {$worker['name']} (ID: {$worker['id']})\n";
            break;
        }
    }
    
    if (!$worker) {
        // Create a new worker for this user
        echo "Kein Worker gefunden. Erstelle neuen Worker...\n";
        
        // Extract name from username (Ibni.z -> Ibni)
        $workerName = explode('.', $user['username'])[0];
        $workerName = ucfirst($workerName); // Capitalize first letter
        
        // Try to get full name from user table
        if (!empty($user['name'])) {
            $workerName = $user['name'];
        }
        
        $workerId = 'worker-' . uniqid();
        
        $stmt = $db->prepare("
            INSERT INTO workers (id, name, status, created_at, updated_at)
            VALUES (?, ?, 'Arbeitsbereit', NOW(), NOW())
        ");
        $stmt->execute([$workerId, $workerName]);
        
        echo "✓ Neuer Worker erstellt: {$workerName} (ID: {$workerId})\n";
        $worker = ['id' => $workerId, 'name' => $workerName];
    }
    
    // Update user with worker_id
    $stmt = $db->prepare("UPDATE users SET worker_id = ? WHERE id = ?");
    $stmt->execute([$worker['id'], $user['id']]);
    
    echo "\n✓ User '{$user['username']}' wurde mit Worker '{$worker['name']}' (ID: {$worker['id']}) verknüpft.\n";
    echo "\nFertig! Der User sollte jetzt seine Zuweisungen sehen können.\n";
    
} catch (Exception $e) {
    echo "Fehler: " . $e->getMessage() . "\n";
    exit(1);
}

