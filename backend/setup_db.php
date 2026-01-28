<?php
/**
 * Technoova Database Setup Script
 * 
 * Einfacheres Setup-Skript, das direkt die Datenbank einrichtet
 * 
 * IMPORTANT: Delete this file after installation!
 */

// Erlaube direkten Zugriff (keine .htaccess-Blockierung)
header('Content-Type: text/html; charset=utf-8');

// Database credentials
// Bei Hostpoint ist der Host oft ein interner MySQL-Hostname
$dbHost = $_POST['db_host'] ?? 'alefodas.mysql.db.internal';
$dbName = $_POST['db_name'] ?? 'alefodas_loomone';
$dbUser = $_POST['db_user'] ?? 'alefodas_loom';
$dbPass = $_POST['db_password'] ?? 'Projektone1.';

// Wenn bereits konfiguriert, verwende config.php
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    if (defined('DB_HOST') && DB_USER !== 'your_db_username') {
        $dbHost = DB_HOST;
        $dbName = DB_NAME;
        $dbUser = DB_USER;
        $dbPass = DB_PASS;
        $alreadyConfigured = true;
    }
}

// Check if form was submitted
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($alreadyConfigured)) {
    // Try different hosts if connection fails
    $hostsToTry = [$dbHost, 'alefodas.mysql.db.internal', 'localhost', '127.0.0.1'];
    $connected = false;
    $connectionError = '';
    
    foreach ($hostsToTry as $tryHost) {
        try {
            // Connect to MySQL server
            $pdo = new PDO("mysql:host=$tryHost;charset=utf8mb4", $dbUser, $dbPass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Test connection
            $pdo->query("SELECT 1");
            $dbHost = $tryHost; // Use the working host
            $connected = true;
            break;
        } catch (PDOException $e) {
            $connectionError = $e->getMessage();
            continue;
        }
    }
    
    if (!$connected) {
        $error = "Verbindung fehlgeschlagen bei allen Hosts. Letzter Fehler: $connectionError<br><br>
                  <strong>Mögliche Lösungen:</strong><br>
                  1. Prüfe im Hostpoint Control Panel unter 'DATENBANKEN' welcher Host angegeben ist<br>
                  2. Versuche: localhost, sl253.web.hostpoint.ch, oder die IP-Adresse des Servers<br>
                  3. Prüfe ob der Datenbankbenutzer Zugriff auf die Datenbank hat";
    } else {
    try {
        
        // Create database if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$dbName`");
        
        // Read SQL file
        $sqlFile = __DIR__ . '/database.sql';
        if (!file_exists($sqlFile)) {
            throw new Exception("database.sql nicht gefunden!");
        }
        
        $sql = file_get_contents($sqlFile);
        
        // Remove CREATE DATABASE and USE statements
        $sql = preg_replace('/CREATE DATABASE IF NOT EXISTS.*?;/i', '', $sql);
        $sql = preg_replace('/USE.*?;/i', '', $sql);
        
        // Split and execute statements
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        
        foreach ($statements as $statement) {
            if (!empty($statement)) {
                try {
                    $pdo->exec($statement);
                } catch (PDOException $e) {
                    // Ignore "already exists" errors
                    if (strpos($e->getMessage(), 'already exists') === false) {
                        throw $e;
                    }
                }
            }
        }
        
        // Update config.php
        $configContent = "<?php
/**
 * Technoova Database Configuration
 */

define('DB_HOST', '$dbHost');
define('DB_NAME', '$dbName');
define('DB_USER', '$dbUser');
define('DB_PASS', '$dbPass');
define('DB_CHARSET', 'utf8mb4');

date_default_timezone_set('Europe/Zurich');

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (\$_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function getDBConnection() {
    static \$conn = null;
    
    if (\$conn === null) {
        try {
            \$dsn = \"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;
            \$options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            \$conn = new PDO(\$dsn, DB_USER, DB_PASS, \$options);
        } catch (PDOException \$e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . \$e->getMessage()
            ]);
            exit();
        }
    }
    
    return \$conn;
}

function sendJSON(\$data, \$statusCode = 200) {
    http_response_code(\$statusCode);
    echo json_encode(\$data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

function getRequestData() {
    \$raw = file_get_contents('php://input');
    return json_decode(\$raw, true) ?? [];
}
";
        
        file_put_contents(__DIR__ . '/config.php', $configContent);
        
        $success = true;
        $message = "Datenbank erfolgreich installiert! Config-Datei erstellt mit Host: $dbHost. Bitte lösche setup_db.php aus Sicherheitsgründen.";
        
    } catch (Exception $e) {
        $error = "Fehler bei der Installation: " . $e->getMessage();
    }
    }
}

?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technoova Datenbank Setup</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 700px;
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
        h1 {
            color: #333;
            margin-top: 0;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #555;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        small {
            color: #666;
            font-size: 12px;
        }
        button {
            background: #007cba;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        }
        button:hover {
            background: #005a87;
        }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        }
        .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #ffeaa7;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #bee5eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ Technoova Datenbank Setup</h1>
        
        <?php if (isset($success)): ?>
            <div class="success">
                <strong>✅ Erfolg!</strong><br>
                <?php echo htmlspecialchars($message); ?>
            </div>
            <div class="info">
                <strong>Nächste Schritte:</strong><br>
                1. Teste die API: <a href="api/dashboard" target="_blank">https://app.techloom.ch/backend/api/dashboard</a><br>
                2. Lösche diese Datei (setup_db.php) aus Sicherheitsgründen<br>
                3. Das Frontend muss noch angepasst werden, um API-Calls zu verwenden
            </div>
        <?php elseif (isset($error)): ?>
            <div class="error">
                <strong>❌ Fehler:</strong><br>
                <?php echo htmlspecialchars($error); ?>
            </div>
            <p>Bitte überprüfe deine Datenbank-Zugangsdaten und versuche es erneut.</p>
        <?php endif; ?>
        
        <?php if (!isset($success)): ?>
            <div class="info">
                <strong>ℹ️ Informationen:</strong><br>
                Diese Seite richtet die Datenbank-Struktur ein und erstellt die config.php Datei.
            </div>
            
            <form method="POST">
                <div class="form-group">
                    <label>Datenbank Host:</label>
                    <input type="text" name="db_host" value="<?php echo htmlspecialchars($dbHost); ?>" required>
                    <small>Bei Hostpoint oft: <strong>alefodas.mysql.db.internal</strong> oder ein interner MySQL-Hostname<br>
                    Findest du im Control Panel unter DATENBANKEN > deine Datenbank</small>
                </div>
                
                <div class="form-group">
                    <label>Datenbank Name:</label>
                    <input type="text" name="db_name" value="<?php echo htmlspecialchars($dbName); ?>" required>
                </div>
                
                <div class="form-group">
                    <label>Datenbank Benutzername:</label>
                    <input type="text" name="db_user" value="<?php echo htmlspecialchars($dbUser); ?>" required>
                </div>
                
                <div class="form-group">
                    <label>Datenbank Passwort:</label>
                    <input type="password" name="db_password" value="<?php echo htmlspecialchars($dbPass); ?>" required>
                </div>
                
                <button type="submit">🚀 Datenbank installieren</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>

