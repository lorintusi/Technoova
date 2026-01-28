<?php
/**
 * Direct test endpoint - bypasses routing
 */

// Error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display, but log

// Set headers first, before including config.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    // Include config.php
    require_once __DIR__ . '/../config.php';
    
    // Check if functions are available (they should be from config.php)
    if (!function_exists('getDBConnection')) {
        throw new Exception('getDBConnection function not found');
    }
    
    if (!function_exists('sendJSON')) {
        // Define sendJSON if not already defined
        function sendJSON($data, $statusCode = 200) {
            http_response_code($statusCode);
            echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit();
        }
    }
    
    // Test database connection
    $db = getDBConnection();
    
    // Test database connection
    $db->query("SELECT 1");
    
    // Get table counts
    $tables = [
        'users' => null,
        'workers' => null,
        'teams' => null,
        'locations' => null,
        'assignments' => null,
        'team_members' => null
    ];
    
    foreach ($tables as $table => &$count) {
        try {
            $result = $db->query("SELECT COUNT(*) FROM `$table`");
            $count = (int)$result->fetchColumn();
        } catch (PDOException $e) {
            // Table might not exist yet
            $count = null;
        }
    }
    
    // Get database info
    $dbInfo = $db->query("SELECT DATABASE() as db_name")->fetch();
    
    sendJSON([
        'success' => true,
        'message' => 'Database connection successful!',
        'database' => DB_NAME,
        'host' => DB_HOST,
        'tables' => $tables,
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => PHP_VERSION
    ]);
    
} catch (PDOException $e) {
    // PDO specific error
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Database connection failed',
        'database' => defined('DB_NAME') ? DB_NAME : 'unknown',
        'host' => defined('DB_HOST') ? DB_HOST : 'unknown',
        'type' => 'PDOException'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
} catch (Exception $e) {
    // General error
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Error occurred',
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'type' => get_class($e)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
} catch (Error $e) {
    // Fatal error (PHP 7+)
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Fatal error occurred',
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'type' => get_class($e)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

