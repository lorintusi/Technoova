# Self-Planning Implementation: Worker kann selbst planen

## Übersicht

Erweiterung der Planning-Funktionalität: Normale Mitarbeiter (Worker) können jetzt selbst planen, aber nur für sich selbst. Admin-Flow bleibt unverändert.

## Implementierte Komponenten

### 1. Permission-System

**Neu: `app/utils/permissions.js`**
- Zentrale Permission-Funktionen:
  - `isAdminOrManager(user)` - Prüft Admin/Manager-Status
  - `canViewTeamCalendar(user)` - Kann Teamkalender sehen
  - `canPlanForWorker(user, workerId)` - Kann für Worker planen
  - `canEditPlanningEntry(user, entry)` - Kann Entry bearbeiten
  - `canDeletePlanningEntry(user, entry)` - Kann Entry löschen
  - `getPlanningSource(user)` - Gibt "ADMIN_PLAN" oder "SELF_PLAN" zurück
  - `getCreatedByRole(user)` - Gibt "ADMIN" oder "WORKER" zurück

**Regeln:**
- Admin/Manager: Kann für jeden planen, bearbeiten, löschen; sieht Teamkalender
- Worker: Kann nur für sich selbst planen, bearbeiten, löschen; sieht nur eigenen Kalender; kein Teamkalender

### 2. Planning Entry Modal

**Neu: `app/views/modals/planningEntryModal.js`**
- Shared Create/Edit UI für Planning Entries
- Felder:
  - Mitarbeiter (readonly, automatisch gesetzt)
  - Datum (nutzt activeDate als Default)
  - Ganztägig Checkbox
  - Von/Bis Zeit (wird bei Ganztägig ausgeblendet)
  - Baustelle/Projekt (Dropdown)
  - Kategorie (Dropdown, required)
  - Notiz (optional)
- Automatische Worker-Zuordnung:
  - Worker: automatisch workerId = currentUserWorkerId
  - Admin: nutzt selectedWorkerId

### 3. Planning Entry Handlers

**Neu: `app/handlers/planningEntryHandlers.js`**
- `openCreatePlanningEntryModal(date, workerId)` - Öffnet Create-Modal
- `openEditPlanningEntryModal(entryId)` - Öffnet Edit-Modal
- `deletePlanningEntryHandler(entryId)` - Löscht Entry mit Permission-Check
- `bindPlanningEntryHandlers()` - Bindet alle Event-Handler
- Verwendet Event-Delegation (keine doppelten Bindings)
- Permission-Checks vor jeder Aktion
- Toast-Notifications für Erfolg/Fehler

### 4. Service-Erweiterungen

**Geändert: `app/services/planningService.js`**
- `createPlanningEntry(entryData)` - Erweitert um:
  - `source`: "ADMIN_PLAN" | "SELF_PLAN"
  - `createdByUserId`: Aktueller User ID
  - `createdByRole`: "ADMIN" | "WORKER"
- `updatePlanningEntry(entryId, entryData)` - Update mit Permission-Check
- `deletePlanningEntry(entryId)` - Delete mit Permission-Check
- `loadPlanningEntries()` - Lädt auch source/createdByUserId/createdByRole
- `confirmDayFromPlanning()` - Nutzt Permission-Utils für Validierung

### 5. View-Anpassungen

**Geändert: `app/views/planning/weekView.js`**
- "+ Block hinzufügen" Button für Worker (nur wenn eigene Ansicht)
- Planning Blocks zeigen:
  - Source-Badge ("SELF" für Self-Planned)
  - Edit/Delete Buttons (wenn Permission vorhanden)
  - Tooltip mit Source-Info
- Permission-Checks für Edit/Delete

**Geändert: `app/views/planning/teamCalendarView.js`**
- Team Blocks zeigen Source-Label ("SELF" / "ADMIN")
- Tooltip zeigt "Selbst geplant" / "Admin geplant"

**Geändert: `app/views/planning/planningSelector.js`**
- Worker sieht "Planen für: Ich (Name)" statt Dropdown
- Admin sieht weiterhin Dropdown

**Geändert: `app/views/planning/planningShell.js`**
- Teamkalender-Button nur für Admin/Manager sichtbar (bereits implementiert)

### 6. Datenmodell-Erweiterung

**PlanningEntry Schema erweitert:**
```javascript
{
  // ... existing fields
  source: "ADMIN_PLAN" | "SELF_PLAN",
  createdByUserId: string|number,
  createdByRole: "ADMIN" | "WORKER"
}
```

**API-Payload erweitert:**
- `source`: "ADMIN_PLAN" | "SELF_PLAN"
- `created_by_user_id`: User ID
- `created_by_role`: "ADMIN" | "WORKER"

### 7. Bootstrap-Integration

**Geändert: `app/bootstrap.js`**
- Bindet `planningEntryHandlers` beim App-Start

## Workflow

### Worker Self-Plan Flow:
1. Worker loggt ein → Planen → sieht "Planen für: Ich"
2. Worker klickt "+ Block hinzufügen"
3. Modal öffnet mit:
   - Worker automatisch gesetzt (readonly)
   - Datum = activeDate (oder heute)
   - Worker kann Baustelle, Kategorie, Zeit, Notiz eingeben
4. Worker speichert → PlanningEntry erstellt mit:
   - `source = "SELF_PLAN"`
   - `createdByUserId = currentUserId`
   - `createdByRole = "WORKER"`
5. Block erscheint in Wochenansicht
6. Worker kann Block bearbeiten/löschen (nur eigene)
7. Worker bestätigt Tag → TimeEntries entstehen (idempotent)

### Admin Flow (unverändert):
1. Admin wählt Worker aus Dropdown
2. Admin erstellt Block → `source = "ADMIN_PLAN"`
3. Admin sieht alle Blocks im Teamkalender mit Source-Label

## Geänderte/Neue Dateien

### Neu erstellt (3 Dateien):
1. `app/utils/permissions.js` - Zentrale Permission-Funktionen
2. `app/views/modals/planningEntryModal.js` - Shared Create/Edit Modal
3. `app/handlers/planningEntryHandlers.js` - Planning Entry Event-Handler
4. `SELF_PLANNING_IMPLEMENTATION_SUMMARY.md` - Diese Datei

### Geändert (7 Dateien):
1. `app/services/planningService.js` - create/update/delete erweitert, source/createdByUserId/createdByRole
2. `app/views/planning/weekView.js` - "+ Block hinzufügen" Button, Edit/Delete Actions, Source-Badge
3. `app/views/planning/teamCalendarView.js` - Source-Label in Team Blocks
4. `app/views/planning/planningSelector.js` - Worker sieht "Ich" statt Dropdown
5. `app/bootstrap.js` - Bindet planningEntryHandlers
6. `app/views/modals/modalHost.js` - Lazy initialization für modal-root

## Smoke-Test Checkliste

### A) Worker Self-Plan:
- [ ] Worker loggt ein → Planen → sieht "Planen für: Ich (Name)"
- [ ] Worker sieht "+ Block hinzufügen" Button
- [ ] Worker klickt Button → Modal öffnet
- [ ] Worker erstellt Block (Projekt + Kategorie) → Block erscheint in Woche
- [ ] Worker kann Block bearbeiten (Edit-Button)
- [ ] Worker kann Block löschen (Delete-Button)
- [ ] Worker kann NICHT Teamkalender öffnen (Button nicht sichtbar)
- [ ] Worker kann NICHT für andere planen (UI + Guard)

### B) Confirm Pflicht:
- [ ] Worker bestätigt Tag → TimeEntries entstehen einmalig
- [ ] Block wird CONFIRMED
- [ ] Keine Duplikate bei erneutem Confirm (idempotent)

### C) Admin Sicht:
- [ ] Admin sieht im Teamkalender Worker-Blocks
- [ ] Admin erkennt Source: "SELF" vs "ADMIN" Label
- [ ] Admin kann Worker-Block (self) sehen
- [ ] Admin kann Worker-Block bearbeiten/löschen (Policy: Admin darf alles)

### D) Permission Guards:
- [ ] Worker versucht für anderen Worker zu planen → Toast "Sie können nur für sich selbst planen"
- [ ] Worker versucht fremden Block zu bearbeiten → Toast "Keine Berechtigung"
- [ ] Worker versucht fremden Block zu löschen → Toast "Keine Berechtigung"
- [ ] Worker versucht Teamkalender zu öffnen → Button nicht sichtbar

## Wichtige Hinweise

- **Backend-Kompatibilität:** Backend muss `source`, `created_by_user_id`, `created_by_role` unterstützen
- **Permission-Enforcement:** Guards sind sowohl UI-seitig als auch Service-seitig implementiert
- **Idempotenz:** Confirm bleibt idempotent (keine Duplikate)
- **Event-Delegation:** Alle neuen Interaktionen verwenden Event-Delegation (keine doppelten Bindings)



