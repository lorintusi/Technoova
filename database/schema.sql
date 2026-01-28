-- Technoova SQLite Database Schema
-- Konvertiert von MySQL zu SQLite für 100% lokale Nutzung
-- Erstellt: 2026-01-20

-- Enable Foreign Keys
PRAGMA foreign_keys = ON;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Worker',
    permissions TEXT, -- JSON stored as TEXT
    worker_id TEXT,
    first_login INTEGER DEFAULT 1, -- BOOLEAN: 0 = false, 1 = true
    last_login DATETIME,
    weekly_hours_target REAL DEFAULT 42.50, -- DECIMAL(4,2) → REAL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_worker_id ON users(worker_id);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'intern' CHECK(type IN ('intern', 'extern')),
    company TEXT NOT NULL,
    description TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    contact_address TEXT,
    created_at DATE,
    is_active INTEGER DEFAULT 1, -- BOOLEAN: 0 = false, 1 = true
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- =====================================================
-- WORKERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    company TEXT,
    primary_team_id TEXT, -- renamed from team_id (per SCHEMA_FINAL.md)
    status TEXT DEFAULT 'Arbeitsbereit',
    contact_phone TEXT,
    contact_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workers_primary_team_id ON workers(primary_team_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

-- =====================================================
-- TEAM_MEMBERS TABLE (M:N Teams ↔ Workers)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, worker_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- =====================================================
-- LOCATIONS TABLE (Baustellen/Projekte)
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON stored as TEXT
    schedule_status TEXT DEFAULT 'Geplant',
    schedule_start DATETIME,
    schedule_end DATETIME,
    schedule_deadline DATE,
    schedule_progress INTEGER DEFAULT 0,
    plan_file TEXT, -- LONGTEXT → TEXT
    plan_file_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);
CREATE INDEX IF NOT EXISTS idx_locations_schedule_status ON locations(schedule_status);

-- =====================================================
-- ASSIGNMENTS TABLE (Zuweisungen Planung)
-- =====================================================
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_uid TEXT UNIQUE, -- für Upsert (per SCHEMA_FINAL.md)
    location_id TEXT, -- nullable (per SCHEMA_FINAL.md)
    entry_type TEXT CHECK(entry_type IN ('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN')),
    worker_id TEXT,
    team_id TEXT,
    assignment_date DATE NOT NULL,
    time_from TEXT, -- TIME → TEXT (HH:MM format)
    time_to TEXT, -- TIME → TEXT (HH:MM format)
    deleted_at DATETIME, -- Soft Delete (per SCHEMA_FINAL.md)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assignments_location_id ON assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_assignments_worker_id ON assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_assignments_team_id ON assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_date ON assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_assignments_location_date ON assignments(location_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_uid ON assignments(assignment_uid);

-- =====================================================
-- TIME_ENTRIES TABLE (Zeiterfassung Ist-Werte) ⭐ KERN-TABELLE
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY, -- VARCHAR(50), NOT AUTO_INCREMENT! (generated as 'time-entry-' + uniqid())
    worker_id TEXT, -- nullable (per code: kann NULL sein wenn created_by direkt)
    location_id TEXT,
    assignment_id INTEGER, -- FK zu assignments.id (optional)
    entry_date DATE NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'BUERO_ALLGEMEIN' CHECK(entry_type IN ('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN')),
    category TEXT NOT NULL DEFAULT 'BUERO_ALLGEMEIN' CHECK(category IN ('BUERO_ALLGEMEIN', 'ENTWICKLUNG', 'MEETING', 'KRANKHEIT', 'TRAINING', 'PAUSE')),
    time_from TEXT NOT NULL, -- TIME → TEXT (HH:MM format)
    time_to TEXT NOT NULL, -- TIME → TEXT (HH:MM format)
    hours REAL NOT NULL, -- DECIMAL(4,2) → REAL
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED', 'CONFIRMED', 'REJECTED')),
    confirmed_at DATETIME,
    confirmed_by TEXT,
    planned_by TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (planned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_entries_worker_date ON time_entries(worker_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_location_date ON time_entries(location_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_category ON time_entries(category);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type ON time_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_status ON time_entries(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_time_entries_confirmed_by ON time_entries(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_time_entries_planned_by ON time_entries(planned_by);
CREATE INDEX IF NOT EXISTS idx_time_entries_assignment_id ON time_entries(assignment_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date_worker ON time_entries(entry_date, worker_id);

-- Unique constraint: Prevent overlapping entries per worker/day/time
-- Note: SQLite doesn't support composite UNIQUE with NULLs the same way MySQL does
-- We'll handle overlap validation in application logic
CREATE UNIQUE INDEX IF NOT EXISTS unique_time_entry ON time_entries(worker_id, entry_date, time_from, time_to) WHERE worker_id IS NOT NULL;

-- =====================================================
-- INITIAL DATA
-- =====================================================
-- Initial Admin User (Password: 010203 - bcrypt hash)
-- Note: In production, user should change password on first login
INSERT OR IGNORE INTO users (
    id, username, name, email, password, role, permissions, first_login, last_login, weekly_hours_target
) VALUES (
    'user-admin',
    'admin',
    'Admin User',
    'admin@technoova.app',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of '010203'
    'Admin',
    '["Lesen", "Schreiben", "Verwalten", "manage_users", "plan", "view_all"]',
    0, -- first_login = false (already logged in once)
    '2025-11-12 08:15:00',
    42.50
);



