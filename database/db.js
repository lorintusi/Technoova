/**
 * SQLite Database Connection and Setup (ESM Module)
 * Ersetzt MySQL Backend für 100% lokale Nutzung
 */

// SQL.js für Browser (WebAssembly SQLite)
let SQL;
let db = null;

/**
 * Initialize SQLite Database
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    // Load sql.js library (must be included in index.html)
    if (typeof window !== 'undefined' && window.SQL) {
      SQL = window.SQL;
    } else if (typeof window !== 'undefined' && window.initSqlJs) {
      // SQL.js WASM version - initialize it
      SQL = await window.initSqlJs({
        locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
      });
    } else {
      // Wait a bit and retry (in case script is still loading)
      await new Promise(resolve => setTimeout(resolve, 100));
      if (typeof window !== 'undefined' && window.SQL) {
        SQL = window.SQL;
      } else {
        throw new Error('SQL.js library not found. Make sure SQL.js is loaded before this module.');
      }
    }

    // Load or create database
    const dbPath = 'technoova.db'; // Will be stored in IndexedDB via sql.js
    
    // Try to load existing database from IndexedDB
    let dbData = null;
    try {
      const stored = localStorage.getItem('technoova_db');
      if (stored) {
        dbData = new Uint8Array(JSON.parse(stored));
      }
    } catch (e) {
      console.log('No existing database found, creating new one');
    }

    // Initialize database
    if (dbData) {
      db = new SQL.Database(dbData);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
      
      // Run schema
      await runSchema();
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Run schema SQL file
 * @returns {Promise<void>}
 */
export async function runSchema() {
  try {
    // Load schema.sql
    const response = await fetch('database/schema.sql');
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.statusText}`);
    }
    const schemaSQL = await response.text();
    
    // Define schema as array of complete statements (in correct order)
    // This avoids naive split-by-semicolon issues
    const schemaStatements = [
      // PRAGMA
      'PRAGMA foreign_keys = ON',
      
      // CREATE TABLE statements (must come before indexes)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Worker',
        permissions TEXT,
        worker_id TEXT,
        first_login INTEGER DEFAULT 1,
        last_login DATETIME,
        weekly_hours_target REAL DEFAULT 42.50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'intern' CHECK(type IN ('intern', 'extern')),
        company TEXT NOT NULL,
        description TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        contact_address TEXT,
        created_at DATE,
        is_active INTEGER DEFAULT 1,
        created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        company TEXT,
        primary_team_id TEXT,
        status TEXT DEFAULT 'Arbeitsbereit',
        contact_phone TEXT,
        contact_email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (primary_team_id) REFERENCES teams(id) ON DELETE SET NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS team_members (
        team_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, worker_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        address TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        resources_required TEXT,
        schedule_status TEXT DEFAULT 'Geplant',
        schedule_start DATETIME,
        schedule_end DATETIME,
        schedule_deadline DATE,
        schedule_progress INTEGER DEFAULT 0,
        plan_file TEXT,
        plan_file_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_uid TEXT UNIQUE,
        location_id TEXT,
        entry_type TEXT CHECK(entry_type IN ('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN')),
        worker_id TEXT,
        team_id TEXT,
        assignment_date DATE NOT NULL,
        time_from TEXT,
        time_to TEXT,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        worker_id TEXT,
        location_id TEXT,
        assignment_id INTEGER,
        entry_date DATE NOT NULL,
        entry_type TEXT NOT NULL DEFAULT 'BUERO_ALLGEMEIN' CHECK(entry_type IN ('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN')),
        category TEXT NOT NULL DEFAULT 'BUERO_ALLGEMEIN' CHECK(category IN ('BUERO_ALLGEMEIN', 'ENTWICKLUNG', 'MEETING', 'KRANKHEIT', 'TRAINING', 'PAUSE')),
        time_from TEXT NOT NULL,
        time_to TEXT NOT NULL,
        hours REAL NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED', 'CONFIRMED', 'REJECTED')),
        meta TEXT,
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS planning_entries (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        date DATE NOT NULL,
        start_time TEXT,
        end_time TEXT,
        all_day INTEGER DEFAULT 0,
        location_id TEXT,
        category TEXT NOT NULL,
        note TEXT,
        status TEXT DEFAULT 'PLANNED' CHECK(status IN ('PLANNED', 'CONFIRMED')),
        source TEXT DEFAULT 'ADMIN_PLAN' CHECK(source IN ('ADMIN_PLAN', 'SELF_PLAN')),
        created_by_user_id TEXT NOT NULL,
        created_by_role TEXT DEFAULT 'ADMIN' CHECK(created_by_role IN ('ADMIN', 'WORKER')),
        time_entry_id INTEGER,
        confirmed_at DATETIME,
        confirmed_by_user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE SET NULL
      )`,
      
      // CREATE INDEX statements (after tables)
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_worker_id ON users(worker_id)',
      'CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name)',
      'CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_workers_primary_team_id ON workers(primary_team_id)',
      'CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status)',
      'CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code)',
      'CREATE INDEX IF NOT EXISTS idx_locations_schedule_status ON locations(schedule_status)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_location_id ON assignments(location_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_worker_id ON assignments(worker_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_team_id ON assignments(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_assignment_date ON assignments(assignment_date)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_location_date ON assignments(location_id, assignment_date)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_assignment_uid ON assignments(assignment_uid)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_worker_date ON time_entries(worker_id, entry_date)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_location_date ON time_entries(location_id, entry_date)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON time_entries(entry_date)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_category ON time_entries(category)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type ON time_entries(entry_type)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_user_status ON time_entries(worker_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_confirmed_by ON time_entries(confirmed_by)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_planned_by ON time_entries(planned_by)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_assignment_id ON time_entries(assignment_id)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date_worker ON time_entries(entry_date, worker_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS unique_time_entry ON time_entries(worker_id, entry_date, time_from, time_to) WHERE worker_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_planning_entries_worker_date ON planning_entries(worker_id, date)',
      'CREATE INDEX IF NOT EXISTS idx_planning_entries_status ON planning_entries(status)',
      'CREATE INDEX IF NOT EXISTS idx_planning_entries_source ON planning_entries(source)',
      'CREATE INDEX IF NOT EXISTS idx_planning_entries_time_entry_id ON planning_entries(time_entry_id)',
      
      // Initial data
      `INSERT OR IGNORE INTO users (
        id, username, name, email, password, role, permissions, first_login, last_login, weekly_hours_target
      ) VALUES (
        'user-admin',
        'admin',
        'Admin User',
        'admin@technoova.app',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Admin',
        '["Lesen", "Schreiben", "Verwalten", "manage_users", "plan", "view_all"]',
        0,
        '2025-11-12 08:15:00',
        42.50
      )`
    ];
    
    // Execute schema statements in order
    for (const statement of schemaStatements) {
      try {
        db.run(statement);
      } catch (e) {
        // Ignore "already exists" errors and "duplicate index" errors
        if (!e.message.includes('already exists') && 
            !e.message.includes('duplicate') &&
            !e.message.includes('UNIQUE constraint')) {
          console.warn('Schema statement failed:', statement.substring(0, 100), e.message);
        }
      }
    }
    
    console.log('Schema executed successfully');
  } catch (error) {
    console.error('Schema execution failed:', error);
    throw error;
  }
}

/**
 * Save database to IndexedDB (persist changes)
 * @returns {Promise<void>}
 */
export async function saveDatabase() {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Export database to Uint8Array
    const data = db.export();
    
    // Store in localStorage (for small DBs) or IndexedDB (for larger)
    const jsonData = Array.from(data);
    localStorage.setItem('technoova_db', JSON.stringify(jsonData));
    
    console.log('Database saved to localStorage');
  } catch (error) {
    console.error('Failed to save database:', error);
    throw error;
  }
}

/**
 * Execute SQL query (SELECT) - returns array of objects
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} params - Query parameters
 * @returns {Array} Results as array of objects
 */
export function dbQuery(sql, params = []) {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  
  try {
    const stmt = db.prepare(sql);
    
    // Bind parameters (sql.js uses positional ? placeholders)
    if (params && params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        stmt.bind([i + 1, params[i]]);
      }
    }
    
    // Execute and collect results
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push(row);
    }
    
    stmt.free();
    return rows;
  } catch (error) {
    console.error('Query failed:', sql, params, error);
    throw error;
  }
}

/**
 * Execute SQL statement (INSERT/UPDATE/DELETE)
 * @param {string} sql - SQL statement with ? placeholders
 * @param {Array} params - Statement parameters
 * @returns {Object} { changes: number, lastInsertRowid: number }
 */
export function dbExec(sql, params = []) {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  
  try {
    const stmt = db.prepare(sql);
    
    // Bind parameters
    if (params && params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        stmt.bind([i + 1, params[i]]);
      }
    }
    
    // Execute
    stmt.step();
    
    // Get result
    const result = {
      changes: db.getRowsModified(),
      lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || null
    };
    
    stmt.free();
    
    // Auto-save after write operations
    saveDatabase().catch(err => console.warn('Auto-save failed:', err));
    
    return result;
  } catch (error) {
    console.error('Execute failed:', sql, params, error);
    throw error;
  }
}

/**
 * Get database instance (for direct access if needed)
 * @returns {SQL.Database|null}
 */
export function getDatabase() {
  return db;
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.dbModule = {
    initDatabase,
    runSchema,
    saveDatabase,
    query: dbQuery,
    execute: dbExec,
    getDatabase
  };
}
