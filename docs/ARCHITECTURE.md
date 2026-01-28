# Technova Dispo Planner – Architektur-Dokumentation

**Stand:** Nach Phase 12 (Final Polish) - Release-fähig  
**Zweck:** Vollständige Architektur-Dokumentation des Dispatch-/Ressourcenplaners

---

## 1. Aktuelle Architektur-Übersicht

### 1.1 Tech Stack
- **Frontend:** Vanilla JavaScript, Browser-ESM (kein Build Tool)
- **Backend:** PHP 8+ mit MySQL
- **State Management:** Zentraler Store (`app/state/store.js`)
- **Event Handling:** Event Delegation (`app/handlers/events.js`)
- **API:** RESTful JSON API (`backend/api/`)

### 1.2 Projektstruktur

```
app/
  state/
    index.js          ← Barrel Export (Public API)
    store.js          ← State Store (intern)
    actions.js        ← State Mutations (intern)
    selectors.js      ← State Accessors (intern)
  views/
    planning/         ← Kalender-Views (Week/Day/Month/Year)
    management/       ← Verwaltung (Users/Locations/Certificates)
    modals/           ← Modals (Planning/User/etc.)
    auth/             ← Login
  handlers/           ← Event Handler (Delegation)
  services/           ← Business Logic (API Calls)
  api/                ← API Client (endpoints.js, client.js)
  utils/              ← Utilities (permissions, format, etc.)
  bootstrap.js        ← App Initialization

backend/
  api/                ← REST Endpoints
  migrations/         ← SQL Migrations
  config.php          ← DB Config
  auth.php            ← Authentication
```

### 1.3 State-Struktur (aktuell)

```javascript
{
  ui: {
    isAuthenticated: boolean,
    activeView: 'calendar' | 'manage',
    activeMode: 'plan' | 'manage',
    calendarViewMode: 'year' | 'month' | 'week' | 'day',
    selectedDay: Date,
    activeDate: 'YYYY-MM-DD',
    managementTab: 'users' | 'locations' | 'medical',
    showTeamCalendar: boolean
  },
  data: {
    currentUser: User,
    users: User[],
    workers: Worker[],
    teams: Team[],
    locations: Location[],
    planning: {
      entries: PlanningEntry[],  // Legacy - wird durch dispatchItems ersetzt
      selectedWorkerId: string,
      selectedDate: 'YYYY-MM-DD'
    },
    timeEntries: TimeEntry[],
    medicalCertificates: MedicalCertificate[],
    assignments: Assignment[],  // Legacy
    vehicles: Vehicle[],  // Phase 6
    devices: Device[],  // Phase 6
    dispatchItems: DispatchItem[],  // Phase 7-10: Primäres Planungsmodell
    dispatchAssignments: DispatchAssignment[],  // Phase 7-10: Ressourcen-Zuweisungen
    todos: Todo[]  // Phase 11: Notizen/TODOs
  }
}
```

### 1.4 Datenmodelle (aktuell)

#### User
```javascript
{
  id: string,
  name: string,
  username: string,
  role: 'Admin' | 'Worker',
  workerId: string | null,
  permissions: string[]  // ['Verwalten', 'Schreiben', 'view_all', etc.]
}
```

#### Worker
```javascript
{
  id: string,
  name: string,
  status: 'Arbeitsbereit' | 'Nicht verfügbar',
  role: string,
  contact: { phone, email },
  availability: Array<{site, days, hours}>
}
```

#### PlanningEntry
```javascript
{
  id: string,
  workerId: string,
  date: 'YYYY-MM-DD',
  startTime: 'HH:MM' | null,
  endTime: 'HH:MM' | null,
  allDay: boolean,
  category: 'PROJEKT' | 'SCHULUNG' | 'BUERO' | 'TRAINING' | 'KRANK' | 'MEETING',
  locationId: string | null,
  note: string,
  status: 'PLANNED' | 'CONFIRMED',
  source: 'ADMIN_PLAN' | 'SELF_PLAN',
  createdByUserId: string,
  createdByRole: 'ADMIN' | 'WORKER',
  medicalCertificateId: string | null
}
```

#### Location (Baustelle)
```javascript
{
  id: string,
  code: string,
  address: string,
  description: string,
  resourcesRequired: string[]  // ['Kran', 'Bagger', etc.]
}
```

#### MedicalCertificate
```javascript
{
  id: string,
  workerId: string,
  planningEntryId: string | null,
  date: 'YYYY-MM-DD',
  filenameOriginal: string,
  filenameStored: string,
  mimeType: string,
  sizeBytes: number,
  storagePath: string,
  uploadedByUserId: string,
  uploadedAt: timestamp
}
```

---

## 2. RBAC-System (aktuell)

### 2.1 Rollen
- **Admin:** Vollzugriff auf alle Features
- **Worker:** Eingeschränkter Zugriff (nur eigene Daten)

### 2.2 Permission-Checks (Frontend)

**Datei:** `app/utils/permissions.js`

**Aktuelle Funktionen:**
- `isAdminOrManager(user)` → prüft `role === 'Admin'` oder `permissions.includes('Verwalten')`
- `canPlanForWorker(user, workerId)` → Worker kann nur für sich selbst planen
- `canEditPlanningEntry(user, entry)` → Worker kann nur eigene Einträge bearbeiten
- `canDeletePlanningEntry(user, entry)` → Worker kann nur eigene, unbestätigte Einträge löschen
- `canViewMedicalCertificates(user)` → Admin sieht alle, Worker nur eigene
- `canDownloadMedicalCertificate(user, certificate)` → Permission-Check
- `canDeleteMedicalCertificate(user, certificate)` → Permission-Check

### 2.3 Permission-Checks (Backend)

**Pattern:** `hasPermission($currentUser, 'Verwalten')` oder `$currentUser['role'] === 'Admin'`

**Endpoints mit Checks:**
- `planning_entries.php`: Worker kann nur eigene Einträge sehen/bearbeiten
- `medical_certificates.php`: Worker kann nur eigene Certificates sehen/downloaden/löschen
- `time_entries.php`: Worker kann nur eigene Einträge sehen
- `users.php`: Nur Admin
- `locations.php`: Nur Admin

---

## 3. Event-Handling-System

### 3.1 Event Delegation
**Datei:** `app/handlers/events.js`

**Pattern:**
```javascript
import { on } from './handlers/events.js';

// Einmalig binden (in bindGlobalHandlers oder bindXxxHandlers)
on('click', '[data-action="delete-entry"]', (e) => {
  const entryId = e.target.closest('[data-action="delete-entry"]')?.getAttribute('data-entry-id');
  // Handler logic
});
```

**Wichtig:**
- Keine mehrfachen Bindings
- Keine `addEventListener` direkt auf Elementen
- Handler via `closest(selector)` für dynamische Elemente

### 3.2 Handler-Struktur
- `app/handlers/planningHandlers.js` → Kalender-Navigation, Confirm Day
- `app/handlers/planningEntryHandlers.js` → CRUD Planning Entries
- `app/handlers/managementHandlers.js` → Users/Locations CRUD
- `app/handlers/medicalCertificatesHandlers.js` → Certificates CRUD
- `app/handlers/locationHandlers.js` → Location-spezifische Handler

---

## 4. API-Struktur

### 4.1 Frontend API Client
**Datei:** `app/api/endpoints.js`

**Struktur:**
```javascript
export const api = {
  // Auth
  getCurrentUser(),
  login(username, password),
  
  // Planning
  getPlanningEntries(params),
  createPlanningEntry(data),
  updatePlanningEntry(id, data),
  deletePlanningEntry(id),
  
  // Locations
  getLocations(),
  createLocation(data),
  updateLocation(id, data),
  deleteLocation(id),
  
  // Medical Certificates
  getMedicalCertificates(filters),
  uploadMedicalCertificate(data),
  getMedicalCertificateDownloadUrl(id),
  deleteMedicalCertificate(id),
  
  // Time Entries
  getTimeEntries(params),
  createTimeEntry(data),
  // ...
};
```

### 4.2 Backend API Endpoints
**Pattern:** `backend/api/{resource}.php`

**Routing:** `backend/api/index.php` → dispatcht zu entsprechenden Handlern

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "error": "..." (bei Fehler)
}
```

**Error Codes:**
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (z.B. Overlap)
- 500: Server Error

---

## 5. Design System (aktuell)

### 5.1 CSS-Variablen
**Datei:** `styles.css`

```css
:root {
  --primary: #6a4df7;
  --bg-body: #faf8ff;
  --bg-panel: #ffffff;
  --text-main: #1a1538;
  --text-muted: #6b7280;
  --border-light: #ede9ff;
  --shadow-sm: 0 4px 16px rgba(106, 77, 247, 0.12);
  /* ... */
}
```

### 5.2 Komponenten-Klassen (teilweise vorhanden)
- `.btn`, `.btn--primary`, `.btn--secondary`
- `.modal`, `.modal-overlay`
- `.badge`
- `.input`, `.select`
- `.card`, `.panel`
- `.table`

**TODO (Phase 2):** Vollständiges Design System mit allen Komponenten

---

## 6. Daten-Normalisierung

### 6.1 Pattern
**Backend → Frontend:**
- `snake_case` → `camelCase`
- Arrays deduped by `id`
- Null-Werte konsistent behandelt

**Beispiel:**
```javascript
// Backend Response
{
  worker_id: "w1",
  created_at: "2025-01-22T10:00:00Z",
  resources_required: ["Kran", "Bagger"]
}

// Frontend State (normalisiert)
{
  workerId: "w1",
  createdAt: "2025-01-22T10:00:00Z",
  resourcesRequired: ["Kran", "Bagger"]
}
```

### 6.2 Normalisierung in Services
**Pattern:** `app/services/planningService.js`, `app/services/locationService.js`

```javascript
const normalized = {
  id: entry.id,
  workerId: entry.worker_id || entry.workerId,
  date: entry.date || entry.entry_date,
  startTime: entry.start_time || entry.startTime || null,
  // ...
};
```

---

## 7. Wichtige Features (aktuell)

### 7.1 Planung
- **Week View:** Zeigt Planungsblöcke für eine Woche
- **Day View:** Zeigt Planungsblöcke für einen Tag + Confirm Button
- **Team Calendar:** Übersicht aller Worker
- **Planning Modal:** Create/Edit Planning Entry
- **Overlap Validation:** Verhindert Überschneidungen (Frontend + Backend)

### 7.2 Verwaltung
- **Users:** CRUD für Benutzer
- **Locations:** CRUD für Baustellen
- **Medical Certificates:** Upload/Download/Delete für Arztzeugnisse

### 7.3 Bestätigung
- **Confirm Day:** Worker bestätigt geplante Tage → erzeugt Time Entries
- **Idempotent:** Mehrfaches Bestätigen erzeugt keine Duplikate
- **Meta Fields:** `meta.sourcePlanningEntryId` in Time Entries

---

## 8. Geplante Umstrukturierung (Phasen 1-12)

### Phase 1: RBAC vereinfachen
**Ziel:** Sauberes ADMIN/WORKER Modell mit zentralen Guards

**Änderungen:**
- `app/utils/permissions.js` konsolidieren
- UI Guards (Teamkalender nur Admin, etc.)
- Backend Permission Checks sicherstellen

### Phase 2: Design System
**Ziel:** Einheitliche CSS-Komponenten

**Änderungen:**
- CSS-Variablen erweitern
- Komponenten-Klassen vollständig definieren
- Views schrittweise migrieren

### Phase 3: 3-Spalten-Layout
**Ziel:** Dispo-Layout (Sidebar/Kalender/Right Panel)

**Änderungen:**
- `planningShell.js` umbauen
- Grid-Layout implementieren
- Responsive Verhalten

### Phase 4-5: Ressourcen
**Ziel:** Fahrzeuge & Geräte modellieren + CRUD

**Änderungen:**
- State: `vehicles[]`, `devices[]`
- Backend API + Migrations
- Management Views

### Phase 6: Dispatch System
**Ziel:** Dispatch Items als Primärmodell

**Änderungen:**
- Backend: `dispatch_items`, `dispatch_assignments`
- Frontend: `dispatchService.js`
- State: `dispatchItems`, `dispatchAssignments`

### Phase 7-9: Week View + Drag & Drop
**Ziel:** Einsatzkarten statt Blöcke, D&D für Assignments

**Änderungen:**
- `weekViewDispatch.js` (oder Replace)
- Drag & Drop Implementierung
- Right Panel "Nicht im Einsatz"

### Phase 10: Day View + Confirm
**Ziel:** Bestätigung erzeugt Time Entries aus Dispatch

**Änderungen:**
- Day View zeigt Dispatch Cards
- Confirm-Logik anpassen
- `meta.sourceDispatchItemId` statt `sourcePlanningEntryId`

### Phase 11: Notizen + TODOs
**Ziel:** Persistente Notizen/TODOs

**Änderungen:**
- Backend: `todos` Table
- Modal + Views
- Scopes: PLAN_DAY, PLAN_WEEK, ADMIN_GLOBAL

### Phase 12: Final Polish
**Ziel:** Performance, Search, Guards, Docs

**Änderungen:**
### Phase 12: Final Polish ✅
**Ziel:** Performance-Optimierung und Release-Vorbereitung
**Status:** ✅ Abgeschlossen

**Performance-Optimierungen:**
- Selector Memoization: `getDispatchItems()`, `getUnassignedResourcesForDate()`, `getDispatchItemsForWorkerDay()`
- Cache-Invalidierung basierend auf State-Hash
- Search-Filter: Real-time Filtering in Resource Sidebar

**Guards Scripts:**
- `scripts/check-rbac.mjs`: Prüft Permission-Checks in kritischen Endpoints
- `scripts/check-duplicates.mjs`: Prüft auf doppelte Exports
- `scripts/check-imports.mjs`: Prüft Import-Struktur

**Documentation:**
- `docs/REGRESSION_CHECKLIST.md`: Erweitert um Dispatch/Todos Tests
- `docs/ARCHITECTURE.md`: Final State dokumentiert
- Sidebar Search
- Guards Scripts
- Regression Checklist Update

---

## 9. Kritische Pfade (müssen immer funktionieren)

### 9.1 Boot
- `app/bootstrap.js` → `loadAllData()` → `renderApp()`
- Keine Console Errors
- Login funktioniert

### 9.2 Planen
- Kalender lädt
- Planning Entry erstellen/bearbeiten/löschen
- Confirm Day funktioniert

### 9.3 Verwalten
- Tabs wechseln
- CRUD Operations
- Medical Certificates Upload/Download

### 9.4 RBAC
- Admin sieht alle Features
- Worker sieht nur eigene Daten
- Permission Checks funktionieren (Frontend + Backend)

---

## 10. Technische Constraints

### 10.1 Keine Breaking Changes
- API bleibt kompatibel (nur additive Felder)
- State-Struktur erweitert, nicht umgebaut
- Keine großen Refactors während Phasen

### 10.2 Sidebar Sichtbarkeit
**WICHTIG:** Sidebar darf nie komplett unsichtbar sein!
- Wenn collapsed: Dock-Icons bleiben sichtbar
- Toggle-Button immer verfügbar
- Mindestens eine Möglichkeit, Ressourcentyp zu wechseln

### 10.3 Dispatch Confirm Rule
- Time Entries entstehen nur aus Dispatch Assignments (Typ: WORKER)
- Bestätigung setzt `dispatch_item.status = CONFIRMED`
- `meta.sourceDispatchItemId` in Time Entries
- Idempotent: Mehrfaches Bestätigen = no-op

---

## 11. Testing-Strategie

### 11.1 Smoke Tests pro Phase
- Boot ohne Errors
- Kernflow des Features
- Reload Persistence
- RBAC Checks (Admin vs Worker)

### 11.2 Regression Tests
**Datei:** `docs/REGRESSION_CHECKLIST.md`

**12-Step Quick Test:**
1. Boot & Login
2. Locations CRUD
3. Planning Projekt
4. Self-Planning
5. Confirm Day (Idempotent)
6. KRANK Upload
7. Certificate Replace
8. Certificate Download
9. Certificate Delete
10. Unconfirmed Overview
11. Overlap Prevention
12. Team Calendar

### 11.3 Guards Scripts
- `scripts/check-duplicates.mjs` → Prüft doppelte Exports
- `scripts/check-imports.mjs` → Prüft State-Imports

---

## 12. Risiken & Mitigation

### 12.1 Risiken
1. **State-Chaos:** Zu viele gleichzeitige Änderungen
   - **Mitigation:** Pro Phase nur ein Featurepfad vollständig

2. **Event-Duplikate:** Mehrfaches Binding
   - **Mitigation:** Nur Event Delegation, Guards Scripts

3. **Breaking Changes:** API-Inkompatibilität
   - **Mitigation:** Nur additive Felder, Backward Compatibility

4. **Performance:** Zu viele Re-Renders
   - **Mitigation:** Selector Memoization (Phase 12)

5. **RBAC-Lücken:** Worker kann Admin-Features nutzen
   - **Mitigation:** Frontend + Backend Checks, Smoke Tests

### 12.2 Rollback-Strategie
- Git Commits pro Phase
- Feature Flags (optional)
- Backward Compatibility in API

---

## 13. Definition "Done" pro Phase

Eine Phase gilt nur als fertig, wenn:

✅ **Keine Console Errors**  
✅ **Kein doppeltes Event-Firing**  
✅ **UI passt ins Technova Design**  
✅ **API + State + View + Handler bilden geschlossenen Kreis**  
✅ **Smoke Tests bestehen**  
✅ **RBAC Checks funktionieren**  

---

## 14. Output-Template pro Phase

Nach jeder Phase liefert Cursor:

### Was wurde umgesetzt (Kurz)
- 2-3 Sätze Beschreibung

### Dateien
**Neu:**
- `path/to/file.js` - Beschreibung

**Geändert:**
- `path/to/file.js` - Was geändert wurde

### Smoke Tests
- ✅ Boot: App startet ohne Errors
- ✅ Feature: Kernflow funktioniert
- ✅ RBAC: Admin/Worker Checks passen
- ✅ Reload: Daten persistieren

### Risiken / Next Steps
- Max 5 Bullet Points

---

**Ende der Architektur-Dokumentation**

**Nächster Schritt:** Phase 1 (RBAC-Vereinfachung) starten, wenn Go gegeben wird.

