# Viaplano-Workflow: Datenmodell & API Contract

## ✅ Entscheidung

**Nutze existierende Entities:**
- **`assignments`** → **Einsätze** (Deployment/Auftrag)
- **`dispatch_assignments`** → **Planungen pro Tag** (Allocation/Zuweisung)

---

## 📊 Datenmodell

### 1. `assignments` (Einsätze)
```json
{
  "id": 1,
  "location_id": 1,
  "title": "Geländermontage Stäfa",
  "start_date": "2026-01-27",
  "end_date": "2026-01-31",
  "notes": "2 Monteure benötigt, LKW erforderlich",
  "status": "Geplant",
  "created_at": "2026-01-23"
}
```

**Felder:**
- `id` - Eindeutige ID
- `location_id` - Referenz zu `locations` (Baustelle/Einsatzort)
- `title` - Titel des Einsatzes
- `start_date` - Startdatum (YYYY-MM-DD)
- `end_date` - Enddatum (YYYY-MM-DD)
- `notes` - Notizen/Beschreibung
- `status` - Status ("Geplant", "In Ausführung", "Abgeschlossen")
- `created_at` - Erstellungsdatum

### 2. `dispatch_assignments` (Planungen pro Tag)
```json
{
  "id": 1,
  "assignment_id": 1,
  "date": "2026-01-27",
  "worker_id": 2,
  "vehicle_ids": [1, 2],
  "device_ids": [3],
  "notes": "Früh starten (7:00 Uhr)",
  "created_at": "2026-01-23"
}
```

**Felder:**
- `id` - Eindeutige ID
- `assignment_id` - Referenz zu `assignments` (Einsatz)
- `date` - Datum (YYYY-MM-DD)
- `worker_id` - Referenz zu `workers` (Mitarbeiter)
- `vehicle_ids` - Array von IDs aus `vehicles` (Fahrzeuge)
- `device_ids` - Array von IDs aus `devices` (Geräte)
- `notes` - Notizen für diesen Tag
- `created_at` - Erstellungsdatum

---

## 🔗 API Contract

### Assignments (Einsätze)

#### GET /backend/api/assignments
```
Response: {
  success: true,
  data: [
    { id: 1, location_id: 1, title: "...", start_date: "...", end_date: "...", ... },
    ...
  ]
}
```

#### POST /backend/api/assignments
```
Request: {
  location_id: 1,
  title: "Geländermontage Stäfa",
  start_date: "2026-01-27",
  end_date: "2026-01-31",
  notes: "2 Monteure benötigt",
  status: "Geplant"
}
Response: {
  success: true,
  id: 1,
  data: { id: 1, location_id: 1, title: "...", ... }
}
```

#### PUT /backend/api/assignments/:id
```
Request: { title: "Geländermontage Stäfa (Update)", ... }
Response: { success: true, data: { id: 1, ... } }
```

#### DELETE /backend/api/assignments/:id
```
Response: { success: true, message: "Deleted" }
```

---

### Dispatch Assignments (Planungen pro Tag)

#### GET /backend/api/dispatch_assignments
```
Query Parameters:
  - assignment_id (optional): Filter nach Einsatz
  - worker_id (optional): Filter nach Mitarbeiter
  - date_from (optional): Ab Datum
  - date_to (optional): Bis Datum

Response: {
  success: true,
  data: [
    { id: 1, assignment_id: 1, date: "2026-01-27", worker_id: 2, ... },
    ...
  ]
}
```

#### POST /backend/api/dispatch_assignments
```
Request: {
  assignment_id: 1,
  date: "2026-01-27",
  worker_id: 2,
  vehicle_ids: [1],
  device_ids: [],
  notes: ""
}
Response: {
  success: true,
  id: 1,
  data: { id: 1, assignment_id: 1, date: "...", ... }
}
```

#### POST /backend/api/dispatch_assignments/bulk (Spezial: Mehrere Tage)
```
Request: {
  assignment_id: 1,
  dates: ["2026-01-27", "2026-01-28", "2026-01-29"],
  worker_id: 2,
  vehicle_ids: [1],
  device_ids: [],
  notes: "Mehrere Tage"
}
Response: {
  success: true,
  count: 3,
  data: [
    { id: 1, assignment_id: 1, date: "2026-01-27", ... },
    { id: 2, assignment_id: 1, date: "2026-01-28", ... },
    { id: 3, assignment_id: 1, date: "2026-01-29", ... }
  ]
}
```

#### PUT /backend/api/dispatch_assignments/:id
```
Request: { notes: "Update", vehicle_ids: [1, 2] }
Response: { success: true, data: { id: 1, ... } }
```

#### DELETE /backend/api/dispatch_assignments/:id
```
Response: { success: true, message: "Deleted" }
```

---

## 🔄 Beziehungen

```
locations (Baustellen)
  ↓ 1:N
assignments (Einsätze)
  ↓ 1:N
dispatch_assignments (Planungen pro Tag)
  ↓ N:1
workers (Mitarbeiter)

dispatch_assignments ← N:M → vehicles (Fahrzeuge)
dispatch_assignments ← N:M → devices (Geräte)
```

---

## 🛡️ Berechtigungen

### Admin
- ✅ CRUD auf `assignments`
- ✅ CRUD auf `dispatch_assignments`
- ✅ CRUD auf `locations`, `vehicles`, `devices`

### Worker
- ✅ GET `assignments` (alle oder eigene)
- ✅ GET `dispatch_assignments` (gefiltert auf `worker_id`)
- ❌ POST/PUT/DELETE auf `assignments`
- ❌ POST/PUT/DELETE auf `dispatch_assignments`
- ❌ POST/PUT/DELETE auf `locations`, `vehicles`, `devices`

---

## 🚀 Workflows

### Workflow 1: Einsatz erstellen
1. Admin klickt "+ Einsatz"
2. Modal öffnet sich
3. Auswahl: Baustelle (Dropdown `locations`), Titel, Start/End, Notizen
4. Speichern: POST `/backend/api/assignments`
5. Liste aktualisiert sich

### Workflow 2: Personal planen
1. Admin sieht Wochenansicht mit Einsätzen
2. Klick auf Tag-Zelle → Modal "Personal einplanen"
3. Auswahl: Einsatz (Dropdown `assignments`), Mitarbeiter (Dropdown `workers`), Datum(e)
4. Optional: Fahrzeuge, Geräte
5. Speichern: POST `/backend/api/dispatch_assignments` (ggf. bulk)
6. Kalender aktualisiert sich

### Workflow 3: Doppelbuchung prüfen
1. Vor Save: Prüfe `dispatch_assignments` für `worker_id` + `date`
2. Wenn existiert UND `assignment_id` ≠ aktuell: Warnung anzeigen
3. Erlauben oder blocken (MVP: warnen)

### Workflow 4: Worker-Ansicht
1. Worker sieht nur eigene `dispatch_assignments` (gefiltert auf `worker_id`)
2. Zeigt Einsätze, Zeiten, Baustellen
3. Keine Edit/Delete Buttons

---

## 📁 Persistenz

Alle Daten werden in JSON-Dateien gespeichert:
- `data/assignments.json`
- `data/dispatch_assignments.json`
- `data/locations.json`
- `data/workers.json`
- `data/vehicles.json`
- `data/devices.json`

Nach jeder Mutation: `saveData(resource, { items, nextId })`


