# Multi-Dispatch Architecture - Technova Dispo Planner

**Datum:** Januar 2025  
**Status:** ✅ Implementiert

---

## 🎯 Zentrale Fachliche Regel

**Mehrere Einsätze pro Tag pro Mitarbeiter sind STANDARD**

Ein Mitarbeiter kann an einem Tag mehrere Einsätze haben, z. B.:
- 07:00–11:30 → Projekt 01 (Baustelle A)
- 12:30–15:00 → Projekt 02 (Baustelle B)
- 15:30–17:00 → Büro / Meeting / Training

👉 Das ist kein Sonderfall, sondern der Normalfall.

---

## 🧩 Kernmodell

### DispatchItem (Einsatz)
Ein zeitlich definierter Einsatz, unabhängig vom Mitarbeiter

**dispatch_items:**
- `id`
- `date`
- `start_time` (nullable)
- `end_time` (nullable)
- `all_day` (boolean)
- `category`: PROJECT | OFFICE | TRAINING | MEETING | SICK
- `location_id` (nullable)
- `title` (fallback)
- `note`
- `status`: PLANNED | CONFIRMED
- `created_by_user_id`

### DispatchAssignment
Verknüpft Ressourcen mit einem Einsatz

**dispatch_assignments:**
- `dispatch_item_id`
- `resource_type`: WORKER | VEHICLE | DEVICE
- `resource_id`
- `UNIQUE(dispatch_item_id, resource_type, resource_id)`

👉 Ein Worker kann mehrere DispatchAssignments pro Tag haben, solange Zeiten nicht kollidieren.

---

## ✅ Implementierte Features

### 1. Overlap-Validierung
- ✅ `app/utils/dispatchValidation.js` - Neue Validierungs-Utilities
- ✅ `validateDispatchOverlap()` - Prüft Zeitüberschneidungen
- ✅ `validateDispatchAssignmentOverlap()` - Prüft Assignment-Overlaps
- ✅ Integration in Drag & Drop Handler
- ✅ Toast-Feedback bei Konflikten

### 2. Mehrere Einsätze pro Tag
- ✅ Week View zeigt mehrere Cards pro Tag
- ✅ Sortierung: Timed (nach Startzeit) → All-Day
- ✅ Worker sieht nur eigene Einsätze (RBAC)

### 3. Zeitfenster-basierte "Nicht im Einsatz"
- ✅ `getUnassignedWorkersForTimeWindow()` - Neue Selector-Funktion
- ✅ Berücksichtigt Zeitfenster, nicht nur Tag
- ✅ Worker erscheint wieder als frei nach Ende des Einsatzes

### 4. Confirm → Mehrere TimeEntries
- ✅ `confirmDispatchDay()` erzeugt mehrere TimeEntries
- ✅ Idempotent: `meta.sourceDispatchItemId` Check
- ✅ Pro DispatchItem → eine TimeEntry

---

## 📁 Neue/Geänderte Dateien

### Neu
- `app/utils/dispatchValidation.js` - Overlap-Validierung
- `docs/MULTI_DISPATCH_ARCHITECTURE.md` - Diese Dokumentation

### Geändert
- `app/handlers/assignmentDragDropHandlers.js` - Overlap-Check vor Assignment
- `app/state/selectors.js` - `getUnassignedResourcesForDate()` + `getUnassignedWorkersForTimeWindow()`
- `app/views/planning/weekViewDispatch.js` - Worker Filtering + Sortierung

---

## 🔧 API & Services

### Overlap-Validierung
```javascript
import { validateDispatchOverlap, validateDispatchAssignmentOverlap } from '../utils/dispatchValidation.js';

// Prüfe Overlap
const validation = validateDispatchOverlap(newItem, existingItems, excludeItemId);
if (!validation.ok) {
  // Zeige Fehler: validation.message
  // Konflikt: validation.conflictingItem
}
```

### Unassigned Workers (Zeitfenster)
```javascript
import { getUnassignedWorkersForTimeWindow } from '../state/selectors.js';

// Worker frei zwischen 12:00-15:00?
const freeWorkers = await getUnassignedWorkersForTimeWindow('2025-01-15', '12:00', '15:00');
```

---

## ✅ Smoke-Tests

### Multi-Dispatch Tests
- [ ] Zwei Einsätze am selben Tag planbar (07:00-11:30, 12:30-15:00)
- [ ] Overlap wird verhindert (08:00-12:00 ❌ 10:00-13:00)
- [ ] Worker sieht nur eigene Einsätze
- [ ] Confirm erzeugt mehrere TimeEntries (1 Tag → n TimeEntries)
- [ ] Kein Duplikat bei erneutem Confirm
- [ ] Teamkalender zeigt mehrere Einsätze pro Worker
- [ ] App bootet ohne Errors

### Overlap-Tests
- [ ] Drag Worker auf überlappenden Einsatz → Toast "Zeitüberschneidung"
- [ ] Edit Dispatch Item mit Overlap → Validierung blockiert
- [ ] All-Day Item überschneidet mit Timed Item → Blockiert

---

## 📝 Nächste Schritte

1. **Team Calendar View** - Mehrere Badges pro Worker/Tag
2. **Backend Overlap-Validation** - HTTP 409 bei Konflikten
3. **Visual Overlap Indicators** - Markierung in UI
4. **Time Window Selector** - Für "Nicht im Einsatz" Panel

---

**Status:** ✅ Multi-Dispatch Support implementiert, Overlap-Validierung aktiv



