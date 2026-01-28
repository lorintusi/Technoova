# Backend Planning Endpoints - Test Checklist

## Setup

1. Migration ausführen:
```bash
mysql -u root -p DB_NAME < backend/migrations/20250121_add_planning_entries_and_meta.sql
```

2. Session-Cookie holen (Login):
```bash
curl -X POST http://localhost/backend/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "010203"}' \
  -c cookies.txt
```

## Test 1: Location mit resourcesRequired

### Create Location
```bash
curl -X POST http://localhost/backend/api/locations \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "code": "TEST-001 Test Baustelle",
    "address": "Teststrasse 1, 8000 Zürich",
    "description": "Test Baustelle",
    "resourcesRequired": ["LKW", "Schweissgerät", "Kran"]
  }'
```

**Erwartet:** `{"success": true, "id": "loc-..."}`

### GET Location (Verify)
```bash
curl http://localhost/backend/api/locations \
  -b cookies.txt
```

**Prüfen:**
- Location hat `resourcesRequired: ["LKW", "Schweissgerät", "Kran"]`
- Array-Format (nicht JSON-String)

### Update Location resourcesRequired
```bash
curl -X PUT http://localhost/backend/api/locations/LOCATION_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "resourcesRequired": ["LKW", "Bagger"]
  }'
```

**Verify:** GET erneut → `resourcesRequired` aktualisiert

## Test 2: Planning Entry (Self-Plan)

### Create Planning Entry (Worker)
```bash
curl -X POST http://localhost/backend/api/week_planning \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "worker_id": "WORKER_ID",
    "date": "2025-01-22",
    "start_time": "08:00",
    "end_time": "17:00",
    "all_day": false,
    "location_id": "LOCATION_ID",
    "category": "MONTAGE",
    "note": "Selbst geplant"
  }'
```

**Erwartet:** `{"success": true, "data": {...}, "id": "plan-..."}`

**Prüfen in Response:**
- `source: "SELF_PLAN"`
- `created_by_role: "WORKER"`
- `status: "PLANNED"`

### GET Planning Entries
```bash
curl "http://localhost/backend/api/week_planning?worker_id=WORKER_ID&date_from=2025-01-22&date_to=2025-01-22" \
  -b cookies.txt
```

**Prüfen:**
- Entry wird zurückgegeben
- Alle Felder vorhanden (source, created_by_role, etc.)
- `resources_required` von Location mitgeliefert

### Update Planning Entry
```bash
curl -X PUT http://localhost/backend/api/week_planning/PLANNING_ENTRY_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "category": "SCHWEISSEN",
    "note": "Geändert"
  }'
```

**Verify:** GET erneut → Änderungen persistiert

### Delete Planning Entry
```bash
curl -X DELETE http://localhost/backend/api/week_planning/PLANNING_ENTRY_ID \
  -b cookies.txt
```

**Verify:** GET erneut → Entry gelöscht

## Test 3: Confirm → TimeEntry mit meta

### Create Planning Entry (für Confirm)
```bash
curl -X POST http://localhost/backend/api/week_planning \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "worker_id": "WORKER_ID",
    "date": "2025-01-23",
    "all_day": true,
    "location_id": "LOCATION_ID",
    "category": "MONTAGE"
  }'
```

**Note:** Planning Entry ID (z.B. `plan-abc123`)

### Confirm Day
```bash
curl -X POST http://localhost/backend/api/time_entries/confirm_day \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"date": "2025-01-23"}'
```

**Erwartet:** `{"ok": true}` oder `{"success": true}`

### GET Time Entries (Verify meta)
```bash
curl "http://localhost/backend/api/time_entries?date=2025-01-23" \
  -b cookies.txt
```

**Prüfen:**
- TimeEntry wurde erstellt
- `meta.sourcePlanningEntryId = "plan-abc123"`
- `meta` ist Objekt (nicht JSON-String)

### GET Planning Entries (Verify Status)
```bash
curl "http://localhost/backend/api/week_planning?worker_id=WORKER_ID&date_from=2025-01-23&date_to=2025-01-23" \
  -b cookies.txt
```

**Prüfen:**
- Planning Entry `status = "CONFIRMED"`
- `time_entry_id` gesetzt (ID des erzeugten TimeEntry)

## Test 4: Reload Persistence

### Workflow:
1. Create Planning Entry → Note ID
2. GET Planning Entries → Verify
3. Confirm Day → TimeEntry erstellt
4. GET Time Entries → Verify meta
5. GET Planning Entries → Verify CONFIRMED + time_entry_id
6. **Reload Page (Frontend)**
7. GET Planning Entries erneut → Alle Felder noch vorhanden
8. GET Time Entries erneut → meta noch vorhanden

## Test 5: Permission Checks

### Worker kann nicht für andere planen
```bash
# Als Worker einloggen
curl -X POST http://localhost/backend/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "worker", "password": "..."}' \
  -c worker_cookies.txt

# Versuche für anderen Worker zu planen
curl -X POST http://localhost/backend/api/week_planning \
  -H "Content-Type: application/json" \
  -b worker_cookies.txt \
  -d '{
    "worker_id": "OTHER_WORKER_ID",
    "date": "2025-01-22",
    "category": "MONTAGE"
  }'
```

**Erwartet:** `{"success": false, "error": "Permission denied: can only plan for yourself"}`

### Worker kann nicht fremde Planning Entries sehen
```bash
curl "http://localhost/backend/api/week_planning?worker_id=OTHER_WORKER_ID&date_from=2025-01-22&date_to=2025-01-22" \
  -b worker_cookies.txt
```

**Erwartet:** `{"success": false, "error": "Permission denied: can only view own planning"}`

## Test 6: Admin kann alles

### Admin erstellt Planning Entry für Worker
```bash
# Als Admin einloggen
curl -X POST http://localhost/backend/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "010203"}' \
  -c admin_cookies.txt

curl -X POST http://localhost/backend/api/week_planning \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{
    "worker_id": "WORKER_ID",
    "date": "2025-01-24",
    "category": "MONTAGE",
    "location_id": "LOCATION_ID"
  }'
```

**Prüfen:** `source: "ADMIN_PLAN"`, `created_by_role: "ADMIN"`

## Erwartete Response-Formate

### Planning Entry Response:
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

### Time Entry Response (mit meta):
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

### Location Response (mit resourcesRequired):
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




