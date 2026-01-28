<?php
/**
 * Admin Password Reset Script
 * This script resets the admin user's password to "010203"
 */

// Try to include config.php, but if it doesn't exist, use hardcoded values
$dbHost = 'alefodas.mysql.db.internal';
$dbName = 'alefodas_loomone';
$dbUser = 'alefodas_loom';
$dbPass = 'Projektone1.';

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    if (defined('DB_HOST')) {
        $dbHost = DB_HOST;
        $dbName = DB_NAME;
        $dbUser = DB_USER;
        $dbPass = DB_PASS;
    }
}

header('Content-Type: text/html; charset=utf-8');

try {
    // Connect directly to database
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Hash the default password
    $newPassword = "010203";
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update admin user password
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
    $stmt->execute([$hashedPassword]);
    
    if ($stmt->rowCount() > 0) {
        echo "<!DOCTYPE html>
<html lang='de'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Admin Passwort zurückgesetzt</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #bee5eb;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class='container'>
        <h1>✅ Admin Passwort zurückgesetzt</h1>
        <div class='success'>
            <strong>Erfolg!</strong><br>
            Das Passwort für den Admin-User wurde erfolgreich zurückgesetzt.
        </div>
        <div class='info'>
            <strong>Login-Daten:</strong><br>
            Benutzername: <code>admin</code><br>
            Passwort: <code>010203</code>
        </div>
        <p><strong>Wichtig:</strong> Bitte löschen Sie diese Datei (reset_admin_password.php) aus Sicherheitsgründen nach dem Login.</p>
        <p><a href='../index.html'>Zur Anmeldung</a></p>
    </div>
</body>
</html>";
    } else {
        echo "<!DOCTYPE html>
<html lang='de'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Fehler</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class='container'>
        <h1>❌ Fehler</h1>
        <div class='error'>
            <strong>Fehler:</strong><br>
            Admin-User nicht gefunden. Bitte stellen Sie sicher, dass der Admin-User in der Datenbank existiert.
        </div>
    </div>
</body>
</html>";
    }
} catch (Exception $e) {
    echo "<!DOCTYPE html>
<html lang='de'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Fehler</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        }
        pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class='container'>
        <h1>❌ Datenbank-Fehler</h1>
        <div class='error'>
            <strong>Fehler:</strong><br>
            <pre>" . htmlspecialchars($e->getMessage()) . "</pre>
        </div>
    </div>
</body>
</html>";
}

