# Backend API Tests - curl Commands

## Voraussetzungen
- Backend läuft auf `http://localhost/backend/api` oder entsprechend
- Session Cookie muss gesetzt sein (nach Login)
- Für Tests: Session Cookie manuell setzen oder `-b cookies.txt -c cookies.txt` verwenden

---

## 1. POST /api/time_entries/confirm_day

### Test 1: Bestätige alle PLANNED Einträge für einen Tag

```bash
curl -X POST http://localhost/backend/api/time_entries/confirm_day \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{"date": "2025-01-20"}'
```

**Erwartete Response (200 OK):**
```json
{
  "ok": true,
  "date": "2025-01-20",
  "updated_count": 3
}
```

**Erwartete Response (0 Einträge, 200 OK):**
```json
{
  "ok": true,
  "date": "2025-01-20",
  "updated_count": 0
}
```

**Fehler: Ungültiges Datum (400):**
```bash
curl -X POST http://localhost/backend/api/time_entries/confirm_day \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"date": "invalid"}'
```

**Erwartete Response (400):**
```json
{
  "ok": false,
  "error": "Invalid date format. Expected YYYY-MM-DD"
}
```

---

## 2. Overlap Validation Tests

### Test 2.1: Create Entry 08:00-10:00 (OK)

```bash
curl -X POST http://localhost/backend/api/time_entries \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "entry_date": "2025-01-20",
    "time_from": "08:00",
    "time_to": "10:00",
    "category": "BUERO_ALLGEMEIN"
  }'
```

**Erwartete Response (201 Created):**
```json
{
  "success": true,
  "id": "time-entry-..."
}
```

### Test 2.2: Create Entry 09:00-11:00 (OVERLAP - 409 Conflict)

```bash
curl -X POST http://localhost/backend/api/time_entries \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "entry_date": "2025-01-20",
    "time_from": "09:00",
    "time_to": "11:00",
    "category": "BUERO_ALLGEMEIN"
  }'
```

**Erwartete Response (409 Conflict):**
```json
{
  "ok": false,
  "error": "OVERLAP",
  "message": "Zeit überschneidet sich für diesen Mitarbeiter"
}
```

### Test 2.3: Create Entry 09:00-11:00 für anderen User (OK - kein Overlap)

**Als Admin:**
```bash
curl -X POST http://localhost/backend/api/time_entries \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "entry_date": "2025-01-20",
    "time_from": "09:00",
    "time_to": "11:00",
    "user_id": "OTHER_USER_ID",
    "category": "BUERO_ALLGEMEIN"
  }'
```

**Erwartete Response (201 Created):**
```json
{
  "success": true,
  "id": "time-entry-..."
}
```

### Test 2.4: Update Entry mit Overlap (409 Conflict)

```bash
curl -X PUT http://localhost/backend/api/time_entries/ENTRY_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "time_from": "09:00",
    "time_to": "11:00"
  }'
```

**Erwartete Response (409 Conflict):**
```json
{
  "ok": false,
  "error": "OVERLAP",
  "message": "Zeit überschneidet sich für diesen Mitarbeiter"
}
```

---

## 3. GET /api/admin/overview/week

### Test 3.1: Als Admin (200 OK)

```bash
curl -X GET "http://localhost/backend/api/admin/overview/week?date_from=2025-01-20&date_to=2025-01-26" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Erwartete Response (200 OK):**
```json
{
  "ok": true,
  "success": true,
  "date_from": "2025-01-20",
  "date_to": "2025-01-26",
  "users": [
    {
      "id": "user1",
      "name": "Max Mustermann",
      "initials": "MM",
      "weekly_hours_target": 42.5
    }
  ],
  "entries": [
    {
      "id": 1,
      "user_id": "user1",
      "date": "2025-01-20",
      "time_from": "08:00",
      "time_to": "10:00",
      "project_id": "loc1",
      "project_code": "PRJ001",
      "project_name": "Projekt Adresse",
      "category": "BUERO_ALLGEMEIN",
      "status": "PLANNED"
    }
  ],
  "data": [...]
}
```

### Test 3.2: Als Non-Admin (403 Forbidden)

```bash
curl -X GET "http://localhost/backend/api/admin/overview/week?date_from=2025-01-20&date_to=2025-01-26" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Erwartete Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "Permission denied: Admin only"
}
```

### Test 3.3: Ohne date_from/date_to (Default: aktuelle Woche)

```bash
curl -X GET "http://localhost/backend/api/admin/overview/week" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Erwartete Response (200 OK):**
- `date_from` und `date_to` werden automatisch auf aktuelle Woche (Mo-So) gesetzt

---

## Session Cookie Setup (für Tests)

### Login zuerst:

```bash
curl -X POST http://localhost/backend/api/auth \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "action": "login",
    "username": "admin",
    "password": "password"
  }'
```

**Erwartete Response:**
```json
{
  "success": true,
  "user": {
    "id": "admin_id",
    "username": "admin",
    "role": "Admin",
    ...
  }
}
```

Danach werden alle weiteren Requests mit `-b cookies.txt` ausgeführt.

---

## Zusammenfassung

### Endpoints implementiert:

1. ✅ **POST /api/time_entries/confirm_day**
   - Bestätigt alle PLANNED Einträge für eingeloggten User an einem Tag
   - Returns: `{ok: true, date, updated_count}`

2. ✅ **Overlap Validation (POST/PUT /api/time_entries)**
   - Prüft nur gegen Einträge mit gleicher `user_id`/`worker_id`
   - Returns: `409 Conflict` mit `{ok: false, error: "OVERLAP", message: "..."}`

3. ✅ **GET /api/admin/overview/week**
   - Admin-only
   - Returns: `{ok: true, users: [...], entries: [...]}`

### HTTP Status Codes:
- 200: OK
- 201: Created
- 400: Bad Request (invalid date/body)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (non-admin)
- 409: Conflict (overlap)
- 500: Internal Server Error

