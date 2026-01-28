# Technova Dispo Planner – Phasen-Roadmap

**Status:** Dokumentation erstellt, wartet auf Go für Phase 1  
**Letzte Aktualisierung:** Vor Phase 1

---

## Übersicht: 12 Phasen

| Phase | Name | Status | Dependencies |
|-------|------|--------|--------------|
| 1 | RBAC vereinfachen | ⏳ Pending | - |
| 2 | Design System | ⏳ Pending | Phase 1 |
| 3 | 3-Spalten-Layout | ⏳ Pending | Phase 2 |
| 4 | Ressourcen modellieren | ⏳ Pending | Phase 3 |
| 5 | Ressourcen CRUD | ⏳ Pending | Phase 4 |
| 6 | Dispatch System | ⏳ Pending | Phase 5 |
| 7 | Week View Cards | ⏳ Pending | Phase 6 |
| 8 | Drag & Drop | ⏳ Pending | Phase 7 |
| 9 | Right Panel | ⏳ Pending | Phase 8 |
| 10 | Day View + Confirm | ⏳ Pending | Phase 9 |
| 11 | Notizen + TODOs | ⏳ Pending | Phase 10 |
| 12 | Final Polish | ⏳ Pending | Phase 11 |

---

## Phase 1: RBAC vereinfachen (ADMIN/WORKER) + Guards

### Ziel
Sauberes Rollenmodell mit zentralen Guards, das später jede UI/Logik zuverlässig schützen kann.

### Aufgaben

#### A) Frontend: `app/utils/permissions.js` konsolidieren
**Neue Funktionen:**
```javascript
// Basis-Checks
export function isAdmin(user) { ... }
export function isWorker(user) { ... }

// Planning Permissions
export function canPlanFor(user, workerId) { ... }
export function canViewTeamCalendar(user) { ... }

// Management Permissions
export function canManageUsers(user) { ... }
export function canManageLocations(user) { ... }

// Medical Certificates
export function canUploadMedicalCert(user, workerId) { ... }
export function canConfirmDay(user, workerId, date) { ... }
```

**Alte Funktionen entfernen/umstellen:**
- `isAdminOrManager()` → `isAdmin()`
- `canPlanForWorker()` → `canPlanFor()`
- Konsolidiere alle Permission-Checks

#### B) UI Guards implementieren
**Dateien zu ändern:**
- `app/views/planning/planningShell.js`
  - Teamkalender-Button nur wenn `canViewTeamCalendar()`
- `app/views/planning/planningSelector.js`
  - Worker-Dropdown nur Admin (Worker sieht "Ich")
- `app/views/management/managementShell.js`
  - Tabs nur Admin (Worker nur eigene Certificates wenn erlaubt)
- `app/views/modals/planningEntryModal.js`
  - Worker-Dropdown disabled für Worker

#### C) Backend: Permission Checks sicherstellen
**Dateien zu prüfen:**
- `backend/api/planning_entries.php`
  - Worker darf nur own planen/sehen/bestätigen
- `backend/api/medical_certificates.php`
  - Worker nur own Certificates
- `backend/api/time_entries.php`
  - Worker nur own Time Entries
- `backend/api/users.php`
  - Nur Admin
- `backend/api/locations.php`
  - Nur Admin

**Pattern:**
```php
$isAdmin = $currentUser['role'] === 'Admin';
if (!$isAdmin && $workerId !== $currentUser['worker_id']) {
    sendJSON(['success' => false, 'error' => 'Permission denied'], 403);
}
```

#### D) Smoke Tests
- ✅ Admin sieht Verwalten + Teamkalender
- ✅ Worker sieht nur Planen, keine Admin Tabs
- ✅ Worker kann nicht für andere planen (UI + API)
- ✅ Worker kann nicht andere Certificates sehen/downloaden
- ✅ Backend blockiert Worker-Requests für andere Worker

### Done-Kriterien
- ✅ Worker kann nichts Admin-spezifisches nutzen (UI + API)
- ✅ Alle Permission-Checks zentral in `permissions.js`
- ✅ Backend Checks konsistent
- ✅ Keine Console Errors
- ✅ Smoke Tests bestehen

---

## Phase 2: Technova Design System (CSS Komponenten)

### Ziel
Einheitliche UI-Bausteine für den kompletten Umbau.

### Aufgaben

#### A) CSS-Variablen erweitern
**Datei:** `styles.css`

```css
:root {
  /* Colors */
  --primary: #6a4df7;
  --primary-dark: #5b3fd9;
  --primary-light: #9b6dfb;
  --secondary: #c084fc;
  --accent: #8b5cf6;
  --accent-light: #e0d5ff;
  
  /* Backgrounds */
  --bg-body: #faf8ff;
  --bg-panel: #ffffff;
  --bg-card: #ffffff;
  --bg-sidebar: #f5f0ff;
  
  /* Text */
  --text-main: #1a1538;
  --text-muted: #6b7280;
  --text-disabled: #9ca3af;
  
  /* Borders */
  --border-light: #ede9ff;
  --border-medium: #d8b4fe;
  --border-dark: #c084fc;
  
  /* Shadows */
  --shadow-sm: 0 4px 16px rgba(106, 77, 247, 0.12);
  --shadow: 0 20px 50px rgba(106, 77, 247, 0.18);
  --shadow-lg: 0 30px 60px rgba(106, 77, 247, 0.25);
  
  /* Radius */
  --radius-sm: 6px;
  --radius: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

#### B) Komponenten-Klassen definieren
**Buttons:**
```css
.btn { /* Base */ }
.btn--primary { }
.btn--secondary { }
.btn--ghost { }
.btn--danger { }
.btn--loading { }
.btn--disabled { }
```

**Tabs:**
```css
.tabs { }
.tab { }
.tab--active { }
```

**Cards/Panels:**
```css
.card { }
.panel { }
.card__header { }
.card__body { }
.card__footer { }
```

**Forms:**
```css
.input { }
.input--error { }
.select { }
.chip { }
.chip-input { }
```

**Badges:**
```css
.badge { }
.badge--primary { }
.badge--success { }
.badge--warning { }
.badge--danger { }
```

#### C) Views schrittweise migrieren
**Priorität:**
1. Planen/Verwalten Header + Buttons + Tabs
2. Modals
3. Forms
4. Lists/Tables

### Done-Kriterien
- ✅ Alle Komponenten-Klassen definiert
- ✅ Views nutzen Design System
- ✅ Keine Layout-Regression
- ✅ UI wirkt konsistent

---

## Phase 3: Planen Layout auf 3-Spalten

### Ziel
Dispo-Layout: Sidebar (320px) / Kalender (flex) / Right Panel (360px)

### Aufgaben

#### A) `planningShell.js` umbauen
**Grid-Layout:**
```css
.planning-shell {
  display: grid;
  grid-template-columns: 320px 1fr 360px;
  gap: var(--spacing);
}
```

**Links (Sidebar):**
- Platzhalter sichtbar
- Collapsible bei < 1200px
- Dock-Icons wenn collapsed

**Mitte (Kalender):**
- Bestehender Kalender (Week/Day View)
- Flexibel, scrollbar

**Rechts (Right Panel):**
- Platzhalter "Nicht im Einsatz"
- Später: Unassigned Resources

#### B) Responsive Verhalten
- < 1200px: Sidebar collapsible
- < 768px: Stack vertikal

### Done-Kriterien
- ✅ 3-Spalten-Layout sichtbar
- ✅ Sidebar nie komplett unsichtbar
- ✅ Kalender rendert korrekt
- ✅ Responsive funktioniert

---

## Phase 4: Ressourcen modellieren

### Ziel
Fahrzeuge & Geräte in State + API aufnehmen.

### Aufgaben

#### A) Backend
**Migration:** `backend/migrations/YYYYMMDD_add_resources.sql`
```sql
CREATE TABLE vehicles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- 'LKW', 'PKW', 'Kran', etc.
  license_plate VARCHAR(50),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- 'Bagger', 'Kran', etc.
  serial_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**API:** `backend/api/vehicles.php`, `backend/api/devices.php`
- GET (list), POST (create), PUT (update), DELETE

#### B) Frontend State
**State erweitern:**
```javascript
data: {
  vehicles: Vehicle[],
  devices: Device[]
}
```

**Actions:**
- `setVehicles(vehicles)`
- `upsertVehicle(vehicle)`
- `removeVehicle(id)`
- `setDevices(devices)`
- `upsertDevice(device)`
- `removeDevice(id)`

**Selectors:**
- `getVehicles()` → deduped by id
- `getDevices()` → deduped by id
- `getAvailableVehicles(date)` → filter by status
- `getAvailableDevices(date)` → filter by status

**Service:** `app/services/resourceService.js`
- `loadVehicles()`, `loadDevices()`
- `createVehicle(data)`, `updateVehicle(id, data)`, `deleteVehicle(id)`
- `createDevice(data)`, `updateDevice(id, data)`, `deleteDevice(id)`

**API Endpoints:** `app/api/endpoints.js`
- `api.getVehicles()`, `api.createVehicle()`, etc.
- `api.getDevices()`, `api.createDevice()`, etc.

### Done-Kriterien
- ✅ Admin kann Fahrzeuge/Geräte laden
- ✅ State enthält Arrays korrekt (deduped)
- ✅ API funktioniert (CRUD)
- ✅ Normalisierung (snake_case → camelCase)

---

## Phase 5: Verwaltung CRUD: Fahrzeuge & Geräte

### Ziel
Admin kann Ressourcen verwalten.

### Aufgaben

#### A) Management Shell erweitern
**Datei:** `app/views/management/managementShell.js`
- Tabs: "Fahrzeuge", "Geräte"

#### B) Views erstellen
**Dateien:**
- `app/views/management/vehicleManagementView.js`
- `app/views/management/deviceManagementView.js`

**Features:**
- Liste mit Table
- Create/Edit Modal
- Delete mit Confirm
- Filter/Search (optional)

#### C) Modals
**Dateien:**
- `app/views/modals/vehicleModal.js`
- `app/views/modals/deviceModal.js`

**Fields:**
- Vehicle: name, type, licensePlate, status
- Device: name, type, serialNumber, status

#### D) Handlers
**Datei:** `app/handlers/resourceHandlers.js`
- Event Delegation CRUD
- Form Submit Handler
- Delete Handler mit Confirm

### Done-Kriterien
- ✅ Create → List → Edit → Delete funktioniert
- ✅ Reload persistiert
- ✅ UI nutzt Design System
- ✅ RBAC: Nur Admin

---

## Phase 6: Dispatch System einführen

### Ziel
Dispatch Items sind Primärmodell für Planung.

### Aufgaben

#### A) Backend Migration
**Datei:** `backend/migrations/YYYYMMDD_add_dispatch.sql`
```sql
CREATE TABLE dispatch_items (
  id VARCHAR(50) PRIMARY KEY,
  location_id VARCHAR(50),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT 0,
  category VARCHAR(50), -- 'PROJEKT', 'SCHULUNG', etc.
  note TEXT,
  status VARCHAR(50) DEFAULT 'PLANNED', -- 'PLANNED', 'CONFIRMED', 'CANCELLED'
  created_by_user_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_status (status)
);

CREATE TABLE dispatch_assignments (
  id VARCHAR(50) PRIMARY KEY,
  dispatch_item_id VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'WORKER', 'VEHICLE', 'DEVICE'
  resource_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  UNIQUE KEY unique_assignment (dispatch_item_id, resource_type, resource_id, date),
  FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id) ON DELETE CASCADE,
  INDEX idx_dispatch_item (dispatch_item_id),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_date (date)
);
```

#### B) Backend API
**Dateien:**
- `backend/api/dispatch_items.php`
  - GET (list with filters), POST, PUT, DELETE
- `backend/api/dispatch_assignments.php`
  - GET (by dispatch_item_id), POST (batch upsert), DELETE

**Routing:** `backend/api/index.php` erweitern

#### C) Frontend State
**State erweitern:**
```javascript
data: {
  dispatchItems: DispatchItem[],
  dispatchAssignments: DispatchAssignment[]
}
```

**Actions:**
- `setDispatchItems(items)`
- `upsertDispatchItem(item)`
- `removeDispatchItem(id)`
- `setDispatchAssignments(assignments)`
- `upsertDispatchAssignments(assignments)` // Batch
- `removeDispatchAssignment(id)`

**Selectors:**
- `getDispatchItems(dateFrom, dateTo)`
- `getDispatchItem(id)`
- `getDispatchAssignments(dispatchItemId)`
- `getAssignmentsForDate(date, resourceType)`

**Service:** `app/services/dispatchService.js`
- `loadDispatchItems(params)`
- `createDispatchItem(data)`
- `updateDispatchItem(id, data)`
- `deleteDispatchItem(id)`
- `loadDispatchAssignments(dispatchItemId)`
- `upsertDispatchAssignments(dispatchItemId, assignments)` // Batch

**API Endpoints:** `app/api/endpoints.js`
- `api.getDispatchItems(params)`
- `api.createDispatchItem(data)`
- `api.updateDispatchItem(id, data)`
- `api.deleteDispatchItem(id)`
- `api.getDispatchAssignments(dispatchItemId)`
- `api.upsertDispatchAssignments(dispatchItemId, assignments)`

#### D) Normalisierung
**Pattern:** `snake_case` → `camelCase`
- `dispatch_item_id` → `dispatchItemId`
- `resource_type` → `resourceType`
- `resource_id` → `resourceId`
- `created_by_user_id` → `createdByUserId`

### Done-Kriterien
- ✅ Dispatch Item erstellen über API
- ✅ Im Frontend laden und im State sichtbar
- ✅ Assignments Batch Upsert funktioniert
- ✅ Normalisierung korrekt

---

## Phase 7: Week View: Einsatzkarten statt Blöcke

### Ziel
Woche zeigt Dispatch Cards statt Planning Blocks.

### Aufgaben

#### A) Neue View erstellen
**Option A:** `app/views/planning/weekViewDispatch.js` (neu)
**Option B:** `app/views/planning/weekView.js` ersetzen

**Struktur:**
- Pro Tag: Liste Dispatch Cards
- Card Content:
  - Projekt/Ort (Location Code + Address)
  - Zeit/Ganztägig
  - Status Badge (PLANNED/CONFIRMED)
  - Sections: Personal/Fahrzeuge/Geräte (leer wenn none)
- Button: "+ Einsatz" pro Tag (nur Admin)

#### B) Card-Komponente
**Datei:** `app/views/planning/dispatchCard.js` (optional)

**Rendering:**
```javascript
function renderDispatchCard(item, assignments) {
  const workers = assignments.filter(a => a.resourceType === 'WORKER');
  const vehicles = assignments.filter(a => a.resourceType === 'VEHICLE');
  const devices = assignments.filter(a => a.resourceType === 'DEVICE');
  
  return `
    <div class="dispatch-card" data-dispatch-item-id="${item.id}">
      <div class="dispatch-card__header">
        <div class="dispatch-card__location">${locationCode}</div>
        <div class="dispatch-card__time">${timeDisplay}</div>
        <div class="badge badge--${status}">${status}</div>
      </div>
      <div class="dispatch-card__body">
        <div class="dispatch-card__section">
          <strong>Personal:</strong>
          ${workers.map(w => renderResourcePill(w)).join('')}
        </div>
        <div class="dispatch-card__section">
          <strong>Fahrzeuge:</strong>
          ${vehicles.map(v => renderResourcePill(v)).join('')}
        </div>
        <div class="dispatch-card__section">
          <strong>Geräte:</strong>
          ${devices.map(d => renderResourcePill(d)).join('')}
        </div>
      </div>
    </div>
  `;
}
```

#### C) Planning Shell Integration
**Datei:** `app/views/planning/planningShell.js`
- Switch zwischen `weekView` (alt) und `weekViewDispatch` (neu)
- Oder direkt `weekViewDispatch` verwenden

### Done-Kriterien
- ✅ Admin: Einsatz erstellen → Karte erscheint
- ✅ Cards zeigen Assignments korrekt
- ✅ Reload bleibt
- ✅ UI nutzt Design System

---

## Phase 8: Drag & Drop Assignments

### Ziel
Ressourcen zuweisen per Drag&Drop.

### Aufgaben

#### A) Resource Sidebar
**Datei:** `app/views/planning/resourceSidebar.js` (neu)

**Struktur:**
- Tabs: Personal / Fahrzeuge / Geräte
- Liste: Draggable Pills
- Filter/Search

**Draggable:**
```javascript
<div 
  class="resource-pill" 
  draggable="true"
  data-resource-type="WORKER"
  data-resource-id="${worker.id}"
  data-resource-name="${worker.name}"
>
  ${worker.name}
</div>
```

#### B) Card Drop Zones
**Datei:** `app/views/planning/dispatchCard.js` (oder weekViewDispatch)

**Drop Zones:**
```javascript
<div 
  class="dispatch-card__section dispatch-card__section--drop-zone"
  data-dispatch-item-id="${item.id}"
  data-resource-type="WORKER"
  ondrop="handleDrop(event)"
  ondragover="handleDragOver(event)"
>
  <strong>Personal:</strong>
  ${workers.map(w => renderResourcePill(w)).join('')}
</div>
```

#### C) Drag & Drop Handler
**Datei:** `app/handlers/dragDropHandlers.js` (neu)

**Functions:**
- `handleDragStart(e)` → setzt `dataTransfer`
- `handleDragOver(e)` → `preventDefault()`
- `handleDrop(e)` → `dispatchService.upsertAssignments(batch)`

**Dedupe:**
- Prüft ob Assignment bereits existiert
- Highlight States (dragging, drop-zone active)
- Toast Feedback

#### D) Integration
**Datei:** `app/views/planning/planningShell.js`
- Resource Sidebar in Links-Spalte
- Cards in Mitte-Spalte

### Done-Kriterien
- ✅ Worker auf Einsatz ziehen → Assignment erstellt
- ✅ Kein Double-Fire
- ✅ UI aktualisiert (Card zeigt Assignment)
- ✅ Dedupe funktioniert

---

## Phase 9: Right Panel "Nicht im Einsatz"

### Ziel
Zeigt unassigned Ressourcen pro Tag.

### Aufgaben

#### A) Selectors
**Datei:** `app/state/selectors.js`

**Neue Selectors:**
```javascript
export function getUnassignedResourcesForDate(date, resourceType) {
  const state = getState();
  const allResources = resourceType === 'WORKER' 
    ? state.data.workers 
    : resourceType === 'VEHICLE'
    ? state.data.vehicles
    : state.data.devices;
  
  const assigned = state.data.dispatchAssignments
    .filter(a => a.date === date && a.resourceType === resourceType)
    .map(a => a.resourceId);
  
  return allResources.filter(r => !assigned.includes(r.id));
}
```

#### B) Right Panel View
**Datei:** `app/views/planning/unassignedPanel.js` (neu)

**Struktur:**
- Tabs: Personal / Fahrzeuge / Geräte
- Counts pro Typ
- Liste unassigned Resources
- Optional: Drag Source (für D&D)

**Rendering:**
```javascript
export function renderUnassignedPanel(date) {
  const workers = getUnassignedResourcesForDate(date, 'WORKER');
  const vehicles = getUnassignedResourcesForDate(date, 'VEHICLE');
  const devices = getUnassignedResourcesForDate(date, 'DEVICE');
  
  return `
    <div class="unassigned-panel">
      <h3>Nicht im Einsatz</h3>
      <div class="unassigned-panel__tabs">
        <button class="tab" data-resource-type="WORKER">
          Personal (${workers.length})
        </button>
        <button class="tab" data-resource-type="VEHICLE">
          Fahrzeuge (${vehicles.length})
        </button>
        <button class="tab" data-resource-type="DEVICE">
          Geräte (${devices.length})
        </button>
      </div>
      <div class="unassigned-panel__list">
        ${renderUnassignedList(workers, 'WORKER')}
      </div>
    </div>
  `;
}
```

#### C) Integration
**Datei:** `app/views/planning/planningShell.js`
- Right Panel in Rechts-Spalte
- Aktualisiert bei Assignment Changes

### Done-Kriterien
- ✅ Zeigt korrekte Liste nach Assignment Update
- ✅ Counts korrekt
- ✅ Optional: Drag Source funktioniert

---

## Phase 10: Day View: Detail + Confirm → Time Entries

### Ziel
Bestätigung erzeugt Zeiteinträge idempotent aus Dispatch.

### Aufgaben

#### A) Day View umbauen
**Datei:** `app/views/planning/dayView.js`

**Änderungen:**
- Zeigt Dispatch Cards statt Planning Blocks
- Full Details: Location, Assignments, etc.
- Confirm Button nur für Worker (eigener Tag)

#### B) Confirm Logic anpassen
**Datei:** `app/services/dispatchService.js` (oder `planningService.js`)

**Neue Funktion:**
```javascript
export async function confirmDispatchDay(date, workerId) {
  // 1. Get Dispatch Items für Tag + Worker
  const dispatchItems = getDispatchItemsForWorkerDay(date, workerId);
  
  // 2. Für jeden Dispatch Item:
  //    - Prüfe ob bereits bestätigt (idempotent)
  //    - Erstelle Time Entries aus Assignments (nur WORKER)
  //    - Setze dispatch_item.status = CONFIRMED
  //    - Setze meta.sourceDispatchItemId in Time Entries
  
  // 3. Batch Update Dispatch Items
  // 4. Batch Create Time Entries
}
```

**Idempotent Check:**
```javascript
// Prüfe ob Time Entry bereits existiert mit meta.sourceDispatchItemId
const existing = timeEntries.find(te => 
  te.entryDate === date &&
  te.workerId === workerId &&
  te.meta?.sourceDispatchItemId === dispatchItemId
);
if (existing) {
  // Skip (idempotent)
  continue;
}
```

#### C) Handler anpassen
**Datei:** `app/handlers/planningHandlers.js`
- Confirm Button Handler ruft `confirmDispatchDay()` statt `confirmDayFromPlanning()`

### Done-Kriterien
- ✅ Confirm 2x → keine Duplikate
- ✅ Time Entries haben `meta.sourceDispatchItemId`
- ✅ Dispatch Items Status → CONFIRMED
- ✅ Worker kann nur eigenen Tag bestätigen

---

## Phase 11: Notizen + TODOs

### Ziel
Persistente Notizen/TODOs in Planen & Verwalten.

### Aufgaben

#### A) Backend
**Migration:** `backend/migrations/YYYYMMDD_add_todos.sql`
```sql
CREATE TABLE todos (
  id VARCHAR(50) PRIMARY KEY,
  scope VARCHAR(50) NOT NULL, -- 'PLAN_DAY', 'PLAN_WEEK', 'ADMIN_GLOBAL'
  scope_id VARCHAR(255), -- date (YYYY-MM-DD) oder null für ADMIN_GLOBAL
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT 0,
  created_by_user_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scope (scope, scope_id)
);
```

**API:** `backend/api/todos.php`
- GET (list with scope filter), POST, PUT (toggle/update), DELETE

#### B) Frontend State
**State erweitern:**
```javascript
data: {
  todos: Todo[]
}
```

**Actions/Selectors/Service:** Standard Pattern

#### C) Modal
**Datei:** `app/views/modals/todoModal.js`
- Create/Edit Todo
- Fields: title, description, scope, scopeId

#### D) Views
**Planen Header:**
- Button "Notizen" → Modal mit Scope PLAN_DAY/PLAN_WEEK

**Verwalten Tab:**
- Tab "TODOs" → Liste mit Scope ADMIN_GLOBAL
- Filter nach Scope

### Done-Kriterien
- ✅ Add/Toggle/Delete funktioniert
- ✅ Reload persistiert
- ✅ Scopes funktionieren korrekt

---

## Phase 12: Final Polish

### Ziel
Release-fähig: schnell, robust, konsistent.

### Aufgaben

#### A) Performance
**Selectors Memoization:**
- `getUnassignedResourcesForDate()` → memoize by date+type
- `getDispatchItemsForDate()` → memoize by date range

#### B) Search
**Sidebar Search Filter:**
- Filtert Resources (Personal/Fahrzeuge/Geräte)
- Real-time während Tippen

#### C) Guards Scripts
- ✅ `scripts/check-duplicates.mjs` (bereits vorhanden)
- ✅ `scripts/check-imports.mjs` (bereits vorhanden)
- Optional: `scripts/check-rbac.mjs` → prüft Permission-Checks

#### D) Documentation
**Update:**
- `docs/REGRESSION_CHECKLIST.md` → Dispatch-spezifische Tests
- `docs/ARCHITECTURE.md` → Final State dokumentieren

### Done-Kriterien
- ✅ Performance akzeptabel (< 100ms für Selectors)
- ✅ Search funktioniert
- ✅ Guards Scripts laufen durch
- ✅ Regression Checklist vollständig

---

## Risiken & Mitigation (gesamt)

### Risiken
1. **State-Chaos:** Zu viele gleichzeitige Änderungen
   - **Mitigation:** Pro Phase nur ein Featurepfad vollständig

2. **Breaking Changes:** API-Inkompatibilität
   - **Mitigation:** Nur additive Felder, Backward Compatibility

3. **Performance:** Zu viele Re-Renders
   - **Mitigation:** Selector Memoization (Phase 12)

4. **RBAC-Lücken:** Worker kann Admin-Features nutzen
   - **Mitigation:** Frontend + Backend Checks, Smoke Tests

5. **Sidebar verschwindet:** Komplett unsichtbar
   - **Mitigation:** Immer Dock-Icons + Toggle sichtbar

### Rollback-Strategie
- Git Commits pro Phase
- Feature Flags (optional)
- Backward Compatibility in API

---

**Ende der Phasen-Roadmap**

**Status:** Dokumentation erstellt, wartet auf Go für Phase 1



