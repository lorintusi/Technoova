<?php
/**
 * Database Helpers
 * Centralized database connection and utilities
 */

require_once __DIR__ . '/../config.php';

/**
 * Get database connection (singleton)
 * Uses PDO with prepared statements
 * 
 * @return PDO Database connection
 * @throws PDOException if connection fails
 */
function get_db() {
    return getDBConnection(); // Use existing function from config.php
}

/**
 * Execute query and fetch all results
 * 
 * @param PDO $db Database connection
 * @param string $query SQL query
 * @param array $params Query parameters
 * @return array Query results
 */
function db_fetch_all($db, $query, $params = []) {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Execute query and fetch single result
 * 
 * @param PDO $db Database connection
 * @param string $query SQL query
 * @param array $params Query parameters
 * @return array|false Query result or false if not found
 */
function db_fetch_one($db, $query, $params = []) {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetch();
}

/**
 * Execute INSERT/UPDATE/DELETE query
 * 
 * @param PDO $db Database connection
 * @param string $query SQL query
 * @param array $params Query parameters
 * @return int Number of affected rows
 */
function db_execute($db, $query, $params = []) {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->rowCount();
}

/**
 * Get last inserted ID
 * 
 * @param PDO $db Database connection
 * @return string Last insert ID
 */
function db_last_insert_id($db) {
    return $db->lastInsertId();
}

