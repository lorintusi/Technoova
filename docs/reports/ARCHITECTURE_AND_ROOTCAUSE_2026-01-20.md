## 1. Projektverzeichnis (Tree, Tiefe ≤ 4)

```text
app.technoova.ch/
  index.html
  app.js
  styles.css
  server.js
  workDataProvider.js
  backend/
    api/
      index.php
      auth.php
      users.php
      workers.php
      teams.php
      locations.php
      assignments.php
      time_entries.php
      admin_overview.php
      week_planning.php
      reporting.php
      test.php
      test_simple.php
    database.sql
    SCHEMA_FINAL.md
    config.php
    install.php
    setup_db.php
    migration_time_entries.sql
    migration_week_planning.sql
    migrations/
      20250120_consolidate_core_schema.sql
      20250120_add_planning_status.sql
    services/
      TimeEntryService.php
      AssignmentService.php
      ReportingService.php
      TeamService.php
    scripts/
      backfill_core_schema.php
    tools/
      cleanup_planned_entries.sql
  _backups/
    app.js.backup-… (mehrere Snapshots)
  _project_backup_2026-01-20_01-15-36/
    app.js
    backend/… (ältere Kopie)
  REPORTS/
    ERP_AUDIT_2026-01-20.md
    ERP_AUDIT_FIXES_2026-01-20.md
    FINAL_ERP_FLOW_IMPLEMENTATION_2026-01-20.md
    HOTFIX_TEAMCAL_CONFIRM_WIZARDDATE_INTERNALHOURS_2026-01-20.md
    REWIRED_WORKFLOW_2026-01-20.md
    __keep__.txt
  diverse *.md Analyse-/Report-Dateien
  check_php.js
  BUG_LIST.md / BUG_FIXES.md / PHASE_*.md / REPORT_*.md
```

**Ordner-Zweck (je 1 Satz):**

- **Root**: Single-Page-Frontend (`index.html`, `app.js`, `styles.css`) plus Node-dev-Server (`server.js`) und Dokumentation/Reports.
- **`backend/`**: PHP-REST-API, DB-Schema, Migrations und Services für Time-Entries, Assignments, Teams, Reporting.
- **`backend/api/`**: Alle HTTP-Endpunkte (Router in `index.php`, Ressourcen-Handler wie `time_entries.php`, `admin_overview.php`).
- **`backend/migrations/`**: SQL-Skripte zur Konsolidierung des Schemas (u.a. Planning-Status, Assignment-Link).
- **`backend/tools/`**: Hilfs-SQL, z.B. `cleanup_planned_entries.sql` zur Massendeletion von PLANNED-Einträgen.
- **`backend/services/`**: Domänenspezifische Logik (Overlap-Checks, Reporting, Team-Zuordnung).
- **`_backups/`**: Versionierte Sicherungen von `app.js` vor relevanten Umbauten (Teamkalender, Wizard, Admin-Overview).
- **`_project_backup_.../`**: Vollständiger Projekt-Snapshot vor der großen Refactoring-Phase.
- **`REPORTS/`**: Fachliche und technische Reports (ERP-Audit, Flow-Implementierung, Hotfixes, Rewired-Workflow).

---

## 2. Architektur / Logik

### 2.A Frontend – Datenfluss

**Loaded Code Check**

- `index.html` lädt genau **`styles.css`** und **`app.js`**, ohne Service Worker oder weitere Bundles:

```1:20:index.html
<link rel="stylesheet" href="styles.css" />
...
<div id="app">
  ...
</div>
<div id="modal-root"></div>
<script defer src="app.js"></script>
```

- Es gibt **keinen** `serviceWorker`-Code in `app.js` (grep leer), d.h. Caching-Probleme kommen nicht aus einem SW, sondern nur von normalem Browser/Proxy-Cache.

**High-Level-Datenfluss**

1. **UI-State**: `workflowState` und `uiState` bestimmen View-Modus, Datum(e) und Auswahl des Users.
2. **Loader**: Funktionen wie `loadTimeEntries`, `loadDayEntries`, `loadWeekEntries`, `loadTeamWeek` holen Daten vom Backend und befüllen `data.timeEntries` bzw. `workflowState.cache`.
3. **Render**: `renderApp()` ruft `renderActiveView()`, das je nach View-Modus Kalender- oder Teamkalender-HTML erzeugt.
4. **Events**: Zentrale Event-Delegation (Click-Handler) interpretiert `data-action`/`data-view` und ruft z.B. `openTimeEntryWizard`, `api.confirmDay`, `loadTeamWeek`.
5. **API**: Das `api`-Objekt zentralisiert REST-Aufrufe (`time_entries`, `admin/overview/week`, `confirm_day`).
6. **State Update + Re-Render**: Responses aktualisieren State (`data.timeEntries`, `workflowState.cache`), danach `renderApp()` → DOM aktualisiert.

**Zentrale State-Objekte**

- **`workflowState`** – Single Source of Truth für den Kalender-Workflow:

```382:390:app.js
const workflowState = {
  viewMode: 'day', // 'day' | 'week' | 'month' | 'year' | 'team'
  selectedDate: null, // 'YYYY-MM-DD'
  selectedWeekStart: null, // 'YYYY-MM-DD' (Monday)
  cache: {
    dayEntries: [],
    weekEntries: [],
    teamData: null
  }
};
```

- **`uiState`** – UI-spezifische Flags und Kontext (Aktive Ansicht, User, Kalender-Modus, Drag/Drop usw.):

```393:403:app.js
const uiState = {
  activeMode: "plan", // plan | manage
  activeView: "calendar",
  calendarViewMode: "week", // year | month | week | day
  timeGridDragState: null,
  draggedWorkerId: null,
  draggedTeamId: null,
  calendarDate: new Date(),
  ...
  calendarViewUserId: null,
  isEmployeeCalendarModalOpen: false,
};
```

- **`timeEntryWizardState`** – Single Source of Truth für Wizard-Angaben:

```8547:8559:app.js
const timeEntryWizardState = {
  isOpen: false,
  step: 1,
  date: null,
  startTime: null,
  endTime: null,
  locationId: null,
  category: 'BUERO_ALLGEMEIN',
  categoryType: 'standard',
  selectedProjectId: null,
  notes: '',
  replaceExisting: false,
  selectedUserId: null
};
```

- **`data.timeEntries`** – klassischer Client-Cache für die Wochen-/Monats-/Jahresansichten:

```8418:8468:app.js
async function loadTimeEntries(dateFrom = null, dateTo = null) {
  const calendarViewUserId = getCalendarViewUserId();
  const viewUser = calendarViewUserId ? data.users.find(u => u.id === calendarViewUserId) : null;
  const activeWorkerId = viewUser?.workerId || null;
  const activeUserId = calendarViewUserId || null;
  ...
  const response = await api.getTimeEntries(params);
  if (response.success) {
    data.timeEntries = response.data || [];
    console.log('[loadTimeEntries] Loaded', data.timeEntries.length, 'entries');
  }
}
```

**View-Modes & zugehörige Render-Funktionen**

- **`uiState.activeView === "calendar"`** → `renderCalendarView()` (enthält Week-Grid, Day-View etc.).
- **`workflowState.viewMode === 'team'`** → `renderTeamCalendar()`:

```4694:4703:app.js
function renderTeamCalendar() {
  const isAdmin = data.currentUser && (data.currentUser.role === 'Admin' || (data.currentUser.permissions && data.currentUser.permissions.includes('manage_users')));
  if (!isAdmin) {
    return '<div class="error-message">Nur Administratoren können den Teamkalender öffnen.</div>';
  }
  // Use workflowState cache (loaded via loadTeamWeek)
  const teamData = workflowState.cache.teamData;
  ...
}
```

- **Legacy Dashboards (`workers`/`teams`/`sites`)** wurden aus `renderActiveView()` entfernt – Kalender ist jetzt die einzige Hauptansicht:

```4173:4183:app.js
function renderActiveView() {
  if (workflowState.viewMode === 'team') {
    return renderTeamCalendar();
  }
  if (uiState.calendarViewMode === 'team-calendar') {
    return renderTeamCalendar();
  }
  // Dashboards (workers/teams/sites) wurden entfernt – immer Kalender rendern
  return renderCalendarView();
}
```

**Zentrale Loader im Workflow-Layer**

- **`loadDayEntries(date, userId?)`**: Holt Einträge via `GET /api/time_entries` und füllt `workflowState.cache.dayEntries`.
- **`loadWeekEntries(weekStart, userId?)`**: Holt Mo–So für einen User und füllt `workflowState.cache.weekEntries`.
- **`loadTeamWeek(weekStart)`**: Holt Admin-Overview-Daten und füllt `workflowState.cache.teamData`.

Beispiel `loadTeamWeek`:

```412:432:app.js
async function loadTeamWeek(weekStart) {
  try {
    const monday = new Date(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const dateFrom = weekStart;
    const dateTo = sunday.toISOString().split('T')[0];
    const response = await api.getAdminOverview({ date_from: dateFrom, date_to: dateTo });
    if (response.ok && response.users && response.entries) {
      workflowState.cache.teamData = {
        users: response.users,
        entries: response.entries,
        date_from: dateFrom,
        date_to: dateTo
      };
      workflowState.selectedWeekStart = weekStart;
      return workflowState.cache.teamData;
    }
    workflowState.cache.teamData = { users: [], entries: [] };
    return workflowState.cache.teamData;
  } catch (error) {
    ...
  }
}
```

---

### 2.B Backend – Endpoints & AuthZ

**Routing (`backend/api/index.php`)**

- Normalisiert URLs von `/backend/api` oder `/api` auf Ressourcen wie `time_entries`, `admin/overview/week`, `admin/cleanup_planned`.

```17:32:backend/api/index.php
$method = $_SERVER['REQUEST_METHOD'];
...
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/backend/api', '', $path);
$path = str_replace('/api', '', $path);
$path = trim($path, '/');
$segments = array_filter(explode('/', $path));
```

- Auth-Pflicht für alle Ressourcen außer `auth`, `me`, `test`:

```84:88:backend/api/index.php
// Check authentication for all other endpoints
$currentUser = checkAuth();
if (!$currentUser) {
    sendJSON(['success' => false, 'error' => 'Unauthorized'], 401);
}
```

**`/api/time_entries` (GET/POST/PUT/DELETE)**

- Dispatcher:

```70:115:backend/api/time_entries.php
function handleTimeEntries($method, $id, $action, $currentUser) {
  $db = getDBConnection();
  ...
  switch ($method) {
    case 'GET':  handleGetTimeEntries($db, $currentUser); break;
    case 'POST': handleCreateTimeEntry($db, $currentUser); break;
    case 'PUT':
    case 'PATCH': handleUpdateTimeEntry(...); break;
    case 'DELETE': handleDeleteTimeEntry(...); break;
  }
}
```

**GET `/api/time_entries?user_id=&date_from=&date_to=`**

- AuthZ: Worker sieht nur eigene Einträge, Admin kann filtern:

```137:166:backend/api/time_entries.php
$isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
if (!$isAdmin) {
  $workerId = $currentUser['worker_id'] ?? null;
  if ($workerId) {
    $conditions[] = "te.worker_id = ?";
    $bindings[] = $workerId;
  } else {
    $conditions[] = "te.created_by = ?";
    $bindings[] = $currentUser['id'];
  }
} else {
  if (isset($params['user_id']) && $params['user_id']) {
    ...
    $conditions[] = "te.worker_id = ?";
  }
  if (isset($params['worker_id']) && $params['worker_id']) {
    $conditions[] = "te.worker_id = ?";
  }
}
```

- Response-Shape wird im Handler normalisiert:

```194:229:backend/api/time_entries.php
foreach ($entries as &$entry) {
  $entry['id'] = $entry['id'];
  $entry['user_id'] = null;
  $entry['date'] = $entry['entry_date'];
  $entry['time_from'] = $entry['time_from'];
  $entry['time_to'] = $entry['time_to'];
  $entry['project_id'] = $entry['location_id'];
  $entry['project_name'] = $entry['location_address'] ?? ($entry['location_code'] ?? null);
  $entry['category'] = $entry['category'] ?? 'BUERO_ALLGEMEIN';
  $entry['status'] = $entry['status'] ?? 'PLANNED';
  $entry['notes'] = $entry['notes'] ?? '';
  if ($entry['worker_id']) {
    $userStmt = $db->prepare("SELECT id FROM users WHERE worker_id = ? LIMIT 1");
    ...
    $entry['user_id'] = $user['id'] ?? null;
  } else {
    $entry['user_id'] = $entry['created_by'] ?? null;
  }
  // Legacy-Felder für altes Frontend
}
sendJSON(['success' => true, 'data' => $entries]);
```

**POST `/api/time_entries` (Planen)**

- Body: `{ entry_date, time_from, time_to, category, notes?, status?, worker_id? | user_id? }`.
- Status-Default: `PLANNED`, Overlap-Check pro `worker_id` / `created_by` unter Berücksichtigung von Mitternacht (Minuten-Logik).

```235:263:backend/api/time_entries.php
if (empty($data['entry_date']) || empty($data['time_from']) || empty($data['time_to'])) ...
...
// Calculate hours
$hours = calculateHours($timeFrom, $timeTo);
// Overlap Validation with midnight handling
...
// Default status: PLANNED if admin, or if explicitly set
$status = isset($data['status']) ? $data['status'] : 'PLANNED';
```

**POST `/api/time_entries/confirm_day`**

- Router:

```112:119:backend/api/index.php
case 'time_entries':
  if (isset($segments[1]) && $segments[1] === 'confirm_day' && $method === 'POST') {
    handleConfirmDay($currentUser);
  } else {
    ...
  }
```

- Handler:

```9:44:backend/api/time_entries.php
function handleConfirmDay($currentUser) {
  ...
  $userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
  $userStmt->execute([$currentUser['id']]);
  $workerId = $userData['worker_id'] ?? null;
  $whereConditions = ["entry_date = ?", "status = 'PLANNED'"];
  ...
  if ($workerId) {
    $whereConditions[] = "worker_id = ?";
  } else {
    $whereConditions[] = "created_by = ?";
  }
  UPDATE time_entries SET status = 'CONFIRMED', ... WHERE ...
}
```

- Response: `{ ok: true, date, updated_count }`.

**GET `/api/admin/overview/week?date_from=&date_to=`**

- AuthZ: Nur Admin:

```10:20:backend/api/admin_overview.php
$isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
if (!$isAdmin) {
  sendJSON(['success' => false, 'error' => 'Permission denied: Admin only'], 403);
}
if ($method !== 'GET') ...
```

- Response-Shape: `users`, `entries` (flach) plus `data` (aggregiert) – das Frontend nutzt `users`/`entries`.

```186:193:backend/api/admin_overview.php
sendJSON([
  'ok' => true,
  'success' => true,
  'date_from' => $dateFrom,
  'date_to' => $dateTo,
  'users' => $usersList,
  'entries' => $entriesList,
  'data' => $result
]);
```

**POST `/api/admin/cleanup_planned`**

- Router:

```122:133:backend/api/index.php
case 'admin':
  if (isset($segments[1]) && $segments[1] === 'cleanup_planned') {
    handleAdminCleanupPlanned($method, $currentUser);
  }
```

- Handler (in `time_entries.php`):

```619:640:backend/api/time_entries.php
function handleAdminCleanupPlanned($method, $currentUser) {
  if ($method !== 'POST') ...
  $isAdmin = hasPermission($currentUser, 'manage_users') || $currentUser['role'] === 'Admin';
  if (!$isAdmin) sendJSON(['success' => false, 'error' => 'Permission denied: Admin only'], 403);
  $stmt = $db->prepare("DELETE FROM time_entries WHERE status = 'PLANNED'");
  $stmt->execute();
  $deletedCount = $stmt->rowCount();
  sendJSON(['ok' => true, 'deleted_count' => $deletedCount]);
}
```

### 2.C DB – Relevante Tabellen

**`users`** (Owner, Admin, Worker)

```7:23:backend/database.sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  ...
  role VARCHAR(50) NOT NULL DEFAULT 'Worker',
  permissions JSON,
  worker_id VARCHAR(50) NULL,
  ...
);
```

**`time_entries`** (IST-Zeiterfassung, inkl. Planungssicht)

Aus `SCHEMA_FINAL.md`:

```51:66:backend/SCHEMA_FINAL.md
time_entries:
  id INT AUTO_INCREMENT PRIMARY KEY
  worker_id VARCHAR(50) NOT NULL
  location_id VARCHAR(50) NULL
  assignment_id INT NULL
  entry_date DATE NOT NULL
  entry_type ENUM(...)
  category ENUM(...)
  time_from TIME NOT NULL
  time_to TIME NOT NULL
  hours DECIMAL(4,2) NOT NULL
  notes TEXT NULL
  created_by VARCHAR(50) NOT NULL
  updated_by VARCHAR(50) NOT NULL
```

**Owner-Logik in API**

- Owner im Backend wird dynamisch aus `worker_id` bzw. `created_by` berechnet (`user_id` Feld im Response), nicht physisch in der Tabelle gespeichert:

```208:216:backend/api/time_entries.php
if ($entry['worker_id']) {
  $userStmt = $db->prepare("SELECT id FROM users WHERE worker_id = ? LIMIT 1");
  ...
  $entry['user_id'] = $user['id'] ?? null;
} else {
  $entry['user_id'] = $entry['created_by'] ?? null;
}
```

---

## 3. Beweisbare Root-Cause-Analyse

### 3.1 Teamkalender

**Event-Chain**

1. **Button existiert**  
   - Toolbar-Button mit `data-action="open-team-calendar"`:

```1454:1469:app.js
<div class="content__tabs">
  ...
  <button class="btn-secondary btn-team-calendar-header" id="btn-team-calendar-header"
          title="Teamkalender anzeigen" data-action="open-team-calendar">
    <span class="btn-icon">👥</span>
    <span class="btn-text">Teamkalender</span>
  </button>
</div>
```

2. **Click-Handler feuert**  
   - Im globalen Click-Handler wird `action === 'open-team-calendar'` behandelt:

```2482:2505:app.js
} else if (action === 'open-team-calendar' || action === 'show-team-calendar') {
  const isAdmin = data.currentUser && (...);
  if (!isAdmin) { alert('Nur Administratoren...'); return; }
  ...
  const weekStartStr = weekStart.toISOString().split('T')[0];
  workflowState.viewMode = 'team';
  loadTeamWeek(weekStartStr).then(() => { renderApp(); });
}
```

3. **viewMode wird gesetzt & Loader aufgerufen**  
   - `workflowState.viewMode = 'team'` und `loadTeamWeek(weekStartStr)` → füllt `workflowState.cache.teamData` (siehe oben).

4. **renderApp → renderActiveView**  
   - `renderActiveView()` gibt bei `workflowState.viewMode === 'team'` den Teamkalender zurück:

```4173:4183:app.js
if (workflowState.viewMode === 'team') {
  return renderTeamCalendar();
}
```

5. **API-Call & Mapping**  
   - `loadTeamWeek` ruft `api.getAdminOverview` → `GET /api/admin/overview/week`:

```333:336:app.js
async getAdminOverview(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return this.get(`admin/overview/week${queryString ? '?' + queryString : ''}`);
}
```

   - Backend liefert `users` + `entries` mit `user_id`, `date`, `time_from`, `time_to`, `status`:

```170:183:backend/api/admin_overview.php
foreach ($entries as $entry) {
  $entriesList[] = [
    'id' => $entry['id'],
    'user_id' => $entry['user_id'] ?? null,
    'date' => $entry['entry_date'],
    'time_from' => $entry['time_from'],
    'time_to' => $entry['time_to'],
    'project_id' => $entry['location_id'],
    'project_code' => $entry['location_code'] ?? null,
    'project_name' => $entry['location_address'] ?? null,
    'category' => $entry['category'],
    'status' => $entry['status']
  ];
}
```

6. **Render-Grid**  
   - `renderTeamCalendar()` gruppiert nach `user_id` + `date`:

```4747:4757:app.js
const entriesByUserDay = {};
entries.forEach(entry => {
  const userId = entry.user_id || 'unknown';
  const date = entry.date || entry.entryDate || entry.entry_date;
  if (!date) return;
  const key = `${userId}_${date}`;
  if (!entriesByUserDay[key]) {
    entriesByUserDay[key] = [];
  }
  entriesByUserDay[key].push(entry);
});
```

**Root Cause (Teamkalender)**

- **Symptom**: Im Teamkalender fehlen bestimmte Mitarbeiter/Einträge oder ganze Zeilen, obwohl Time-Entries existieren.
- **Beweis / Ursache**:
  - `admin_overview.php` konstruiert `user_id` über `COALESCE(u1.id, u2.id)` und Filter `(e['worker_id'] === $workerId) || (e['worker_id'] === null && e['created_by'] === $userId)` [[80:83:backend/api/admin_overview.php]].
  - Wenn **`time_entries.worker_id`** nicht korrekt mit `users.worker_id` verknüpft ist (oder `created_by` auf einen User ohne `worker_id` zeigt), wird `user_id` in der Admin-Overview **null** → `entriesByUserDay` speichert unter Key `'unknown_YYYY-MM-DD'`.
  - Gleichzeitig baut `usersList` nur Nutzer mit **nicht-null** `worker_id` auf [[43:50,161:167:backend/api/admin_overview.php]].
  - Folge: Es existieren **Entries mit `user_id = null`**, aber kein korrespondierender User in `teamData.users`; im Grid wird die Zeile nie erzeugt.
- **Warum “keine Veränderung” sichtbar?**
  - Selbst wenn neue Einträge erstellt und korrekt gespeichert werden, werden sie im Teamkalender unter `user_id = null` gruppiert und erscheinen damit in keiner User-Zeile. Die API antwortet ok, aber das UI rendert sie nicht, weil die Joins/Owner-Zuordnung inkonsistent sind.

---

### 3.2 Confirm-Day

**Event-Chain**

1. **Button-Bedingung**  
   - In der Day-View-Renderfunktion wird der Confirm-Button nur eingeblendet, wenn es PLANNED-Einträge gibt:

```3164:3166,3238:3244:app.js
const hasPlannedEntries = dayTimeEntries.some(entry => entry.status === 'PLANNED');
...
${hasPlannedEntries ? `
  <div class="day-view__confirm-section">
    <button class="btn-primary btn-confirm-day" data-action="confirm-day" data-date="${dateStr}">
      <span class="btn-icon">✓</span>
      <span class="btn-text">Geplante Zeiten bestätigen</span>
    </button>
  </div>
` : ''}
```

2. **Handler feuert**  

```2451:2472:app.js
} else if (action === 'confirm-day') {
  const dateStr = btn.getAttribute('data-date');
  ...
  const response = await api.confirmDay(dateStr);
  if (response.ok || response.success) {
    await loadDayEntries(dateStr);
    const weekStart = ...;
    const weekStartStr = weekStart.toISOString().split('T')[0];
    await loadWeekEntries(weekStartStr);
    renderApp();
  }
}
```

3. **Request**  
   - `api.confirmDay(date)` sendet `POST /api/time_entries/confirm_day` mit Body `{date: 'YYYY-MM-DD'}`:

```329:331:app.js
async confirmDay(date) {
  return this.post('time_entries/confirm_day', { date: date });
}
```

4. **Backend**  
   - Bestätigt **PLANNED**-Einträge für den **aktuellen User** (Basis `users.worker_id` / `created_by`), nicht für den im Kalender ausgewählten User:

```25:42,44:51:backend/api/time_entries.php
$userStmt = $db->prepare("SELECT worker_id FROM users WHERE id = ?");
...
if ($workerId) {
  $whereConditions[] = "worker_id = ?";
} else {
  $whereConditions[] = "created_by = ?";
}
...
UPDATE time_entries SET status = 'CONFIRMED' ... WHERE entry_date = ? AND status='PLANNED' AND (worker_id = ? ODER created_by = ?)
```

5. **Reload-Logik**  
   - Nach Bestätigung werden **nur** `loadDayEntries` und `loadWeekEntries` auf Basis des Datums aufgerufen – diese schreiben in `workflowState.cache`, **nicht** in `data.timeEntries`.

**Root Cause (confirm-day)**

- **Symptom**:  
  - a) Als Admin im Kalender eines Mitarbeiters: Klick auf “Geplante Zeiten bestätigen” ändert nichts im Grid.  
  - b) Als Mitarbeiter: Bestätigung scheint gelegentlich keine Wirkung zu haben.
- **Beweis / Ursachen:**
  1. **Falscher Owner beim Confirm für Admin-View**  
     - Confirm-Day-Backend schaut **immer** auf `currentUser` (`$currentUser['id']` / `users.worker_id`), ignoriert den vom Admin im Kalender ausgewählten User.  
     - Wenn Admin im Kalender von Mitarbeiter X steht, bestätigt `POST /confirm_day` **Admin-Einträge**, `loadDayEntries` lädt aber Einträge von X → im UI bleibt alles PLANNED.
  2. **Zwei verschiedene Quellen (`data.timeEntries` vs. `workflowState.cache`)**  
     - Week-Grid basiert auf `data.timeEntries` (geladen via `loadTimeEntries`), Confirm-Day aktualisiert jedoch nur `workflowState.cache.dayEntries`/`weekEntries`.  
     - Resultat: **Day-View** kann geupdatet erscheinen, während das Week-Grid weiter den alten Status aus `data.timeEntries` anzeigt → subjektiv “nichts passiert”.

---

### 3.3 Wizard Datum

**Event-Chain**

1. **Initialer Wizard-State / Öffnen**

```8547:8579:app.js
const timeEntryWizardState = { isOpen:false, step:1, date:null, ... };
function openTimeEntryWizard(suggestedDate = null, ...) {
  const selectedDate = suggestedDate || uiState.selectedDay || uiState.calendarDate || new Date();
  const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
  ...
  timeEntryWizardState.date = date.toISOString().split('T')[0];
  ...
  renderApp();
  attachTimeEntryWizardHandlers();
}
```

2. **Input-Bindung für Datum**  
   - In Step 1 wird `wizard-date` direkt an `timeEntryWizardState.date` gebunden:

```2293:2305:app.js
if (timeEntryWizardState.step === 1) {
  const dateInput = document.getElementById('wizard-date');
  ...
  if (dateInput) {
    timeEntryWizardState.date = dateInput.value;
  }
}
```

   - Zusätzlich: Ein dedizierter Change-Handler, der nur den State aktualisiert (kein Reset):

```9315:9343:app.js
if (dateInput) {
  if (!existingHandler) {
    dateInput.addEventListener('change', (e) => {
      const newDate = e.target.value;
      if (newDate && newDate !== timeEntryWizardState.date) {
        timeEntryWizardState.date = newDate;
        ...
        renderApp();
      }
    });
    dateInput.setAttribute('data-date-handler-attached', 'true');
  }
}
```

3. **Payload beim Save**

```9484:9493:app.js
// PHASE 5: SINGLE SOURCE OF TRUTH - date from state, never fallback
const entryDate = timeEntryWizardState.date || workflowState.selectedDate || new Date().toISOString().split('T')[0];
const entryData = {
  entry_date: entryDate,
  time_from: timeEntryWizardState.startTime,
  time_to: timeEntryWizardState.endTime,
  category: finalCategory,
  notes: timeEntryWizardState.notes || '',
  status: status
};
```

4. **Backend-Speicherung**

```235:263:backend/api/time_entries.php
if (empty($data['entry_date']) || empty($data['time_from']) || empty($data['time_to'])) ...
$hours = calculateHours($timeFrom, $timeTo);
INSERT INTO time_entries (..., entry_date, ..., time_from, time_to, hours, ...) VALUES (...)
```

5. **Reload / UI-Sync nach Speichern**

```9510:9524:app.js
if (response.success) {
  workflowState.selectedDate = entryDate;
  await loadDayEntries(entryDate);
  const weekStart = new Date(entryDate + 'T00:00:00');
  ...
  const weekStartStr = weekStart.toISOString().split('T')[0];
  await loadWeekEntries(weekStartStr);
  ...
  uiState.selectedDay = entryDateObj;
  uiState.calendarDate = entryDateObj;
  uiState.calendarViewMode = 'day';
  closeTimeEntryWizard();
  renderApp();
}
```

**Root Cause (Wizard-Datum)**

- **Symptom**:  
  - a) Ein Eintrag wird für Datum X im Wizard erfasst, erscheint aber (scheinbar) im Wochenraster an einem anderen Tag oder gar nicht.  
  - b) Nach Save bleibt die Wochenübersicht unverändert.
- **Beweis / Ursachen:**
  1. **Frühere Inkonsistenz war: `entryDate` teilweise aus `uiState.selectedDay` statt rein aus `timeEntryWizardState.date`** – das ist im aktuellen Code behoben (Single Source of Truth, s.o.).  
  2. **Verbliebene Inkonsistenz in der Anzeige**:
     - `saveTimeEntryFromWizard` aktualisiert **nur** `workflowState.cache` via `loadDayEntries`/`loadWeekEntries`.  
     - Das **Week-Grid** selbst rendert aber weiter aus `data.timeEntries` (geladen durch `loadTimeEntries`) und kennt `workflowState.cache` nicht.  
     - Folge: In der Day-View (die `workflowState.cache` nutzt) ist der Eintrag korrekt sichtbar und auf dem richtigen Datum, im Week-Grid (das `data.timeEntries` nutzt) erst nach einem separaten `loadTimeEntries`/Reload → gefühlte “falsche” oder fehlende Datumslage.

---

### 3.4 Intern / Ohne Baustelle – Totals

**Render-Funktion & Stunden**

```3821:3861:app.js
function renderDayDetailsSection(date, dayTimeEntries = []) {
  ...
  if (locationIds.length === 0) {
    return `
      <div class="day-view__details-panel">
        <div class="day-details-panel__header">
          <h3>Intern / Ohne Baustelle</h3>
        </div>
        <div class="intern-info-details">
          ${dayTimeEntries.length > 0 ? `
            <div class="intern-entries-summary">
              ${dayTimeEntries.map(entry => {
                ...
                return `
                  <div class="intern-entry-item">
                    <span class="intern-entry-time">${entry.time_from || '—'}–${entry.time_to || '—'}</span>
                    <span class="intern-entry-category">${categoryLabel}</span>
                    <span class="intern-entry-hours">${getEntryHours(entry).toFixed(2)}h</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ...}
```

- `getEntryHours(entry)` fällt zurück auf `parseFloat(entry.hours)` wenn `time_from/time_to` nicht gesetzt:

```58:62:app.js
function getEntryHours(entry) {
  if (entry.time_from && entry.time_to) {
    return calculateHoursFromTimes(entry.time_from, entry.time_to);
  }
  return parseFloat(entry.hours) || 0;
}
```

**Andere Summenberechnungen (Sidebar, Year/Month)**

- Sidebar-Day/Week nutzt schon `entryHours` + `groupByCategory` (Single Source of Truth):

```2722:2734,2751:2757:app.js
const dayEntries = ...filter(...);
const dayTotal = dayEntries.reduce((sum, entry) => sum + entryHours(entry), 0);
...
const dayCategoryTotals = groupByCategory(dayEntries);
const weekCategoryTotals = groupByCategory(weekEntries);
```

- Jahres-/Monats-Übersicht nutzen **noch** `parseFloat(entry.hours)`:

```2901:2907:app.js
yearEntries.forEach(entry => {
  const dateStr = entry.entry_date;
  ...
  daySummaries[dateStr].total_hours += parseFloat(entry.hours || 0);
  daySummaries[dateStr].by_category[entry.category] =
    (daySummaries[dateStr].by_category[entry.category] || 0) + parseFloat(entry.hours || 0);
});
```

```3050:3057:app.js
monthEntries.forEach(entry => {
  if (!monthData.summary[dateStr]) { ... }
  summary.total_hours += parseFloat(entry.hours || 0);
  summary.by_category[entry.category] += parseFloat(entry.hours || 0);
  summary.by_location[entry.location_id] += parseFloat(entry.hours || 0);
});
```

**Root Cause (Intern Totals)**

- **Symptom**: Interne Summen (rechts) stimmen nicht über alle Views überein; Tag-View vs. Year/Month vs. Intern-Panel unterscheiden sich.
- **Beweis / Ursachen:**
  1. **Zwei Berechnungswege**:
     - Intern-Panel nutzt `getEntryHours` (teils `time_from/time_to`, teils `entry.hours`).  
     - Sidebar und neue Helpers setzen auf `entryHours(entry)` (immer `time_from/time_to`).  
     - Year/Month basieren weiterhin **direkt** auf `parseFloat(entry.hours)`.
  2. **Persistierte `hours`-Werte**:
     - Backend berechnet `hours` beim Anlegen/Ändern; bei späteren Schema-/Logikänderungen können Alt-Daten inkonsistent sein (z.B. 8h gespeichert, aber 08:00–17:00 = 8.5h).  
     - Dadurch entstehen Abweichungen zwischen Views, die `entry.hours` verwenden, und Views, die `time_from/time_to` neu berechnen.

---

## 4. Data-Flow-Diagramm (Text)

**User Action → Frontend → API → DB → Frontend**

1. **Planung/Erfassung (Wizard / Week-Grid)**
   - User klickt Slot oder “Zeit erfassen” → `openTimeEntryWizard()` initialisiert `timeEntryWizardState`.  
   - Nach Eingabe: `saveTimeEntryFromWizard()` baut `entryData` (inkl. `entry_date` aus `timeEntryWizardState.date`), ruft `api.createTimeEntry(entryData)`.  
   - `POST /api/time_entries` speichert in `time_entries` (inkl. `hours`, `entry_date`, `worker_id`/`created_by`).  
   - Wizard ruft `loadDayEntries` + `loadWeekEntries` (nur `workflowState.cache`), während `loadTimeEntries` (für Week-Grid) separat über `api.getTimeEntries` läuft.

2. **Bestätigung (Confirm-Day)**
   - Button in Day-View (nur bei PLANNED-Einträgen) → Click-Handler ruft `api.confirmDay(date)`.  
   - `POST /api/time_entries/confirm_day` setzt `status='CONFIRMED'` für Einträge des aktuellen Users an diesem Datum.  
   - Frontend lädt `loadDayEntries(date)` + `loadWeekEntries(weekStart)` (Cache), aber nicht automatisch `loadTimeEntries`.

3. **Teamkalender**
   - Admin klickt Teamkalender-Button → `workflowState.viewMode='team'`, `loadTeamWeek(weekStart)` ruft `GET /api/admin/overview/week`.  
   - Backend aggregiert Einträge pro User/Tag basierend auf `worker_id`/`created_by` (`user_id`-Mapping).  
   - `renderTeamCalendar()` baut Grid: Zeilen = `teamData.users`, Zellen = `entriesByUserDay[user.id + '_' + date]`.

4. **Intern/Ohne Baustelle**
   - Day-View ruft `renderDayDetailsSection(date, dayTimeEntries)`.  
   - Wenn keine `location_id` gesetzt, werden alle Einträge als intern behandelt, Stunden per `getEntryHours` summiert und mit Kategorien angezeigt.

---

## 5. Fix-Plan (nur Beschreibung, kein Code)

### Priorität 1 – Konsistenter Owner & Teamkalender

1. **Owner-Konsolidierung in Admin-Overview**
   - Datei: `backend/api/admin_overview.php`  
   - Maßnahme: Sicherstellen, dass **alle** relevanten `time_entries`-Zeilen einen stabilen `user_id` erhalten (z.B. durch expliziten Join auf `users.id = te.created_by` als Fallback, nicht nur `worker_id`-Mapping), und ggf. Einträge ohne gültigen User aus dem Frontend explizit markieren statt zu droppen.

2. **Teamkalender: Fallback-Zeile für unbekannte Owner**
   - Datei: `app.js` (Funktion `renderTeamCalendar`)  
   - Maßnahme: Einträge mit `user_id = null` in eine separate “Unzugeordnete” Zeile rendern, damit sie sichtbar sind, auch wenn die Worker-Zuordnung im Backend fehlt.

### Priorität 2 – Confirm-Day/Kalender-Synchronisation

3. **Confirm-Day für ausgewählten Kalender-User**
   - Datei: `backend/api/time_entries.php` + `app.js`  
   - Maßnahme: Optionalen `user_id`-Parameter für `confirm_day` einführen (nur Admin), und im Backend die WHERE-Bedingung auf den **gewählten** User statt auf `currentUser` anwenden.

4. **Einheitlicher Reload nach Confirm-Day**
   - Datei: `app.js` (`confirm-day`-Handler)  
   - Maßnahme: Nach erfolgreichem Confirm zusätzlich `loadTimeEntries` für die aktuelle Woche aufrufen, damit das Week-Grid und alle Summaries in `data.timeEntries` mitziehen.

### Priorität 3 – Wizard/Week-Grid Single Source of Truth

5. **Week-Grid auf Workflow-Cache umstellen**
   - Datei: `app.js` (Week-View-Renderfunktionen)  
   - Maßnahme: Week-Grid nicht mehr direkt aus `data.timeEntries`, sondern aus `workflowState.cache.weekEntries` rendern, das von `loadWeekEntries` befüllt wird.

6. **Wizard: Konsistente Nutzung von `entryHours` in allen abgeleiteten Views**
   - Datei: `app.js` (Year/Month-Summary, ggf. weitere Übersichten)  
   - Maßnahme: Alle Stellen, die noch `parseFloat(entry.hours)` nutzen (z.B. Year-/Month-Summary), auf `entryHours(entry)` umstellen.

### Priorität 4 – Intern/Ohne Baustelle

7. **Intern-Panel auf `entryHours` umstellen**
   - Datei: `app.js` (`renderDayDetailsSection`)  
   - Maßnahme: Statt `getEntryHours(entry)` überall `entryHours(entry)` verwenden, um garantiert aus `time_from/time_to` zu rechnen.

8. **Kategorie-Summen zentralisieren**
   - Datei: `app.js` (`renderDayDetailsSection`, ggf. andere Panels)  
   - Maßnahme: Auch im Intern-Panel `groupByCategory(dayTimeEntries)` nutzen, damit Tages- und Intern-Kategorien dieselben Summen zeigen.

### Priorität 5 – Technische Hygiene / Sichtbarkeit

9. **Explizite Logs für Owner-Mapping in Admin-Overview**
   - Dateien: `backend/api/admin_overview.php`, `backend/api/time_entries.php`  
   - Maßnahme: (Nur in Debug-Konfiguration) Loggen, wenn `user_id` nicht bestimmt werden kann, um Dateninkonsistenzen in `users.worker_id` sichtbar zu machen.

10. **Hard-Reload-Hinweis bei Frontend-Deploy**
   - Dokumentation / UI-Hinweis  
   - Maßnahme: Hinweis einbauen (z.B. im Admin-Report oder Hilfetext), dass nach Änderungen an `app.js` ein Hard Reload (Strg+F5) nötig sein kann, da kein Bundler/Hashing aktiv ist.

---

## 6. Top 5 Root Causes (Kurzfassung)

1. **Owner-Mapping im Teamkalender**: Einträge ohne gültiges `user_id`-Mapping (über `worker_id`/`created_by`) werden unter `'unknown'` gruppiert und erscheinen in keiner Benutzerzeile.
2. **Confirm-Day bestätigt falschen Owner im Admin-Kontext**: Backend bestätigt immer den aktuellen User, während das Frontend die Einträge eines anderen Mitarbeiters anzeigt.
3. **Zwei parallele Datenquellen (`data.timeEntries` vs. `workflowState.cache`)**: Confirm-Day und Wizard aktualisieren nur den Workflow-Cache; das Week-Grid nutzt weiterhin `data.timeEntries`.
4. **Inhomogene Stundenberechnung**: Einige Views (Year/Month/Intern) verwenden `entry.hours`, andere `time_from/time_to` → divergierende Summen und Totals.
5. **Fehlende Sichtbarkeit von nicht zugeordneten Einträgen im Teamkalender**: Einträge ohne passenden User werden nicht als eigene Zeile oder Warnung angezeigt, sondern schlicht unterschlagen.




