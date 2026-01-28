# IST-ANALYSE: Lokal-First Umstellung
**Erstellt:** 2026-01-20  
**Ziel:** Vollständige Dokumentation der bestehenden App-Architektur für 100% lokale Umstellung

---

## 1. PROJEKTVERZEICHNIS

```
app.technoova.ch/
├── index.html                    # Frontend Entry Point (lädt app.js)
├── app.js                        # Frontend JavaScript (ca. 9500 Zeilen)
├── styles.css                    # CSS Styles
├── server.js                     # Node.js Dev-Server (optional)
├── workDataProvider.js           # Mock Data Provider (optional)
│
├── backend/
│   ├── config.php                # DB-Konfiguration (MySQL Remote)
│   ├── database.sql              # MySQL Schema (Initial)
│   ├── setup_db.php              # DB Setup Script
│   │
│   ├── api/                      # PHP REST API Endpoints
│   │   ├── index.php             # API Router
│   │   ├── auth.php              # Login/Logout/Session
│   │   ├── users.php             # User CRUD
│   │   ├── workers.php           # Worker CRUD
│   │   ├── teams.php             # Team CRUD
│   │   ├── locations.php         # Location/Baustelle CRUD
│   │   ├── assignments.php       # Assignment CRUD
│   │   ├── time_entries.php      # Time Entry CRUD + confirm_day
│   │   ├── admin_overview.php    # Admin Teamkalender Endpoint
│   │   └── reporting.php         # Reporting Endpoints
│   │
│   ├── migrations/               # DB Migrations
│   │   ├── 20250120_add_planning_status.sql
│   │   └── 20250120_consolidate_core_schema.sql
│   │
│   ├── services/                 # Business Logic Services
│   └── tools/                    # SQL Tools
│
├── _backups/                     # Code-Backups
└── REPORTS/                      # Analyse-Reports
```

**Zweck der Ordner:**
- **Frontend (Root)**: HTML+JS App, läuft im Browser
- **backend/api**: PHP REST API, läuft auf Server
- **backend/migrations**: SQL Schema-Änderungen
- **backend/services**: Business Logic (PHP)
- **_backups**: Versionierte Backups vor Änderungen

---

## 2. ARCHITEKTUR / LOGIK

### 2.1 Frontend (app.js)

#### Datenfluss:
```
UI Event → Event Handler → API Call (fetch) → Backend PHP → MySQL DB
                                                      ↓
UI Update ← renderApp() ← State Update ← API Response (JSON)
```

#### State-Objekte:

**`data` (L484-694):**
- `currentUser`: Aktueller eingeloggter User
- `users`: Alle User
- `workers`: Alle Mitarbeiter
- `teams`: Alle Teams
- `locations`: Alle Baustellen/Projekte
- `assignments`: Zuweisungen
- `timeEntries`: Zeiteinträge (Single Source of Truth im Frontend)

**`uiState` (L393-416):**
- `activeMode`: 'calendar' | 'planning' | 'overview'
- `activeView`: 'day' | 'week' | 'month' | 'year' | 'team'
- `calendarViewMode`: 'day' | 'week' | 'month' | 'year'
- `selectedDate`: 'YYYY-MM-DD'
- `selectedWeekStart`: 'YYYY-MM-DD'
- `isAuthenticated`: boolean
- `currentUserId`: string | null

**`workflowState` (L382-391):**
- `viewMode`: 'day' | 'week' | 'month' | 'year' | 'team'
- `selectedDate`: 'YYYY-MM-DD'
- `selectedWeekStart`: 'YYYY-MM-DD'
- `cache`: { dayEntries, weekEntries, teamData }

**`timeEntryWizardState` (L7000+):**
- Wizard-spezifischer State für Zeiterfassung

#### View-Modi und Render-Funktionen:

| View Mode | Render-Funktion | Zweck |
|-----------|----------------|-------|
| `day` | `renderDayView()` (L3159) | Tagesansicht mit Zeiteinträgen |
| `week` | `renderWeekView()` (L3343) | Wochenansicht (Grid) |
| `month` | `renderMonthView()` (L3025) | Monatsansicht |
| `year` | `renderYearView()` (L2832) | Jahresansicht |
| `team` | `renderTeamCalendar()` (L4695) | Teamkalender (Admin) |

#### Zentrale Data Loader:

- **`loadTimeEntries(dateFrom, dateTo, userId)`** (L8418-8468)
  - GET `/api/time_entries?date_from=...&date_to=...&user_id=...`
  - Aktualisiert `data.timeEntries`
  - Wird von `loadDayEntries` und `loadWeekEntries` aufgerufen

- **`loadDayEntries(date, userId)`** (L423-432)
  - Delegiert an `loadTimeEntries` für einen Tag
  - Triggert `renderApp()`

- **`loadWeekEntries(weekStart, userId)`** (L433-448)
  - Delegiert an `loadTimeEntries` für Woche (Mo-So)
  - Triggert `renderApp()`

- **`loadTeamWeek(weekStart)`** (L450-460)
  - GET `/api/admin/overview/week?date_from=...&date_to=...`
  - Speichert in `workflowState.cache.teamData`
  - Triggert `renderApp()`

#### API Client (`api` Objekt, L103-400):

**Basis:**
- `API_BASE_URL = window.location.origin + '/backend/api'` (L2)
- `credentials: 'include'` (Session-Cookies)
- JSON Request/Response

**Endpoints:**
- `api.login(username, password)` → POST `/api/auth`
- `api.getCurrentUser()` → GET `/api/me`
- `api.getUsers()` → GET `/api/users`
- `api.getWorkers()` → GET `/api/workers`
- `api.getTeams()` → GET `/api/teams`
- `api.getLocations()` → GET `/api/locations`
- `api.getAssignments(params)` → GET `/api/assignments?date_from=...`
- `api.getTimeEntries(params)` → GET `/api/time_entries?date_from=...&date_to=...`
- `api.createTimeEntry(data)` → POST `/api/time_entries`
- `api.updateTimeEntry(id, data)` → PUT `/api/time_entries/{id}`
- `api.deleteTimeEntry(id)` → DELETE `/api/time_entries/{id}`
- `api.confirmDay(date)` → POST `/api/time_entries/confirm_day`
- `api.getAdminOverview(params)` → GET `/api/admin/overview/week?date_from=...&date_to=...`
- `api.request('admin/cleanup_planned', {method: 'POST'})` → POST `/api/admin/cleanup_planned`

### 2.2 Backend (PHP)

#### API Router (`backend/api/index.php`):

**Routing-Logik:**
- Path: `/backend/api/{resource}/{id?}/{action?}`
- Method: GET/POST/PUT/DELETE
- Auth: `checkAuth()` prüft PHP Session (`$_SESSION['user_id']`)

**Endpoints:**

| Endpoint | Method | Handler | AuthZ |
|----------|--------|---------|-------|
| `/api/auth` | POST | `handleAuth()` | Public |
| `/api/me` | GET | `checkAuth()` | Session |
| `/api/users` | GET/POST/PUT/DELETE | `handleUsers()` | Session |
| `/api/workers` | GET/POST/PUT/DELETE | `handleWorkers()` | Session |
| `/api/teams` | GET/POST/PUT/DELETE | `handleTeams()` | Session |
| `/api/locations` | GET/POST/PUT/DELETE | `handleLocations()` | Session |
| `/api/assignments` | GET/POST/PUT/DELETE | `handleAssignments()` | Session |
| `/api/time_entries` | GET/POST/PUT/DELETE | `handleTimeEntries()` | Session |
| `/api/time_entries/confirm_day` | POST | `handleConfirmDay()` | Session (nur eigene) |
| `/api/admin/overview/week` | GET | `handleAdminOverview()` | Admin only |
| `/api/admin/cleanup_planned` | POST | `handleAdminCleanupPlanned()` | Admin only |

#### Authentifizierung (`backend/api/auth.php`):

**Login:**
- POST `/api/auth` mit `{action: 'login', username, password}`
- Prüft `users` Tabelle
- Setzt PHP Session: `$_SESSION['user_id']`, `$_SESSION['username']`
- Response: `{success: true, user: {...}}`

**Session Check:**
- `checkAuth()` liest `$_SESSION['user_id']`
- Lädt User aus DB
- Gibt `null` zurück wenn nicht authentifiziert

**Logout:**
- POST `/api/auth` mit `{action: 'logout'}`
- `session_destroy()`

#### Datenbank-Verbindung (`backend/config.php`):

**Konfiguration:**
```php
DB_HOST = 'alefodas.mysql.db.internal'  // Remote MySQL Server
DB_NAME = 'alefodas_loomone'
DB_USER = 'alefodas_loom'
DB_PASS = 'Projektone1.'
```

**Connection:**
- PDO mit MySQL
- `getDBConnection()`: Singleton Pattern
- UTF-8mb4 Charset

### 2.3 Datenbank (MySQL)

#### Schema-Übersicht:

**Tabellen:**

1. **`users`** (Benutzer mit Login)
   - `id` VARCHAR(50) PK
   - `username` VARCHAR(100) UNIQUE
   - `name`, `email`, `password`
   - `role` ('Admin' | 'Worker')
   - `permissions` JSON
   - `worker_id` VARCHAR(50) FK → workers.id
   - `first_login`, `last_login`
   - `weekly_hours_target` DECIMAL(4,2)

2. **`workers`** (Mitarbeiter)
   - `id` VARCHAR(50) PK
   - `name`, `role`, `company`
   - `primary_team_id` VARCHAR(50) FK → teams.id
   - `status`, `contact_phone`, `contact_email`

3. **`teams`** (Teams)
   - `id` VARCHAR(50) PK
   - `name`, `type` ('intern' | 'extern')
   - `company`, `description`, `contact_*`
   - `is_active`

4. **`team_members`** (M:N Teams ↔ Workers)
   - `team_id` VARCHAR(50) FK
   - `worker_id` VARCHAR(50) FK
   - PRIMARY KEY (team_id, worker_id)

5. **`locations`** (Baustellen/Projekte)
   - `id` VARCHAR(50) PK
   - `code`, `address`, `description`
   - `tags` JSON
   - `schedule_*` Felder

6. **`assignments`** (Zuweisungen Planung)
   - `id` INT AUTO_INCREMENT PK
   - `assignment_uid` VARCHAR(36) UNIQUE
   - `location_id` VARCHAR(50) FK (nullable)
   - `entry_type` ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN')
   - `worker_id` VARCHAR(50) FK (nullable)
   - `team_id` VARCHAR(50) FK (nullable)
   - `assignment_date` DATE
   - `time_from`, `time_to` TIME
   - `deleted_at` DATETIME (Soft Delete)

7. **`time_entries`** (Zeiterfassung Ist-Werte) ⭐ **KERN-TABELLE**
   - `id` VARCHAR(50) PK (nicht AUTO_INCREMENT!)
   - `worker_id` VARCHAR(50) FK → workers.id (nullable)
   - `location_id` VARCHAR(50) FK → locations.id (nullable)
   - `assignment_id` INT FK → assignments.id (nullable)
   - `entry_date` DATE NOT NULL
   - `entry_type` ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN')
   - `category` ENUM('BUERO_ALLGEMEIN', 'ENTWICKLUNG', 'MEETING', 'KRANKHEIT', 'TRAINING', 'PAUSE')
   - `time_from` TIME NOT NULL
   - `time_to` TIME NOT NULL
   - `hours` DECIMAL(4,2) NOT NULL (berechnet aus time_from/time_to)
   - `notes` TEXT
   - `status` ENUM('PLANNED', 'CONFIRMED', 'REJECTED') DEFAULT 'PLANNED'
   - `planned_by` VARCHAR(50) FK → users.id (nullable, Admin plant)
   - `confirmed_by` VARCHAR(50) FK → users.id (nullable, Worker bestätigt)
   - `confirmed_at` DATETIME (nullable)
   - `created_by` VARCHAR(50) FK → users.id
   - `updated_by` VARCHAR(50) FK → users.id
   - `created_at`, `updated_at` TIMESTAMP

**Owner-Logik:**
- **Owner = `user_id`**: Entweder via `worker_id` → `users.worker_id` ODER direkt `created_by`
- `time_entries.worker_id` → `workers.id` → `users.worker_id` → `users.id`
- Falls `worker_id IS NULL`: `created_by` = Owner

---

## 3. WORKFLOW (EXAKT NACH BESTEHENDEM VERHALTEN)

### 3.1 Login-Workflow

1. **User öffnet App** → `index.html` lädt `app.js`
2. **App prüft Session** → `checkCurrentSession()` (L7974)
   - GET `/api/me`
   - Wenn Session vorhanden: `data.currentUser` gesetzt, `uiState.isAuthenticated = true`
   - Wenn keine Session: Login-Screen
3. **User gibt Credentials ein** → `handleLogin()` (L7772)
   - POST `/api/auth` mit `{action: 'login', username, password}`
   - Backend prüft `users` Tabelle, setzt PHP Session
   - Response: `{success: true, user: {...}}`
   - Frontend: `data.currentUser = user`, `uiState.isAuthenticated = true`
4. **Erstes Login** → Passwort-Änderung erzwingen (L862)
   - Wenn `user.first_login === true`: Passwort-Änderungs-Modal
   - POST `/api/users/{id}` mit neuem Passwort
   - `first_login = false`

### 3.2 Zeiterfassung-Workflow

#### A) Admin plant Zeiten (für sich oder Mitarbeiter)

1. **Admin öffnet Kalender** → `renderDayView()` oder `renderWeekView()`
2. **Admin klickt "Zeit erfassen"** → `openTimeEntryWizard()` (L7000+)
3. **Wizard Step 1: Datum** → `timeEntryWizardState.date` gesetzt
4. **Wizard Step 2: Kategorie** → `timeEntryWizardState.category` gesetzt
5. **Wizard Step 3: Projekt** (wenn nötig) → `timeEntryWizardState.locationId` gesetzt
6. **Wizard Step 4: Zeit** → `timeEntryWizardState.timeFrom`, `timeEntryWizardState.timeTo`
7. **Wizard Step 5: Mitarbeiter** (Admin kann wählen) → `timeEntryWizardState.userId` oder `workerId`
8. **Save** → `saveTimeEntryFromWizard()` (L9410)
   - POST `/api/time_entries` mit:
     ```json
     {
       "id": "time-entry-...",
       "entry_date": "2026-01-20",
       "time_from": "08:00",
       "time_to": "16:30",
       "category": "BUERO_ALLGEMEIN",
       "location_id": null,
       "user_id": "user-123" (optional, Admin kann setzen),
       "status": "PLANNED"
     }
     ```
   - Backend:
     - Prüft Overlap (pro `worker_id` oder `created_by`)
     - Berechnet `hours` aus `time_from`/`time_to`
     - Setzt `planned_by = currentUser.id` (wenn Admin)
     - Setzt `created_by = currentUser.id`
     - Speichert in `time_entries`
   - Frontend nach Save:
     - `loadDayEntries(savedDate)` → GET `/api/time_entries?date_from=...&date_to=...`
     - `loadWeekEntries(weekStart)` → GET `/api/time_entries?date_from=...&date_to=...`
     - `renderApp()` → UI aktualisiert

#### B) Mitarbeiter bestätigt geplante Zeiten

1. **Mitarbeiter öffnet Tag-View** → `renderDayView()`
2. **Zeigt PLANNED Einträge** → Filter: `status = 'PLANNED'` UND `worker_id = currentUser.workerId` ODER `created_by = currentUser.id`
3. **Button "Tag bestätigen"** → Nur sichtbar wenn `calendarViewUserId === currentUserId` (L3198-3203)
4. **Klick** → `handleConfirmDay()` (L2412)
   - POST `/api/time_entries/confirm_day` mit `{date: '2026-01-20'}`
   - Backend `handleConfirmDay()`:
     - Filter: `entry_date = date` AND `status = 'PLANNED'` AND (`worker_id = currentUser.worker_id` OR `created_by = currentUser.id`)
     - UPDATE: `status = 'CONFIRMED'`, `confirmed_at = NOW()`, `confirmed_by = currentUser.id`
     - Response: `{ok: true, updated_count: N}`
   - Frontend nach Confirm:
     - `loadDayEntries(date)` → GET `/api/time_entries?date_from=...&date_to=...`
     - `loadWeekEntries(weekStart)` → GET `/api/time_entries?date_from=...&date_to=...`
     - `renderApp()` → UI aktualisiert (PLANNED → CONFIRMED)

### 3.3 Teamkalender-Workflow (Admin)

1. **Admin klickt "Teamkalender"** → `eventHandlers['open-team-calendar']` (L2278)
2. **Handler** → `workflowState.viewMode = 'team'`, `loadTeamWeek(currentWeekStart)`
3. **`loadTeamWeek()`** → GET `/api/admin/overview/week?date_from=...&date_to=...`
4. **Backend `handleAdminOverview()`**:
   - Prüft Admin-Berechtigung
   - Lädt alle `users` (inkl. ohne `worker_id`)
   - Lädt alle `time_entries` im Datumsbereich
   - Mappt `user_id` (Owner) via `worker_id` → `users.worker_id` ODER `created_by`
   - Response: `{ok: true, users: [...], entries: [...]}`
5. **Frontend `renderTeamCalendar()`** (L4695):
   - Grid: Rows = Users, Cols = Mo-So
   - Zeigt Einträge pro User/Tag
   - Stunden via `entryHours(entry)` berechnet

### 3.4 Stundenberechnung (Single Source of Truth)

**Helper-Funktionen (app.js L12-100):**
- `parseHHMMToMinutes(timeStr)` → Minuten seit Mitternacht
- `durationMinutes(timeFrom, timeTo)` → Dauer in Minuten (handelt Mitternacht)
- `entryMinutes(entry)` → Minuten aus `entry.time_from`/`entry.time_to`
- `entryHours(entry)` → Stunden (decimal) = `entryMinutes(entry) / 60`

**Verwendung:**
- Alle UI-Komponenten nutzen `entryHours(entry)` (NICHT `parseFloat(entry.hours)`)
- Backend berechnet `hours` beim Save, aber Frontend ignoriert es und berechnet neu

---

## 4. REMOTE-ABHÄNGIGKEITEN (MUSS LOKAL ERSETZT WERDEN)

### 4.1 Netzwerk-Abhängigkeiten

| Komponente | Aktuell | Muss werden |
|------------|---------|-------------|
| **Datenbank** | MySQL Remote (`alefodas.mysql.db.internal`) | SQLite lokal |
| **API Calls** | HTTP fetch() zu `/backend/api/*` | Lokale Repository-Funktionen |
| **Session** | PHP Session (Server-seitig) | LocalStorage/IndexedDB |
| **Auth** | Backend `checkAuth()` via Session | Lokale User-Profile |

### 4.2 Backend-Endpunkte → Lokale Funktionen Mapping

| Endpoint | Request | Response | Lokale Funktion |
|----------|---------|----------|-----------------|
| `POST /api/auth` | `{action, username, password}` | `{success, user}` | `authService.login(username, password)` → SQLite `users` |
| `GET /api/me` | - | `{success, user}` | `authService.getCurrentUser()` → LocalStorage |
| `GET /api/users` | - | `{success, data: [...]}` | `userRepository.getAll()` → SQLite |
| `POST /api/users` | `{id, name, ...}` | `{success, id}` | `userRepository.create(userData)` → SQLite |
| `GET /api/time_entries` | `?date_from=&date_to=&user_id=` | `{success, data: [...]}` | `timeEntryRepository.getByDateRange(dateFrom, dateTo, userId)` → SQLite |
| `POST /api/time_entries` | `{entry_date, time_from, ...}` | `{success, id}` | `timeEntryRepository.create(entryData)` → SQLite |
| `POST /api/time_entries/confirm_day` | `{date}` | `{ok, updated_count}` | `timeEntryService.confirmDay(date, currentUserId)` → SQLite |
| `GET /api/admin/overview/week` | `?date_from=&date_to=` | `{ok, users, entries}` | `adminService.getWeekOverview(dateFrom, dateTo)` → SQLite |

### 4.3 Session-Management → Lokales State

**Aktuell:**
- PHP `$_SESSION['user_id']` auf Server
- Cookie-basiert (HTTP-only)

**Lokal:**
- `localStorage.setItem('currentUserId', userId)`
- `localStorage.getItem('currentUserId')`
- Oder: IndexedDB `users` Tabelle mit `isActive = true`

### 4.4 Datenbank-Schema → SQLite Schema

**MySQL → SQLite Konvertierung:**
- `VARCHAR(50)` → `TEXT`
- `ENUM(...)` → `TEXT` mit CHECK Constraint
- `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` → `DATETIME DEFAULT CURRENT_TIMESTAMP`
- `AUTO_INCREMENT` → `INTEGER PRIMARY KEY AUTOINCREMENT` (nur für `assignments.id`)
- Foreign Keys: SQLite unterstützt FKs (muss aktiviert werden: `PRAGMA foreign_keys = ON`)
- JSON: SQLite hat `JSON` Typ (SQLite 3.38+)

**Tabellen (identisch):**
- `users`, `workers`, `teams`, `team_members`, `locations`, `assignments`, `time_entries`

---

## 5. IDENTIFIZIERTE PROBLEMSTELLEN (FÜR LOKALE UMSETZUNG)

### 5.1 Datenbank-Migration

- **MySQL → SQLite**: Schema muss 1:1 konvertiert werden
- **Initial Data**: Bestehende Daten müssen exportiert/importiert werden (optional)
- **Migrations**: SQLite hat kein `ALTER TABLE` für alle Operationen (z.B. Spalte hinzufügen mit DEFAULT)

### 5.2 API → Repository Layer

- **Alle `api.*` Calls** müssen durch Repository-Funktionen ersetzt werden
- **Error Handling**: Aktuell HTTP Status Codes, lokal: Exceptions
- **AuthZ**: Aktuell Backend prüft Permissions, lokal: Service-Layer prüft

### 5.3 Session → Local State

- **Login State**: `data.currentUser` bleibt, aber Quelle ändert sich (SQLite statt API)
- **Auto-Login**: Beim App-Start muss `currentUserId` aus LocalStorage geladen werden

### 5.4 Stundenberechnung

- **Bereits lokal**: `entryHours(entry)` nutzt nur `time_from`/`time_to` (keine DB-Abhängigkeit)
- **Keine Änderung nötig**

---

## 6. NÄCHSTE SCHRITTE (PHASE 2)

1. **SQLite Schema erstellen** (1:1 MySQL → SQLite)
2. **Repository Layer implementieren** (SQLite Queries statt API Calls)
3. **Service Layer implementieren** (Business Logic: Auth, Confirm-Day, etc.)
4. **Frontend anpassen** (`api.*` → `repository.*` / `service.*`)
5. **Session → LocalStorage** umstellen
6. **Tests**: Offline-Funktionalität verifizieren

---

**ENDE IST-ANALYSE**



