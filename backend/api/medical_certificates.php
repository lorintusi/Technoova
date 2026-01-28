<?php
/**
 * Medical Certificates API
 * Handles upload, list, and delete operations for medical certificates
 */

function handleMedicalCertificates($method, $id, $currentUser) {
    $db = getDBConnection();
    
    switch ($method) {
        case 'GET':
            if ($id && isset($_GET['action']) && $_GET['action'] === 'download') {
                // Download handled by separate endpoint
                return;
            }
            
            // List certificates with filters
            $workerId = $_GET['worker_id'] ?? null;
            $dateFrom = $_GET['date_from'] ?? null;
            $dateTo = $_GET['date_to'] ?? null;
            $planningEntryId = $_GET['planning_entry_id'] ?? null;
            
            // Permission check: Worker can only see their own certificates
            $isAdmin = hasPermission($currentUser, 'Verwalten') || hasPermission($currentUser, 'view_all');
            if (!$isAdmin && $currentUser['worker_id']) {
                // Worker: force filter to own worker_id
                $workerId = $currentUser['worker_id'];
            }
            
            $query = "SELECT 
                mc.*,
                w.name as worker_name,
                u.name as uploaded_by_name,
                pe.category as planning_category,
                pe.date as planning_date
            FROM medical_certificates mc
            LEFT JOIN workers w ON mc.worker_id = w.id
            LEFT JOIN users u ON mc.uploaded_by_user_id = u.id
            LEFT JOIN week_planning pe ON mc.planning_entry_id = pe.id
            WHERE 1=1";
            
            $params = [];
            
            if ($workerId) {
                $query .= " AND mc.worker_id = ?";
                $params[] = $workerId;
            }
            
            if ($dateFrom) {
                $query .= " AND mc.date >= ?";
                $params[] = $dateFrom;
            }
            
            if ($dateTo) {
                $query .= " AND mc.date <= ?";
                $params[] = $dateTo;
            }
            
            if ($planningEntryId) {
                $query .= " AND mc.planning_entry_id = ?";
                $params[] = $planningEntryId;
            }
            
            // Worker can only see their own
            if (!$isAdmin && $currentUser['worker_id']) {
                $query .= " AND mc.worker_id = ?";
                $params[] = $currentUser['worker_id'];
            }
            
            $query .= " ORDER BY mc.date DESC, mc.uploaded_at DESC";
            
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $certificates = $stmt->fetchAll();
            
            // Normalize field names (snake_case to camelCase)
            foreach ($certificates as &$cert) {
                $cert['workerId'] = $cert['worker_id'];
                $cert['planningEntryId'] = $cert['planning_entry_id'];
                $cert['filenameOriginal'] = $cert['filename_original'];
                $cert['filenameStored'] = $cert['filename_stored'];
                $cert['mimeType'] = $cert['mime_type'];
                $cert['sizeBytes'] = $cert['size_bytes'];
                $cert['storagePath'] = $cert['storage_path'];
                $cert['uploadedByUserId'] = $cert['uploaded_by_user_id'];
                $cert['uploadedAt'] = $cert['uploaded_at'];
                $cert['workerName'] = $cert['worker_name'];
                $cert['uploadedByName'] = $cert['uploaded_by_name'];
                $cert['planningCategory'] = $cert['planning_category'];
                $cert['planningDate'] = $cert['planning_date'];
            }
            
            sendJSON(['success' => true, 'data' => $certificates]);
            break;
            
        case 'POST':
            // Upload new certificate (multipart/form-data)
            if (!hasPermission($currentUser, 'Schreiben')) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            // Check if file was uploaded
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                sendJSON(['success' => false, 'error' => 'No file uploaded or upload error'], 400);
            }
            
            $file = $_FILES['file'];
            $workerId = $_POST['worker_id'] ?? null;
            $date = $_POST['date'] ?? null;
            $planningEntryId = $_POST['planning_entry_id'] ?? null;
            $note = $_POST['note'] ?? null;
            
            // Validation
            if (!$workerId || !$date) {
                sendJSON(['success' => false, 'error' => 'worker_id and date are required'], 400);
            }
            
            // Permission check: Worker can only upload for themselves
            if (!$isAdmin && $currentUser['worker_id'] !== $workerId) {
                sendJSON(['success' => false, 'error' => 'You can only upload certificates for yourself'], 403);
            }
            
            // Validate file type
            $allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
            $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
            
            $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($fileInfo, $file['tmp_name']);
            finfo_close($fileInfo);
            
            // Sanitize filename and extract extension
            $originalFilename = basename($file['name']); // Remove path components
            $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
            
            // Security: Check both MIME type AND extension whitelist
            if (!in_array($extension, $allowedExtensions)) {
                sendJSON(['success' => false, 'error' => 'Invalid file extension. Only PDF, JPG, and PNG are allowed'], 400);
            }
            if (!in_array($mimeType, $allowedMimeTypes)) {
                sendJSON(['success' => false, 'error' => 'Invalid file type. Only PDF, JPG, and PNG are allowed'], 400);
            }
            
            // Validate file size (max 10MB)
            $maxSize = 10 * 1024 * 1024; // 10MB
            if ($file['size'] > $maxSize) {
                sendJSON(['success' => false, 'error' => 'File too large. Maximum size is 10MB'], 400);
            }
            
            // Create upload directory if it doesn't exist
            $uploadDir = __DIR__ . '/../uploads/medical_certificates/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            // Generate safe filename (sanitized)
            $certificateId = 'med-' . uniqid();
            $filenameStored = $certificateId . '.' . preg_replace('/[^a-z0-9]/', '', $extension); // Ensure extension is safe
            $storagePath = $uploadDir . $filenameStored;
            
            // Additional security: ensure storage path is within upload directory (prevent directory traversal)
            $realUploadDir = realpath($uploadDir);
            $realStoragePath = realpath(dirname($storagePath));
            if ($realStoragePath !== $realUploadDir) {
                sendJSON(['success' => false, 'error' => 'Invalid file path'], 400);
            }
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $storagePath)) {
                sendJSON(['success' => false, 'error' => 'Failed to save file'], 500);
            }
            
            // Check for duplicate planning_entry_id (if provided) - replace existing
            $existingCertificateId = null;
            if ($planningEntryId) {
                $checkStmt = $db->prepare("SELECT id, storage_path FROM medical_certificates WHERE planning_entry_id = ?");
                $checkStmt->execute([$planningEntryId]);
                $existing = $checkStmt->fetch();
                if ($existing) {
                    $existingCertificateId = $existing['id'];
                    // Delete old file
                    $oldFilePath = __DIR__ . '/../' . $existing['storage_path'];
                    if (file_exists($oldFilePath)) {
                        unlink($oldFilePath);
                    }
                    // Delete old database record (will be replaced)
                    $deleteStmt = $db->prepare("DELETE FROM medical_certificates WHERE id = ?");
                    $deleteStmt->execute([$existingCertificateId]);
                }
            }
            
            // Insert into database
            $stmt = $db->prepare("
                INSERT INTO medical_certificates (
                    id, worker_id, planning_entry_id, date,
                    filename_original, filename_stored, mime_type, size_bytes,
                    storage_path, uploaded_by_user_id, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $certificateId,
                $workerId,
                $planningEntryId,
                $date,
                $file['name'],
                $filenameStored,
                $mimeType,
                $file['size'],
                'uploads/medical_certificates/' . $filenameStored, // Relative path
                $currentUser['id'],
                $note
            ]);
            
            // Fetch created certificate
            $certStmt = $db->prepare("
                SELECT mc.*, w.name as worker_name, u.name as uploaded_by_name
                FROM medical_certificates mc
                LEFT JOIN workers w ON mc.worker_id = w.id
                LEFT JOIN users u ON mc.uploaded_by_user_id = u.id
                WHERE mc.id = ?
            ");
            $certStmt->execute([$certificateId]);
            $certificate = $certStmt->fetch();
            
            // Normalize
            $certificate['workerId'] = $certificate['worker_id'];
            $certificate['planningEntryId'] = $certificate['planning_entry_id'];
            $certificate['filenameOriginal'] = $certificate['filename_original'];
            $certificate['filenameStored'] = $certificate['filename_stored'];
            $certificate['mimeType'] = $certificate['mime_type'];
            $certificate['sizeBytes'] = $certificate['size_bytes'];
            $certificate['storagePath'] = $certificate['storage_path'];
            $certificate['uploadedByUserId'] = $certificate['uploaded_by_user_id'];
            $certificate['uploadedAt'] = $certificate['uploaded_at'];
            $certificate['workerName'] = $certificate['worker_name'];
            $certificate['uploadedByName'] = $certificate['uploaded_by_name'];
            
            sendJSON(['success' => true, 'data' => $certificate], 201);
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(['success' => false, 'error' => 'Certificate ID required'], 400);
            }
            
            // Permission check
            $isAdmin = hasPermission($currentUser, 'Verwalten') || hasPermission($currentUser, 'view_all');
            
            // Get certificate
            $stmt = $db->prepare("SELECT * FROM medical_certificates WHERE id = ?");
            $stmt->execute([$id]);
            $certificate = $stmt->fetch();
            
            if (!$certificate) {
                sendJSON(['success' => false, 'error' => 'Certificate not found'], 404);
            }
            
            // Worker can only delete their own (optional, but we allow it)
            if (!$isAdmin && $currentUser['worker_id'] !== $certificate['worker_id']) {
                sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
            }
            
            // Delete file
            $filePath = __DIR__ . '/../' . $certificate['storage_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            // Delete database record
            $deleteStmt = $db->prepare("DELETE FROM medical_certificates WHERE id = ?");
            $deleteStmt->execute([$id]);
            
            sendJSON(['success' => true]);
            break;
            
        default:
            sendJSON(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

