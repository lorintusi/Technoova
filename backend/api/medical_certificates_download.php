<?php
/**
 * Medical Certificate Download Endpoint
 * Streams file with permission checks
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/auth.php';

// Check authentication
$currentUser = checkAuth();
if (!$currentUser) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// Get certificate ID from path
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/backend/api', '', $path);
$path = str_replace('/api', '', $path);
$segments = array_filter(explode('/', trim($path, '/')));

if (!isset($segments[1]) || $segments[1] !== 'download' || !isset($segments[0])) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Invalid endpoint']);
    exit();
}

$certificateId = $segments[0];

$db = getDBConnection();

// Get certificate
$stmt = $db->prepare("SELECT * FROM medical_certificates WHERE id = ?");
$stmt->execute([$certificateId]);
$certificate = $stmt->fetch();

if (!$certificate) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Certificate not found']);
    exit();
}

// Permission check
$isAdmin = hasPermission($currentUser, 'Verwalten') || hasPermission($currentUser, 'view_all');
if (!$isAdmin && $currentUser['worker_id'] !== $certificate['worker_id']) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Permission denied']);
    exit();
}

// Get file path (security: ensure path is within uploads directory)
$storagePath = $certificate['storage_path'];
// Remove any path traversal attempts
$storagePath = str_replace(['../', '..\\', '/', '\\'], '', basename($storagePath));
$uploadDir = __DIR__ . '/../uploads/medical_certificates/';
$filePath = $uploadDir . basename($certificate['storage_path']);

// Security: ensure file is within upload directory
$realUploadDir = realpath($uploadDir);
$realFilePath = realpath($filePath);
if (!$realFilePath || strpos($realFilePath, $realUploadDir) !== 0) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit();
}

if (!file_exists($filePath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit();
}

// Set headers for download
header('Content-Type: ' . $certificate['mime_type']);
header('Content-Disposition: attachment; filename="' . addslashes($certificate['filename_original']) . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: private, max-age=0, must-revalidate');
header('Pragma: public');

// Stream file
readfile($filePath);
exit();

