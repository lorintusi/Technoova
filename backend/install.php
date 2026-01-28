<?php
/**
 * Technoova Database Installation Script
 * 
 * This script will:
 * 1. Create the database schema
 * 2. Insert initial data
 * 3. Create default admin user
 * 
 * IMPORTANT: Delete this file after installation for security!
 */

// Security check - only allow if config is not set up yet
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    
    // If DB credentials are already configured, require password
    if (DB_USER !== 'your_db_username') {
        $installPassword = $_GET['password'] ?? $_POST['password'] ?? '';
        if ($installPassword !== 'INSTALL_SECURE_PASSWORD_CHANGE_THIS') {
            die('Installation password required. Add ?password=YOUR_PASSWORD to URL or set INSTALL_SECURE_PASSWORD_CHANGE_THIS in install.php');
        }
    }
}

// Database connection settings
$dbHost = $_POST['db_host'] ?? 'localhost';
$dbName = $_POST['db_name'] ?? 'technoova_db';
$dbUser = $_POST['db_user'] ?? '';
$dbPass = $_POST['db_password'] ?? '';

// Check if form was submitted
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($dbUser)) {
    try {
        // Connect to MySQL server
        $pdo = new PDO("mysql:host=$dbHost;charset=utf8mb4", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Read and execute SQL file
        $sql = file_get_contents(__DIR__ . '/database.sql');
        
        // Split by semicolons (basic approach - for production use proper SQL parser)
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        
        foreach ($statements as $statement) {
            if (!empty($statement) && !preg_match('/^(USE|CREATE DATABASE)/i', $statement)) {
                $pdo->exec($statement);
            }
        }
        
        // Now switch to the database
        $pdo->exec("USE $dbName");
        
        // Create config.php file
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
        $message = "Database installed successfully! Config file created. Please delete install.php for security.";
        
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technoova Database Installation</title>
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
        button {
            background: #007cba;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
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
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Technoova Database Installation</h1>
        
        <?php if (isset($success)): ?>
            <div class="success">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($error)): ?>
            <div class="error">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>
        
        <?php if (!isset($success)): ?>
            <div class="warning">
                <strong>Wichtig:</strong> Du brauchst deine MySQL-Datenbank-Zugangsdaten von Hostpoint.
                Diese findest du im Hostpoint Control Panel unter "Datenbanken".
            </div>
            
            <form method="POST">
                <div class="form-group">
                    <label>Datenbank Host:</label>
                    <input type="text" name="db_host" value="<?php echo htmlspecialchars($dbHost); ?>" required>
                    <small>Meist: localhost</small>
                </div>
                
                <div class="form-group">
                    <label>Datenbank Name:</label>
                    <input type="text" name="db_name" value="<?php echo htmlspecialchars($dbName); ?>" required>
                    <small>Der Name deiner Datenbank (z.B. technoova_db)</small>
                </div>
                
                <div class="form-group">
                    <label>Datenbank Benutzername:</label>
                    <input type="text" name="db_user" value="<?php echo htmlspecialchars($dbUser); ?>" required>
                </div>
                
                <div class="form-group">
                    <label>Datenbank Passwort:</label>
                    <input type="password" name="db_password" required>
                </div>
                
                <button type="submit">Datenbank installieren</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>

