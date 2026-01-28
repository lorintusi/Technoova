# Backend Changes Summary: Planning Support

## Geänderte/Neue Dateien

### Neu erstellt (3 Dateien):
1. **`backend/migrations/20250121_add_planning_entries_and_meta.sql`**
   - Migration für planning_entries Tabelle
   - Erweitert locations um resources_required (JSON)
   - Erweitert time_entries um meta (JSON)
   - Idempotent (prüft Existenz vor CREATE/ALTER)

2. **`backend/api/planning_entries.php`**
   - CRUD Handler für Planning Entries
   - GET: Liefert Planning Entries mit Location-Details
   - POST: Erstellt Planning Entry (setzt source/created_by_role automatisch)
   - PUT: Aktualisiert Planning Entry
   - DELETE: Löscht Planning Entry (mit Permission-Checks)
   - Permission-Checks: Worker nur eigene, Admin alle

3. **`backend/TEST_PLANNING_ENDPOINTS.md`**
   - Vollständige Test-Checkliste mit curl-Befehlen
   - Erwartete Response-Formate
   - Permission-Tests

### Geändert (5 Dateien):

1. **`backend/api/index.php`**
   - Routing für `/api/week_planning/{id}` → `planning_entries.php`
   - Routing für `/api/week_planning` (ohne ID) → `week_planning.php` (Legacy)
   - Include für `planning_entries.php`

2. **`backend/api/week_planning.php`**
   - GET: Versucht zuerst `planning_entries`, fällt zurück auf `assignments` (Backward Compatibility)
   - Liefert Planning Entries mit Location-Details (resources_required)

3. **`backend/api/locations.php`**
   - GET: Liefert `resourcesRequired` als Array (aus JSON geparst)
   - POST: Akzeptiert `resourcesRequired` als Array, speichert als JSON
   - PUT: Aktualisiert `resourcesRequired`

4. **`backend/api/time_entries.php`**
   - POST: Akzeptiert `meta` als Objekt oder JSON-String, speichert als JSON
   - PUT: Aktualisiert `meta`
   - GET: Liefert `meta` als geparstes Objekt (aus JSON)
   - Response-Normalisierung: meta wird geparst

5. **`backend/BACKEND_PLANNING_SUPPORT.md`**
   - Dokumentation der Backend-Änderungen

## Hinzugefügte Felder

### locations Tabelle:
- `resources_required` JSON NULL - Array von Ressourcen (z.B. `["LKW", "Schweissgerät"]`)

### planning_entries Tabelle (NEU):
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
- `time_entry_id` INT NULL (Referenz zu TimeEntry)
- `confirmed_at` TIMESTAMP NULL
- `confirmed_by_user_id` VARCHAR(50) NULL
- `created_at`, `updated_at` TIMESTAMP

### time_entries Tabelle:
- `meta` JSON NULL - Metadaten (z.B. `{"sourcePlanningEntryId": "plan-123"}`)
- `status` ENUM (falls noch nicht vorhanden)

## API-Endpunkte

### Planning Entries CRUD:
- **GET** `/api/week_planning?worker_id=X&date_from=Y&date_to=Z` - Liefert Planning Entries
- **POST** `/api/week_planning` - Erstellt Planning Entry
- **PUT** `/api/week_planning/{id}` - Aktualisiert Planning Entry
- **DELETE** `/api/week_planning/{id}` - Löscht Planning Entry

### Locations:
- **GET** `/api/locations` - Liefert `resourcesRequired` als Array
- **POST** `/api/locations` - Akzeptiert `resourcesRequired`
- **PUT** `/api/locations/{id}` - Aktualisiert `resourcesRequired`

### Time Entries:
- **POST** `/api/time_entries` - Akzeptiert `meta`
- **PUT** `/api/time_entries/{id}` - Aktualisiert `meta`
- **GET** `/api/time_entries` - Liefert `meta` als Objekt

## Response-Formate

### Planning Entry:
```json
{
  "success": true,
  "data": {
    "id": "plan-abc123",
    "worker_id": "worker-123",
    "date": "2025-01-22",
    "start_time": "08:00:00",
    "end_time": "17:00:00",
    "all_day": false,
    "location_id": "loc-001",
    "category": "MONTAGE",
    "note": "Test",
    "status": "PLANNED",
    "source": "SELF_PLAN",
    "created_by_user_id": "user-123",
    "created_by_role": "WORKER",
    "time_entry_id": null,
    "location_code": "TEST-001",
    "location_address": "Teststrasse 1",
    "resources_required": ["LKW", "Schweissgerät"]
  }
}
```

### Location:
```json
{
  "success": true,
  "data": [{
    "id": "loc-001",
    "code": "TEST-001",
    "address": "Teststrasse 1",
    "resourcesRequired": ["LKW", "Schweissgerät"],
    "tags": [],
    "schedule": {...}
  }]
}
```

### Time Entry:
```json
{
  "success": true,
  "data": [{
    "id": 123,
    "worker_id": "worker-123",
    "entry_date": "2025-01-23",
    "category": "MONTAGE",
    "time_from": "08:00",
    "time_to": "17:00",
    "status": "CONFIRMED",
    "meta": {
      "sourcePlanningEntryId": "plan-abc123"
    }
  }]
}
```

## Migration ausführen

```bash
mysql -u root -p DB_NAME < backend/migrations/20250121_add_planning_entries_and_meta.sql
```

Oder in MySQL:
```sql
SOURCE backend/migrations/20250121_add_planning_entries_and_meta.sql;
```

## Testing

Siehe `backend/TEST_PLANNING_ENDPOINTS.md` für vollständige Test-Checkliste.

### Quick Test:
1. Migration ausführen
2. Location mit resourcesRequired erstellen → Verify GET
3. Planning Entry erstellen → Verify GET mit source/created_by_role
4. Confirm Day → Verify TimeEntry mit meta.sourcePlanningEntryId
5. Reload → Alle Felder persistiert

## Wichtige Hinweise

- **Backward Compatibility:** Week Planning GET fällt zurück auf Assignments wenn keine Planning Entries vorhanden
- **JSON Handling:** resourcesRequired und meta werden als JSON gespeichert, aber als Arrays/Objekte zurückgegeben
- **Permission Checks:** Alle Endpoints haben Permission-Checks (Worker nur eigene, Admin alle)
- **Idempotenz:** Migration ist idempotent (prüft Existenz vor CREATE/ALTER)




