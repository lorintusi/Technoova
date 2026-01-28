-- Technoova Database Schema
-- MySQL/MariaDB Database Structure

CREATE DATABASE IF NOT EXISTS technoova_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE technoova_db;

-- Users Table (Benutzer mit Login-Daten)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Worker',
    permissions JSON,
    worker_id VARCHAR(50) NULL,
    first_login BOOLEAN DEFAULT TRUE,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_worker_id (worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('intern', 'extern') NOT NULL DEFAULT 'intern',
    company VARCHAR(255) NOT NULL,
    description TEXT NULL,
    contact_phone VARCHAR(50) NULL,
    contact_email VARCHAR(255) NULL,
    contact_address TEXT NULL,
    created_at DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workers Table (Mitarbeiter)
CREATE TABLE IF NOT EXISTS workers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NULL,
    company VARCHAR(255) NULL,
    team_id VARCHAR(50) NULL,
    status VARCHAR(50) DEFAULT 'Arbeitsbereit',
    contact_phone VARCHAR(50) NULL,
    contact_email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_team_id (team_id),
    INDEX idx_status (status),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Locations Table (Baustellen)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    description TEXT NULL,
    tags JSON NULL,
    schedule_status VARCHAR(50) DEFAULT 'Geplant',
    schedule_start DATETIME NULL,
    schedule_end DATETIME NULL,
    schedule_deadline DATE NULL,
    schedule_progress INT DEFAULT 0,
    plan_file LONGTEXT NULL,
    plan_file_name VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_schedule_status (schedule_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assignments Table (Zuweisungen von Arbeitern zu Baustellen)
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL,
    worker_id VARCHAR(50) NULL,
    team_id VARCHAR(50) NULL,
    assignment_date DATE NOT NULL,
    time_from TIME NULL,
    time_to TIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location_id (location_id),
    INDEX idx_worker_id (worker_id),
    INDEX idx_team_id (team_id),
    INDEX idx_assignment_date (assignment_date),
    INDEX idx_location_date (location_id, assignment_date),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (location_id, worker_id, assignment_date),
    UNIQUE KEY unique_team_assignment (location_id, team_id, assignment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Team Members Table (Viele-zu-Viele: Teams <-> Workers)
CREATE TABLE IF NOT EXISTS team_members (
    team_id VARCHAR(50) NOT NULL,
    worker_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, worker_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Admin User (Password: 010203 - wird gehasht)
INSERT INTO users (id, username, name, email, password, role, permissions, first_login, last_login) VALUES
('user-admin', 'admin', 'Admin User', 'admin@technoova.app', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', '["Lesen", "Schreiben", "Verwalten", "manage_users", "plan", "view_all"]', FALSE, '2025-11-12 08:15:00')
ON DUPLICATE KEY UPDATE id=id;

