<?php
/**
 * Authentication API
 */

function handleAuth() {
    // Configure session settings before starting
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Lax');
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    
    // Only start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $data = getRequestData();
    $action = $data['action'] ?? 'login';
    
    if ($action === 'login') {
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            sendJSON(['success' => false, 'error' => 'Username and password required'], 400);
        }
        
        $db = getDBConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password'])) {
            sendJSON(['success' => false, 'error' => 'Invalid credentials'], 401);
        }
        
        // Update last login
        $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")
           ->execute([$user['id']]);
        
        // Regenerate session ID for security (prevents session fixation)
        session_regenerate_id(true);
        
        // Set session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        
        // Debug logging (only in development)
        if (defined('APP_ENV') && APP_ENV === 'development') {
            error_log('[handleAuth] Session set. Session ID: ' . session_id() . ', User ID: ' . $user['id']);
        }
        
        // Decode permissions
        $user['permissions'] = json_decode($user['permissions'] ?? '[]', true);
        
        // Map worker_id to workerId for frontend compatibility
        if (isset($user['worker_id'])) {
            $user['workerId'] = $user['worker_id'];
        }
        
        // Remove password from response
        unset($user['password']);
        
        sendJSON([
            'success' => true,
            'user' => $user
        ]);
    } elseif ($action === 'logout') {
        // Clear session
        $_SESSION = array();
        session_destroy();
        sendJSON(['success' => true, 'message' => 'Logged out']);
    }
    
    sendJSON(['success' => false, 'error' => 'Invalid action'], 400);
}

function checkAuth() {
    // Check for session or token-based auth
    // For now, we'll use session-based authentication
    // Configure session settings before starting
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Lax');
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    
    // Only start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['user_id'])) {
        // Debug logging (only in development)
        if (defined('APP_ENV') && APP_ENV === 'development') {
            error_log('[checkAuth] No user_id in session. Session ID: ' . session_id() . ', Session data: ' . print_r($_SESSION, true));
        }
        
        // Check for Authorization header (for future token-based auth)
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (empty($authHeader)) {
            return null;
        }
        
        // TODO: Implement token validation
        return null;
    }
    
    $db = getDBConnection();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if ($user) {
        $user['permissions'] = json_decode($user['permissions'] ?? '[]', true);
        // Map worker_id to workerId for frontend compatibility
        if (isset($user['worker_id'])) {
            $user['workerId'] = $user['worker_id'];
        }
        unset($user['password']);
    }
    
    return $user;
}

