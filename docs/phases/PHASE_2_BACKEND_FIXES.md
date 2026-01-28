# PHASE 2 - BACKEND UPDATE

## MIGRATION

**Datei:** `backend/migrations/20250120_add_planning_status.sql`

**Änderungen:**
1. ✅ `time_entries.status` ENUM('PLANNED', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'PLANNED'
2. ✅ `time_entries.confirmed_at` DATETIME NULL
3. ✅ `time_entries.confirmed_by` VARCHAR(50) NULL
4. ✅ `time_entries.planned_by` VARCHAR(50) NULL
5. ✅ `users.weekly_hours_target` DECIMAL(4,2) NOT NULL DEFAULT 42.50
6. ✅ Indexes: `idx_status`, `idx_user_status`, `idx_confirmed_by`, `idx_planned_by`

**Ausführung:** Migration muss manuell auf DB ausgeführt werden.

## API IMPLEMENTIERUNG

### `backend/api/time_entries.php` ✅ NEU ERSTELLT

**Endpoints:**
- ✅ `GET /api/time_entries` - Liste mit Filtern (user_id, worker_id, status, date_from, date_to)
- ✅ `POST /api/time_entries` - Erstellt Entry (Admin: PLANNED, Worker: nur eigene)
- ✅ `PUT/PATCH /api/time_entries/:id` - Update Entry
- ✅ `DELETE /api/time_entries/:id` - Löscht Entry (nur Admin)
- ✅ `POST /api/time_entries/:id/confirm` - Bestätigt Entry (nur eigene)
- ✅ `POST /api/time_entries/:id/reject` - Lehnt Entry ab (nur eigene)

**AuthZ:**
- ✅ Admin kann alle Einträge lesen/planen/ändern
- ✅ Worker kann nur eigene Einträge lesen/confirm/reject
- ✅ Worker kann keine Einträge für andere planen

### `backend/api/admin_overview.php` ✅ NEU ERSTELLT

**Endpoint:**
- ✅ `GET /api/admin/overview/week?date_from=&date_to=` - Aggregierte Übersicht für alle User

**AuthZ:**
- ✅ Nur Admin kann zugreifen (403 für Non-Admin)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "...",
      "worker_id": "...",
      "name": "...",
      "initials": "ABC",
      "weekly_target": 42.5,
      "week_total": 40.0,
      "week_planned": 40.0,
      "week_confirmed": 35.0,
      "days": {
        "2025-01-20": {
          "hours": 8.0,
          "planned": 8.0,
          "confirmed": 8.0,
          "projects": ["PRJ-01", "PRJ-02"]
        }
      },
      "top_projects": ["PRJ-01", "PRJ-02"]
    }
  ],
  "date_from": "2025-01-20",
  "date_to": "2025-01-26"
}
```

### `backend/api/users.php` ✅ AKTUALISIERT

**Änderungen:**
- ✅ `GET /api/users` - Inkludiert `weekly_hours_target` in SELECT
- ✅ `GET /api/users/:id` - Inkludiert `weekly_hours_target` in SELECT
- ✅ `POST /api/users` - Setzt `weekly_hours_target` (Default 42.5)
- ✅ `PUT /api/users/:id` - Unterstützt `weekly_hours_target` Update
- ✅ Normalisierung: Default 42.5 falls nicht vorhanden

### `backend/api/index.php` ✅ AKTUALISIERT

**Routing:**
- ✅ `time_entries` → `handleTimeEntries($method, $id, $action, $currentUser)`
- ✅ `admin/overview` → `handleAdminOverview($method, $currentUser)`
- ✅ Action-Parameter für confirm/reject hinzugefügt

## FRONTEND API CLIENT ✅ AKTUALISIERT

**Datei:** `app.js` Zeile 209-239

**Hinzugefügt:**
- ✅ `api.updateTimeEntry(entryId, entryData)`
- ✅ `api.deleteTimeEntry(entryId)`
- ✅ `api.confirmTimeEntry(entryId)`
- ✅ `api.rejectTimeEntry(entryId)`
- ✅ `api.getAdminOverview(dateFrom, dateTo)`

**Änderungen:**
- ✅ `saveTimeEntryFromWizard()` setzt `status: 'PLANNED'` für Admin
- ✅ Unterstützt `uiState.selectedUserId` für Admin-Planung

