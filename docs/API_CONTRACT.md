# Technoova Planner - API Contract

Base URL: `http://localhost:8080/backend/api`

All endpoints return JSON. Success responses have `{ success: true, data: ... }` format.

---

## Authentication

### POST /auth
**Login**
```json
Request: { "action": "login", "username": "admin", "password": "010203" }
Response: { "success": true, "user": { "id": 1, "username": "admin", "role": "Admin", ... } }
```

### GET /me
**Get current user**
```json
Response: { "success": true, "user": { "id": 1, "username": "admin", ... } }
```

---

## Users

### GET /users
```json
Response: { "success": true, "data": [{ "id": 1, "username": "admin", "name": "...", "email": "...", "role": "Admin", "permissions": [...] }] }
```

### POST /users
```json
Request: { "username": "newuser", "name": "New User", "email": "user@example.com", "role": "Worker", "permissions": ["Lesen"] }
Response: { "success": true, "id": 3, "data": { ...created user } }
```

### PUT /users/{id}
```json
Request: { "name": "Updated Name", ... }
Response: { "success": true, "data": { ...updated user } }
```

### DELETE /users/{id}
```json
Response: { "success": true, "message": "Deleted" }
```

---

## Workers

### GET /workers
```json
Response: { "success": true, "data": [{ "id": 1, "name": "Worker Name", "role": "Monteur", "company": "...", "status": "Arbeitsbereit", "contact": { "phone": "...", "email": "..." } }] }
```

### POST /workers
```json
Request: { "name": "New Worker", "role": "Monteur", "company": "Company GmbH", "status": "Arbeitsbereit" }
Response: { "success": true, "id": 5, "data": { ...created worker } }
```

### PUT /workers/{id}
### DELETE /workers/{id}

---

## Teams

### GET /teams
```json
Response: { "success": true, "data": [{ "id": 1, "name": "Team Name", "type": "intern", "company": "...", "members": [1,2,3], "isActive": true }] }
```

### POST /teams
### PUT /teams/{id}
### DELETE /teams/{id}

---

## Locations

### GET /locations
```json
Response: { "success": true, "data": [{ "id": 1, "code": "25-001", "address": "...", "description": "...", "status": "In Ausführung" }] }
```

### POST /locations
### PUT /locations/{id}
### DELETE /locations/{id}

---

## Assignments

### GET /assignments?{query params}
```json
Response: { "success": true, "data": [{ "id": 1, "worker_id": 2, "location_id": 1, "date": "2026-01-23", "status": "assigned" }] }
```

### POST /assignments
### PUT /assignments/{id}
### DELETE /assignments/{id}

---

## Week Planning

### GET /week_planning?worker_id={id}&week={week}&year={year}
```json
Response: { "success": true, "data": [{ "id": 1, "worker_id": 2, "date": "2026-01-23", "location_id": 1, "status": "planned" }] }
```

### POST /week_planning
```json
Request: { "worker_id": 2, "date": "2026-01-23", "location_id": 1, "hours": 8 }
Response: { "success": true, "id": 1, "data": { ...created entry } }
```

### PUT /week_planning/{id}
### DELETE /week_planning/{id}

---

## Time Entries

### GET /time_entries?{query params}
```json
Query params: worker_id, date, date_from, date_to, summary, year, month
Response: { "success": true, "data": [{ "id": 1, "worker_id": 2, "date": "2026-01-23", "hours": 8, "status": "PENDING" }] }
```

### POST /time_entries
```json
Request: { "worker_id": 2, "date": "2026-01-23", "hours": 8.5, "location_id": 1 }
Response: { "success": true, "id": 1, "data": { ...created entry } }
```

### PUT /time_entries/{id}
### DELETE /time_entries/{id}

### POST /time_entries/confirm_day
```json
Request: { "date": "2026-01-23" }
Response: { "success": true, "message": "Day confirmed" }
```

---

## Medical Certificates

### GET /medical_certificates?{query params}
```json
Query params: worker_id, date
Response: { "success": true, "data": [{ "id": 1, "worker_id": 2, "date": "2026-01-23", "filename": "cert.pdf", "note": "..." }] }
```

### POST /medical_certificates
**Content-Type: multipart/form-data**
```
Form fields: worker_id, date, planning_entry_id (optional), file, note (optional)
Response: { "success": true, "id": 1, "data": { ...created certificate } }
```

### DELETE /medical_certificates/{id}
```json
Response: { "success": true, "message": "Deleted" }
```

### GET /medical_certificates/{id}/download
**Returns file directly (not JSON)**

---

## Vehicles

### GET /vehicles?{query params}
```json
Response: { "success": true, "data": [{ "id": 1, "name": "Vehicle Name", "license_plate": "ZH-12345", "type": "Van", "status": "available" }] }
```

### POST /vehicles
```json
Request: { "name": "New Vehicle", "license_plate": "ZH-67890", "type": "Truck" }
Response: { "success": true, "id": 1, "data": { ...created vehicle } }
```

### PUT /vehicles/{id}
### DELETE /vehicles/{id}

---

## Devices

### GET /devices?{query params}
```json
Response: { "success": true, "data": [{ "id": 1, "name": "Device Name", "serial_number": "SN123", "type": "Drill", "status": "available" }] }
```

### POST /devices
```json
Request: { "name": "New Device", "serial_number": "SN456", "type": "Saw" }
Response: { "success": true, "id": 1, "data": { ...created device } }
```

### PUT /devices/{id}
### DELETE /devices/{id}

---

## Dispatch Items

### GET /dispatch_items?{query params}
```json
Query params: date, worker_id, location_id
Response: { "success": true, "data": [{ "id": 1, "date": "2026-01-23", "location_id": 1, "status": "dispatched", "items": [...] }] }
```

### POST /dispatch_items
```json
Request: { "date": "2026-01-23", "location_id": 1, "description": "..." }
Response: { "success": true, "id": 1, "data": { ...created item } }
```

### PUT /dispatch_items/{id}
### DELETE /dispatch_items/{id}

### POST /dispatch_items/confirm_day
```json
Request: { "date": "2026-01-23", "worker_id": 2 }
Response: { "success": true, "message": "Dispatch day confirmed" }
```

---

## Dispatch Assignments

### GET /dispatch_assignments?dispatch_item_id={id}
```json
Response: { "success": true, "data": [{ "id": 1, "dispatch_item_id": 1, "worker_id": 2, "vehicle_id": 1, "device_ids": [1,2] }] }
```

### POST /dispatch_assignments
**Upsert multiple assignments**
```json
Request: { "dispatch_item_id": 1, "assignments": [{ "worker_id": 2, "vehicle_id": 1 }, ...] }
Response: { "success": true, "data": [...updated assignments] }
```

### DELETE /dispatch_assignments/{id}

---

## Todos

### GET /todos?{query params}
```json
Query params: worker_id, status, date
Response: { "success": true, "data": [{ "id": 1, "title": "Task title", "description": "...", "status": "pending", "assigned_to": 2, "due_date": "2026-01-25" }] }
```

### POST /todos
```json
Request: { "title": "New Task", "description": "Task details", "assigned_to": 2, "due_date": "2026-01-25" }
Response: { "success": true, "id": 1, "data": { ...created todo } }
```

### PUT /todos/{id}
### DELETE /todos/{id}

---

## Admin

### GET /admin/overview/week?{query params}
```json
Query params: week, year, worker_id (optional)
Response: { "success": true, "data": { "week": 4, "year": 2026, "entries": [...], "summary": {...} } }
```

---

## Test Endpoint

### GET /test
```json
Response: { "success": true, "message": "Technoova API is running (Node.js)", "mode": "NODE_API", "timestamp": "..." }
```

