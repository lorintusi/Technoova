<?php
/**
 * Technoova Database Configuration
 */

define('DB_HOST', 'alefodas.mysql.db.internal'); // Hostpoint Datenbank-Host
define('DB_NAME', 'alefodas_loomone');
define('DB_USER', 'alefodas_loom');
define('DB_PASS', 'Projektone1.');
define('DB_CHARSET', 'utf8mb4');

date_default_timezone_set('Europe/Zurich');

error_reporting(E_ALL);
ini_set('display_errors', 0);

// Only send headers if not already sent and if this is a direct API request
// Don't send headers if config.php is just included
if (!headers_sent() && php_sapi_name() !== 'cli') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    // Only set JSON content type for API requests (not for setup scripts)
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($requestUri, '/api/') !== false || strpos($requestUri, 'api/') !== false) {
        header('Content-Type: application/json; charset=utf-8');
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function getDBConnection() {
    static $conn = null;
    
    if ($conn === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            $conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Don't exit here - let the caller handle the error
            // This allows better error handling in test.php
            throw $e;
        }
    }
    
    return $conn;
}

function sendJSON($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

function getRequestData() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// Load helpers
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/validation.php';