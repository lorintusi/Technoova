# Backend Planning Support: End-to-End Implementation

## Übersicht

Backend-Unterstützung für Planning Entries, Self-Planning, und Confirm->TimeEntry Flow mit allen erforderlichen Feldern.

## Implementierte Änderungen

### 1. Datenbank-Schema

**Migration: `backend/migrations/20250121_add_planning_entries_and_meta.sql`**

**Neue Tabelle: `planning_entries`**
- `id` VARCHAR(50) PRIMARY KEY
- `worker_id` VARCHAR(50) NOT NULL
- `date` DATE NOT NULL
- `start_time` TIME NULL
- `end_time` TIME NULL
- `all_day` BOOLEAN DEFAULT FALSE
- `location_id` VARCHAR(50) NULL
- `category` VARCHAR(100) NOT NULL
- `note` TEXT NULL
- `status` ENUM('PLANNED', 'CONFIRMED') DEFAULT 'PLANNED'
- `source` ENUM('ADMIN_PLAN', 'SELF_PLAN') DEFAULT 'ADMIN_PLAN'
- `created_by_user_id` VARCHAR(50) NOT NULL
- `created_by_role` ENUM('ADMIN', 'WORKER') DEFAULT 'ADMIN'
- `time_entry_id` INT NULL (Referenz zu erzeugtem TimeEntry)
- `confirmed_at` TIMESTAMP NULL
- `confirmed_by_user_id` VARCHAR(50) NULL
- `created_at`, `updated_at` TIMESTAMP

**Erweiterte Tabelle: `locations`**
- `resources_required` JSON NULL - Array von benötigten Ressourcen

**Erweiterte Tabelle: `time_entries`**
- `meta` JSON NULL - Flexible Metadaten (z.B. `{"sourcePlanningEntryId": "plan-123"}`)
- `status` ENUM (falls noch nicht vorhanden)

### 2. API-Endpunkte

#### Planning Entries CRUD (`/api/week_planning/{id}`)

**GET `/api/week_planning?worker_id=X&date_from=Y&date_to=Z`**
- Liefert Planning Entries für Worker und Datumsbereich
- Permission: Worker sieht nur eigene, Admin sieht alle
- Response: `{success: true, data: PlanningEntry[]}`

**POST `/api/week_planning`**
- Erstellt Planning Entry
- Felder: worker_id, date, start_time, end_time, all_day, location_id, category, note, status
- Automatisch: source (ADMIN_PLAN/SELF_PLAN), created_by_user_id, created_by_role
- Permission: Worker nur für sich selbst, Admin für alle

**PUT `/api/week_planning/{id}`**
- Aktualisiert Planning Entry
- Permission: Worker nur eigene, Admin alle

**DELETE `/api/week_planning/{id}`**
- Löscht Planning Entry
- Permission: Worker nur eigene (und nur wenn nicht CONFIRMED), Admin alle

#### Week Planning (Legacy) (`/api/week_planning` ohne ID)

**GET `/api/week_planning?worker_id=X&week=Y&year=Z`**
- Liefert Planning Entries (neu) oder Assignments (Fallback)
- Versucht zuerst `planning_entries`, fällt zurück auf `assignments` wenn leer

**POST `/api/week_planning`**
- Batch-Save (bleibt für Kompatibilität)

#### Locations (`/api/locations`)

**GET `/api/locations`**
- Liefert `resourcesRequired` als Array (aus JSON geparst)

**POST `/api/locations`**
- Akzeptiert `resourcesRequired` als Array
- Speichert als JSON

**PUT `/api/locations/{id}`**
- Aktualisiert `resourcesRequired`

#### Time Entries (`/api/time_entries`)

**POST `/api/time_entries`**
- Akzeptiert `meta` als Objekt oder JSON-String
- Speichert als JSON in DB

**PUT `/api/time_entries/{id}`**
- Aktualisiert `meta`

**GET `/api/time_entries`**
- Liefert `meta` als geparstes Objekt (aus JSON)

### 3. Geänderte Dateien

**Neu erstellt:**
1. `backend/migrations/20250121_add_planning_entries_and_meta.sql` - Migration
2. `backend/api/planning_entries.php` - Planning Entries CRUD Handler
3. `backend/BACKEND_PLANNING_SUPPORT.md` - Diese Datei

**Geändert:**
1. `backend/api/index.php` - Routing für week_planning/{id} → planning_entries
2. `backend/api/week_planning.php` - GET unterstützt planning_entries (mit Fallback)
3. `backend/api/locations.php` - resourcesRequired Support (GET/POST/PUT)
4. `backend/api/time_entries.php` - meta Support (GET/POST/PUT)

### 4. Felder-Mapping

**PlanningEntry → API Response:**
```php
{
  id, worker_id, date, start_time, end_time, all_day,
  location_id, category, note, status, source,
  created_by_user_id, created_by_role, time_entry_id,
  confirmed_at, confirmed_by_user_id,
  location_code, location_address, resources_required (from location)
}
```

**Location → API Response:**
```php
{
  id, code, address, description, tags, resourcesRequired (camelCase),
  schedule, crew, planFile, planFileName
}
```

**TimeEntry → API Response:**
```php
{
  id, worker_id, location_id, entry_date, category,
  time_from, time_to, hours, notes, status,
  meta (parsed JSON object), ...
}
```

## Migration ausführen

```sql
-- Migration ausführen
SOURCE backend/migrations/20250121_add_planning_entries_and_meta.sql;
```

Oder manuell:
```bash
mysql -u root -p DB_NAME < backend/migrations/20250121_add_planning_entries_and_meta.sql
```

## Testing

### 1. Location mit resourcesRequired

**Create:**
```bash
curl -X POST http://localhost/backend/api/locations \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=..." \
  -d '{
    "code": "TEST-001",
    "address": "Teststrasse 1",
    "resourcesRequired": ["LKW", "Schweissgerät"]
  }'
```

**Verify:**
```bash
curl http://localhost/backend/api/locations \
  -H "Cookie: PHPSESSID=..."
```
→ Prüfen: `resourcesRequired` ist Array `["LKW", "Schweissgerät"]`

### 2. Planning Entry erstellen (Self-Plan)

**Create:**
```bash
curl -X POST http://localhost/backend/api/week_planning \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=..." \
  -d '{
    "worker_id": "worker-123",
    "date": "2025-01-22",
    "start_time": "08:00",
    "end_time": "17:00",
    "all_day": false,
    "location_id": "loc-001",
    "category": "MONTAGE",
    "note": "Test Self-Plan"
  }'
```

**Verify:**
```bash
curl "http://localhost/backend/api/week_planning?worker_id=worker-123&date_from=2025-01-22&date_to=2025-01-22" \
  -H "Cookie: PHPSESSID=..."
```
→ Prüfen: Entry hat `source: "SELF_PLAN"`, `created_by_role: "WORKER"`

### 3. Confirm → TimeEntry mit meta

**Confirm Day:**
```bash
curl -X POST http://localhost/backend/api/time_entries/confirm_day \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=..." \
  -d '{"date": "2025-01-22"}'
```

**Verify TimeEntry:**
```bash
curl "http://localhost/backend/api/time_entries?date=2025-01-22" \
  -H "Cookie: PHPSESSID=..."
```
→ Prüfen: TimeEntry hat `meta.sourcePlanningEntryId = "plan-..."`

### 4. Reload Test

**Workflow:**
1. Create Planning Entry → Note ID
2. Confirm Day → TimeEntry erstellt
3. Reload Page → GET `/api/week_planning`
4. Prüfen: Planning Entry Status = CONFIRMED, time_entry_id gesetzt
5. GET `/api/time_entries` → Prüfen: meta.sourcePlanningEntryId vorhanden

## Manual Test Checklist

### Setup
- [ ] Migration ausgeführt
- [ ] Backend läuft
- [ ] Session-Cookie vorhanden

### Location resourcesRequired
- [ ] Create Location mit resourcesRequired → Erfolg
- [ ] GET Location → resourcesRequired als Array zurückgegeben
- [ ] Update Location resourcesRequired → Erfolg
- [ ] Reload → resourcesRequired persistiert

### Planning Entry (Self-Plan)
- [ ] Worker erstellt Planning Entry → source = "SELF_PLAN"
- [ ] GET Planning Entries → Entry mit source/created_by_role zurückgegeben
- [ ] Update Planning Entry → Erfolg
- [ ] Delete Planning Entry (PLANNED) → Erfolg
- [ ] Delete Planning Entry (CONFIRMED) → Fehler (Worker)

### Confirm → TimeEntry
- [ ] Confirm Day → TimeEntry erstellt
- [ ] TimeEntry hat meta.sourcePlanningEntryId
- [ ] Planning Entry Status = CONFIRMED
- [ ] Planning Entry time_entry_id gesetzt
- [ ] Reload → Alle Felder persistiert

### Admin vs Worker
- [ ] Admin erstellt Planning Entry → source = "ADMIN_PLAN"
- [ ] Admin sieht alle Planning Entries
- [ ] Worker sieht nur eigene Planning Entries
- [ ] Worker kann nicht für andere planen

## Wichtige Hinweise

- **Backward Compatibility:** Week Planning GET fällt zurück auf Assignments wenn keine Planning Entries vorhanden
- **JSON Handling:** resourcesRequired und meta werden als JSON gespeichert, aber als Arrays/Objekte zurückgegeben
- **Permission Checks:** Alle Endpoints haben Permission-Checks (Worker nur eigene, Admin alle)
- **Idempotenz:** Confirm kann mehrfach aufgerufen werden (Duplikat-Prüfung im Frontend)

## Troubleshooting

**Migration schlägt fehl:**
- Prüfe MySQL Version (5.7+ für JSON)
- Prüfe ob Spalten bereits existieren (Migration ist idempotent)

**Planning Entries werden nicht zurückgegeben:**
- Prüfe ob Tabelle existiert: `SHOW TABLES LIKE 'planning_entries';`
- Prüfe Daten: `SELECT * FROM planning_entries LIMIT 5;`

**meta wird nicht gespeichert:**
- Prüfe ob Spalte existiert: `SHOW COLUMNS FROM time_entries LIKE 'meta';`
- Prüfe JSON-Format: Muss valides JSON sein

**resourcesRequired wird nicht zurückgegeben:**
- Prüfe DB: `SELECT resources_required FROM locations LIMIT 1;`
- Prüfe API Response: Sollte als Array geparst sein




