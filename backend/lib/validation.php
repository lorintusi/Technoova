<?php
/**
 * Validation Helpers
 * Reusable validation functions with field-level errors
 */

class ValidationError extends Exception {
    public $fieldErrors;
    
    public function __construct($message, $fieldErrors = []) {
        parent::__construct($message);
        $this->fieldErrors = $fieldErrors;
    }
}

/**
 * Validate required fields
 * 
 * @param array $data Input data
 * @param array $requiredFields List of required field names
 * @throws ValidationError if validation fails
 */
function validate_required($data, $requiredFields) {
    $fieldErrors = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            $fieldErrors[$field] = ucfirst($field) . ' ist erforderlich';
        }
    }
    
    if (!empty($fieldErrors)) {
        throw new ValidationError('Pflichtfelder fehlen', $fieldErrors);
    }
}

/**
 * Validate email format
 * 
 * @param string $email Email address
 * @param string $fieldName Field name for error message
 * @throws ValidationError if invalid
 */
function validate_email($email, $fieldName = 'email') {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new ValidationError('Ungültige Email-Adresse', [
            $fieldName => 'Bitte geben Sie eine gültige Email-Adresse ein'
        ]);
    }
}

/**
 * Validate string length
 * 
 * @param string $value Value to validate
 * @param string $fieldName Field name
 * @param int|null $min Minimum length (null = no min)
 * @param int|null $max Maximum length (null = no max)
 * @throws ValidationError if invalid
 */
function validate_length($value, $fieldName, $min = null, $max = null) {
    $len = strlen($value);
    $errors = [];
    
    if ($min !== null && $len < $min) {
        $errors[$fieldName] = "$fieldName muss mindestens $min Zeichen lang sein";
    }
    
    if ($max !== null && $len > $max) {
        $errors[$fieldName] = "$fieldName darf maximal $max Zeichen lang sein";
    }
    
    if (!empty($errors)) {
        throw new ValidationError('Ungültige Länge', $errors);
    }
}

/**
 * Validate enum value
 * 
 * @param mixed $value Value to validate
 * @param string $fieldName Field name
 * @param array $allowedValues Allowed values
 * @throws ValidationError if invalid
 */
function validate_enum($value, $fieldName, $allowedValues) {
    if (!in_array($value, $allowedValues, true)) {
        throw new ValidationError('Ungültiger Wert', [
            $fieldName => "$fieldName muss einer dieser Werte sein: " . implode(', ', $allowedValues)
        ]);
    }
}

/**
 * Validate unique field in database
 * 
 * @param PDO $db Database connection
 * @param string $table Table name (must be whitelisted)
 * @param string $field Field name (must be alphanumeric + underscore)
 * @param mixed $value Value to check
 * @param string|null $excludeId ID to exclude (for updates)
 * @throws ValidationError if not unique
 * @throws Exception if table/field invalid
 */
function validate_unique($db, $table, $field, $value, $excludeId = null) {
    // Whitelist allowed tables (prevent SQL injection)
    $allowedTables = ['users', 'workers', 'teams', 'locations', 'vehicles', 'devices', 'dispatch_items'];
    if (!in_array($table, $allowedTables, true)) {
        throw new Exception("Invalid table name for validation: $table");
    }
    
    // Validate field name (only alphanumeric + underscore)
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $field)) {
        throw new Exception("Invalid field name for validation: $field");
    }
    
    // Use backticks for table/field names (MySQL escaping)
    $query = "SELECT COUNT(*) FROM `$table` WHERE `$field` = ?";
    $params = [$value];
    
    if ($excludeId !== null) {
        $query .= " AND id != ?";
        $params[] = $excludeId;
    }
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $count = $stmt->fetchColumn();
    
    if ($count > 0) {
        throw new ValidationError('Wert bereits vorhanden', [
            $field => ucfirst($field) . ' ist bereits vergeben'
        ]);
    }
}

