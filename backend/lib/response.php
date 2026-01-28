<?php
/**
 * API Response Helpers
 * Standardized JSON responses with consistent format
 */

/**
 * Send success response
 * Format: { ok: true, data: ..., meta?: ... }
 * 
 * @param mixed $data Response data
 * @param int $statusCode HTTP status code (200 or 201)
 * @param array|null $meta Optional metadata (pagination, counts, etc.)
 */
function json_success($data, $statusCode = 200, $meta = null) {
    // Ensure JSON content type
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    
    http_response_code($statusCode);
    $response = [
        'ok' => true,
        'data' => $data
    ];
    
    if ($meta !== null) {
        $response['meta'] = $meta;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * Send error response
 * Format: { ok: false, error: { code, message, details?, fieldErrors? } }
 * 
 * @param string $message Error message
 * @param int $statusCode HTTP status code (400, 401, 403, 404, 409, 500)
 * @param string|null $code Error code (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
 * @param array|null $fieldErrors Field-specific validation errors
 * @param mixed|null $details Additional error details (only in development)
 */
function json_error($message, $statusCode = 400, $code = null, $fieldErrors = null, $details = null) {
    // Ensure JSON content type
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    
    http_response_code($statusCode);
    
    // Auto-generate code from status if not provided
    if ($code === null) {
        $code = match($statusCode) {
            400 => 'VALIDATION_ERROR',
            401 => 'UNAUTHORIZED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            409 => 'CONFLICT',
            500 => 'INTERNAL_ERROR',
            default => 'ERROR'
        };
    }
    
    $error = [
        'code' => $code,
        'message' => $message
    ];
    
    if ($fieldErrors !== null) {
        $error['fieldErrors'] = $fieldErrors;
    }
    
    // Only include details in development (not in production)
    if ($details !== null && (getenv('APP_ENV') === 'development' || !getenv('APP_ENV'))) {
        $error['details'] = $details;
    }
    
    $response = [
        'ok' => false,
        'error' => $error
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * Backward compatibility wrapper for old sendJSON
 * Converts old format to new format
 * 
 * @deprecated Use json_success() or json_error() instead
 */
function sendJSON($data, $statusCode = 200) {
    if (isset($data['success'])) {
        // Old format: {success: true/false, data/error}
        if ($data['success']) {
            json_success($data['data'] ?? [], $statusCode);
        } else {
            json_error($data['error'] ?? 'Unknown error', $statusCode);
        }
    } else {
        // Assume it's data
        json_success($data, $statusCode);
    }
}

