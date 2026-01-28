<?php
/**
 * LoomOne API Router
 * RESTful API for LoomOne Application
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/users.php';
require_once __DIR__ . '/workers.php';
require_once __DIR__ . '/teams.php';
require_once __DIR__ . '/locations.php';
require_once __DIR__ . '/assignments.php';
require_once __DIR__ . '/time_entries.php';
require_once __DIR__ . '/admin_overview.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
// Support method override via _method parameter (for DELETE with body)
if ($method === 'POST') {
    $rawData = file_get_contents('php://input');
    $postData = json_decode($rawData, true) ?? [];
    if (isset($postData['_method'])) {
        $method = strtoupper($postData['_method']);
    }
}
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove /backend/api or /api from path
$path = str_replace('/backend/api', '', $path);
$path = str_replace('/api', '', $path);
$path = trim($path, '/');
$segments = array_filter(explode('/', $path));

// Route the request
try {
    // Get first segment (resource)
    $resource = isset($segments[0]) ? $segments[0] : '';
    $id = isset($segments[1]) ? $segments[1] : null;
    
    // Authentication endpoint
    if ($resource === 'auth' && $method === 'POST') {
        handleAuth();
        exit();
    }
    
    // Current user endpoint (check session)
    if ($resource === 'me' && $method === 'GET') {
        $currentUser = checkAuth();
        if (!$currentUser) {
            sendJSON(['success' => false, 'error' => 'Unauthorized'], 401);
        }
        sendJSON(['success' => true, 'user' => $currentUser]);
        exit();
    }
    
    // Test endpoint (no auth required for testing)
    if ($resource === 'test' && $method === 'GET') {
        handleTest();
        exit();
    }
    
    // Test endpoint - also handle empty path as test
    if (empty($resource) && $method === 'GET') {
        // Show API info
        sendJSON([
            'success' => true,
            'message' => 'LoomOne API is running',
            'endpoints' => [
                'test' => '/api/test',
                'auth' => '/api/auth (POST)',
                'me' => '/api/me (GET, check current session)',
                'dashboard' => '/api/dashboard (GET, requires auth)',
                'users' => '/api/users (GET/POST/PUT/DELETE)',
                'workers' => '/api/workers (GET/POST/PUT/DELETE)',
                'teams' => '/api/teams (GET/POST/PUT/DELETE)',
                'locations' => '/api/locations (GET/POST/PUT/DELETE)',
                'assignments' => '/api/assignments (GET/POST/PUT/DELETE)'
            ]
        ]);
        exit();
    }
    
    // Check authentication for all other endpoints
    $currentUser = checkAuth();
    if (!$currentUser) {
        sendJSON(['success' => false, 'error' => 'Unauthorized'], 401);
    }
    
    // Route based on resource (already set above)
    switch ($resource) {
        case 'users':
            handleUsers($method, $id, $currentUser);
            break;
            
        case 'workers':
            handleWorkers($method, $id, $currentUser);
            break;
            
        case 'teams':
            handleTeams($method, $id, $currentUser);
            break;
            
        case 'locations':
            handleLocations($method, $id, $currentUser);
            break;
            
        case 'assignments':
            handleAssignments($method, $id, $currentUser);
            break;
            
        case 'time_entries':
            // Handle special actions like confirm_day
            if (isset($segments[1]) && $segments[1] === 'confirm_day' && $method === 'POST') {
                handleConfirmDay($currentUser);
            } else {
                $action = isset($segments[1]) ? $segments[1] : null;
                handleTimeEntries($method, $id, $action, $currentUser);
            }
            break;
            
        case 'admin':
            // Admin-only endpoints
            if (isset($segments[1]) && $segments[1] === 'overview') {
                // Support /admin/overview/week
                if (isset($segments[2]) && $segments[2] === 'week') {
                    handleAdminOverview($method, $currentUser);
                } else {
                    handleAdminOverview($method, $currentUser);
                }
            } elseif (isset($segments[1]) && $segments[1] === 'cleanup_planned') {
                // PHASE 1: Admin-only cleanup endpoint for PLANNED entries
                handleAdminCleanupPlanned($method, $currentUser);
            } else {
                sendJSON(['success' => false, 'error' => 'Admin endpoint not found'], 404);
            }
            break;
            
        case 'dashboard':
            handleDashboard($currentUser);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Endpoint not found'], 404);
    }
    
} catch (Exception $e) {
    sendJSON([
        'success' => false,
        'error' => $e->getMessage()
    ], 500);
}

// Test endpoint (no authentication required)
function handleTest() {
    try {
        $db = getDBConnection();
        
        // Test database connection
        $db->query("SELECT 1");
        
        // Get table counts
        $tables = [
            'users' => 0,
            'workers' => 0,
            'teams' => 0,
            'locations' => 0,
            'assignments' => 0
        ];
        
        foreach ($tables as $table => &$count) {
            try {
                $result = $db->query("SELECT COUNT(*) FROM $table");
                $count = (int)$result->fetchColumn();
            } catch (PDOException $e) {
                // Table might not exist yet
                $count = null;
            }
        }
        
        sendJSON([
            'success' => true,
            'message' => 'Database connection successful!',
            'database' => DB_NAME,
            'host' => DB_HOST,
            'tables' => $tables,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        sendJSON([
            'success' => false,
            'error' => $e->getMessage(),
            'message' => 'Database connection failed'
        ], 500);
    }
}

// Dashboard endpoint
function handleDashboard($currentUser) {
    $db = getDBConnection();
    
    // Get statistics
    $stats = [
        'workers' => 0,
        'teams' => 0,
        'locations' => 0,
        'assignments_today' => 0
    ];
    
    $stats['workers'] = $db->query("SELECT COUNT(*) FROM workers")->fetchColumn();
    $stats['teams'] = $db->query("SELECT COUNT(*) FROM teams WHERE is_active = 1")->fetchColumn();
    $stats['locations'] = $db->query("SELECT COUNT(*) FROM locations")->fetchColumn();
    $stats['assignments_today'] = $db->query("SELECT COUNT(*) FROM assignments WHERE assignment_date = CURDATE()")->fetchColumn();
    
    sendJSON([
        'success' => true,
        'data' => $stats
    ]);
}

