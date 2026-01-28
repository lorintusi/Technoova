<?php
/**
 * Reporting API
 * Plan vs. Ist Auswertungen
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/auth.php';

function handleReporting($method, $type, $currentUser) {
    if (!$currentUser) {
        sendJSON(['success' => false, 'error' => 'Unauthorized'], 401);
    }
    
    $db = getDBConnection();
    
    if ($method !== 'GET') {
        sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
    
    $reportType = $_GET['type'] ?? 'plan_vs_actual';
    
    if ($reportType === 'plan_vs_actual') {
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;
        $workerId = $_GET['worker_id'] ?? null;
        $locationId = $_GET['location_id'] ?? null;
        
        if (!$dateFrom || !$dateTo) {
            sendJSON(['success' => false, 'error' => 'date_from and date_to required'], 400);
        }
        
        // Check permissions
        $currentWorkerId = $currentUser['worker_id'] ?? null;
        $isAdmin = $currentUser['role'] === 'Admin' || hasPermission($currentUser, 'Verwalten');
        
        if (!$isAdmin && $workerId && $workerId !== $currentWorkerId) {
            sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
        }
        
        if (!$isAdmin && !$workerId) {
            $workerId = $currentWorkerId;
        }
        
        // Use ReportingService
        require_once __DIR__ . '/../services/ReportingService.php';
        $service = new ReportingService($db);
        
        $filters = [];
        if ($workerId) $filters['worker_id'] = $workerId;
        if ($locationId) $filters['location_id'] = $locationId;
        
        $result = $service->planVsActual($dateFrom, $dateTo, $filters);
        
        sendJSON([
            'success' => true,
            'data' => $result,
            'from' => $dateFrom,
            'to' => $dateTo
        ]);
    } else {
        sendJSON(['success' => false, 'error' => 'Unknown report type'], 400);
    }
}



