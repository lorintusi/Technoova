# Planning-Implementierung: Admin->Planung->Mitarbeiter->Bestätigung->Zeiterfassung

## Übersicht

Vollständige Implementierung der durchgängigen Planungslogik mit rollenbasierter Zugriffskontrolle, persistenter Speicherung und Event-Delegation ohne doppelte Bindings.

## Implementierte Komponenten

### 1. Datenmodell (State)

**Erweitert: `app/state/store.js`**
- `planning.entries[]` - Array von PlanningEntry-Objekten
- `planning.selectedDate` - Aktives Datum für Planung
- `ui.activeDate` - Single Source of Truth für Datum (synchronisiert mit planning.selectedDate)
- `ui.showTeamCalendar` - Teamkalender-Sichtbarkeit
- `weekPlanning.planningForWorkerId` - Ausgewählter Mitarbeiter für Planung

**PlanningEntry Schema:**
```javascript
{
  id,
  workerId,
  date,           // YYYY-MM-DD
  startTime,      // "HH:MM" oder null für all-day
  endTime,        // "HH:MM" oder null für all-day
  allDay: bool,
  locationId,     // Baustelle
  category,       // string
  note,           // string optional
  status: "PLANNED" | "CONFIRMED",
  createdByUserId,
  updatedAt,
  timeEntryId     // Referenz zu erzeugtem TimeEntry (optional)
}
```

**Location Schema erweitert:**
- `resourcesRequired: string[]` - Array von benötigten Ressourcen (z.B. ["LKW", "Schweissgerät"])

### 2. State Management

**Erweitert: `app/state/actions.js`**
- `setPlanningEntries(entries)` - Setzt alle Planning Entries
- `addPlanningEntry(entry)` - Fügt Planning Entry hinzu
- `updatePlanningEntry(entry)` - Aktualisiert Planning Entry
- `removePlanningEntry(entryId)` - Entfernt Planning Entry
- `setActiveDate(date)` - Setzt aktives Datum (Single Source of Truth)
- `setPlanningForWorker(workerId)` - Setzt ausgewählten Mitarbeiter für Planung
- `setShowTeamCalendar(show)` - Zeigt/versteckt Teamkalender

**Erweitert: `app/state/selectors.js`**
- `getPlanningEntriesForDay(date, workerId)` - Planning Entries für Tag
- `getPlanningEntriesForWeek(weekStart, workerId)` - Planning Entries für Woche
- `getActiveDate()` - Aktives Datum (Single Source of Truth)
- `getPlanningForWorkerId()` - Ausgewählter Mitarbeiter für Planung
- `getAllPlanningEntries()` - Alle Planning Entries

### 3. API-Endpunkte

**Erweitert: `app/api/endpoints.js`**
- `getPlanningEntries(params)` - Lädt Planning Entries
- `createPlanningEntry(entryData)` - Erstellt Planning Entry
- `updatePlanningEntry(entryId, entryData)` - Aktualisiert Planning Entry
- `deletePlanningEntry(entryId)` - Löscht Planning Entry

### 4. Views

**Neu: `app/views/planning/weekView.js`**
- Rendert Wochenansicht mit Planning Blocks
- Zeigt geplante Blöcke als visuelle Elemente im Zeitraster
- Block-Details: Baustelle, Kategorie, Status, Tooltip mit Ressourcen

**Neu: `app/views/planning/dayView.js`**
- Rendert Tagesansicht mit Planning Blocks
- "Tag bestätigen"-Button (nur wenn PLANNED Entries vorhanden)
- Zeigt Status-Badge wenn alle bestätigt
- Zusammenfassung: Geplante vs. bestätigte Stunden

**Neu: `app/views/planning/teamCalendarView.js`**
- Rendert Teamkalender-Matrix
- Zeigt alle Mitarbeiter in Spalten, Tage in Zeilen
- Jeder Block zeigt Mitarbeiter-Kürzel + Kategorie
- Status-Visualisierung: PLANNED/CONFIRMED

**Neu: `app/views/planning/planningSelector.js`**
- "Planen für: [Dropdown]" Komponente
- Admin: Dropdown mit allen Workers
- Mitarbeiter: Readonly (eigener Name)

**Erweitert: `app/views/planning/planningShell.js`**
- Integriert Planning Selector
- Integriert Week/Day/Team Views
- Teamkalender-Toggle-Button

### 5. Services

**Neu: `app/services/planningService.js`**
- `loadPlanningEntries(weekStart, workerId)` - Lädt Planning Entries für Woche
- `savePlanningEntry(entryData)` - Speichert Planning Entry
- `confirmDayFromPlanning(date, workerId)` - **Kernfunktion:**
  - Lädt geplante Entries für Tag
  - Erstellt Time Entries für jeden geplanten Block (verhindert Duplikate)
  - Aktualisiert Planning Status zu CONFIRMED
  - Ruft `api.confirmDay()` auf (falls vorhanden)
  - Lädt Daten neu

### 6. Event Handler

**Neu: `app/handlers/planningHandlers.js`**
- `bindPlanningHandlers()` - Bindet alle Planning-Event-Handler
- Verwendet Event-Delegation (keine doppelten Bindings)
- Handler für:
  - Planning Worker Selector Change
  - Team Calendar Toggle
  - Confirm Day Button
  - Open Time Entry Wizard (syncs activeDate)
  - Calendar Day Click (setzt activeDate)
  - Calendar View Mode Switch

**Neu: `app/handlers/locationHandlers.js`**
- `bindLocationHandlers()` - Bindet Location-Form-Handler
- Sammelt `resourcesRequired` aus Equipment-Checkboxes
- Speichert Location mit `resourcesRequired` Array

### 7. Bootstrap & Legacy Bridge

**Erweitert: `app/bootstrap.js`**
- Lädt Planning Entries beim App-Start (wenn Session vorhanden)
- Bindet Planning- und Location-Handler

**Erweitert: `app/legacyBridge.js`**
- `openTimeEntryWizard()` nutzt jetzt `activeDate` (Single Source of Truth)
- Exportiert Planning-Funktionen für Legacy-Code

## Workflow

### 1. Admin erstellt Baustelle
- Formular erweitert um Equipment-Checkboxes
- `resourcesRequired` wird als Array gespeichert
- Handler: `app/handlers/locationHandlers.js`

### 2. Admin plant für Mitarbeiter
- Wählt Mitarbeiter aus "Planen für: [Dropdown]"
- Erstellt Zeitblock im Kalender (Woche/Tag)
- Block wird als PlanningEntry gespeichert (Status: PLANNED)
- Block erscheint in:
  - Wochenübersicht des Mitarbeiters
  - Teamkalender (mit Mitarbeiter-Kürzel)

### 3. Mitarbeiter sieht Blocks
- Nach Login sieht Mitarbeiter nur eigene geplante Blocks
- Keine Möglichkeit, für andere zu planen

### 4. Bestätigung
- In Tagesansicht: "Tag bestätigen"-Button
- Beim Klick:
  - Alle PLANNED Blocks werden zu Time Entries
  - Planning Status wird zu CONFIRMED
  - Time Entries bekommen Status CONFIRMED
  - Verhindert Duplikate (prüft `timeEntryRef`)

### 5. Zeit erfassen synchronisiert Datum
- "Zeit erfassen" Button liest `activeDate` aus State
- Wizard öffnet mit vorbefülltem Datum
- Wenn Datum im Wizard geändert wird, wird `activeDate` aktualisiert

## Technische Details

### Event-Delegation
- Alle Handler verwenden `handlers/events.js` Delegation
- Keine `addEventListener` in Render-Funktionen
- Keine doppelten Bindings nach Re-Render

### Single Source of Truth (Datum)
- `ui.activeDate` ist die zentrale Quelle für aktives Datum
- Wird gesetzt bei:
  - Kalender-Tag-Klick
  - "Zeit erfassen" Button
  - Wizard-Datum-Änderung
- Wird gelesen von:
  - Time Entry Wizard
  - Planning Views

### Duplikat-Verhinderung
- `confirmDayFromPlanning()` prüft auf existierende Time Entries
- Verwendet `timeEntryRef` Feld für Mapping
- Regel: Erstelle nur für geplante Blocks ohne existierenden TimeEntry

## Geänderte/Neue Dateien

### Neu erstellt (12 Dateien):
1. `app/views/planning/weekView.js` - Wochenansicht mit Planning Blocks
2. `app/views/planning/dayView.js` - Tagesansicht mit Confirm-Button
3. `app/views/planning/teamCalendarView.js` - Teamkalender-Matrix
4. `app/views/planning/planningSelector.js` - "Planen für" Dropdown
5. `app/services/planningService.js` - Planning-Service mit confirmDayFromPlanning
6. `app/handlers/planningHandlers.js` - Planning-Event-Handler
7. `app/handlers/locationHandlers.js` - Location-Form-Handler
8. `PLANNING_IMPLEMENTATION_SUMMARY.md` - Diese Datei

### Geändert (8 Dateien):
1. `app/state/store.js` - Planning State hinzugefügt
2. `app/state/actions.js` - Planning Actions hinzugefügt
3. `app/state/selectors.js` - Planning Selectors hinzugefügt
4. `app/api/endpoints.js` - Planning API-Endpunkte hinzugefügt
5. `app/views/planning/planningShell.js` - Integriert neue Views
6. `app/bootstrap.js` - Lädt Planning Entries beim Start
7. `app/legacyBridge.js` - Erweitert openTimeEntryWizard für activeDate
8. `app/views/planning/weekView.js` - Import-Korrektur

## Smoke-Test Checkliste

### Voraussetzungen
- [ ] Server läuft (`node server.js`)
- [ ] Browser öffnet `http://localhost:8080` (nicht `file://`)
- [ ] Admin-Login vorhanden

### Tests

#### 1. Baustelle mit Ressourcen erstellen
- [ ] Als Admin: Verwaltung → Baustelle hinzufügen
- [ ] Equipment-Checkboxes auswählen (z.B. LKW, Schweissgerät)
- [ ] Speichern
- [ ] Prüfen: Baustelle gespeichert mit `resourcesRequired` Array

#### 2. Planung für Mitarbeiter
- [ ] Als Admin: Planen → "Planen für: [Mitarbeiter X]" auswählen
- [ ] Woche-Ansicht öffnen
- [ ] Zeitblock erstellen (z.B. ganzer Tag am 02.02)
- [ ] Baustelle + Kategorie auswählen
- [ ] Speichern
- [ ] Prüfen: Block erscheint in Wochenübersicht von X
- [ ] Prüfen: Block erscheint im Teamkalender (mit Kürzel + Kategorie)

#### 3. Mitarbeiter sieht Blocks
- [ ] Als Mitarbeiter X einloggen
- [ ] Prüfen: Nur eigene geplante Blocks sichtbar
- [ ] Prüfen: Keine Möglichkeit, für andere zu planen

#### 4. Tag bestätigen
- [ ] Als Mitarbeiter X: Tagesansicht öffnen (Tag mit geplanten Blocks)
- [ ] "Tag bestätigen"-Button klicken
- [ ] Prüfen: Time Entries wurden erstellt
- [ ] Prüfen: Planning Blocks Status = CONFIRMED
- [ ] Prüfen: Time Entries Status = CONFIRMED
- [ ] Prüfen: Keine Duplikate

#### 5. Admin bestätigt sich selbst
- [ ] Als Admin: Für sich selbst planen
- [ ] Tag bestätigen
- [ ] Prüfen: Funktioniert ohne Sonderfall

#### 6. Zeit erfassen Datum-Sync
- [ ] Im Kalender auf Datum klicken (z.B. 05.02)
- [ ] "Zeit erfassen" öffnen
- [ ] Prüfen: Datum ist vorbefüllt (05.02)
- [ ] Datum im Wizard ändern
- [ ] Prüfen: activeDate wurde aktualisiert

#### 7. Keine doppelten Event-Bindings
- [ ] Mehrfach zwischen Views wechseln (Plan/Manage)
- [ ] Mehrfach "Zeit erfassen" öffnen/schließen
- [ ] Prüfen: Keine doppelten Handler-Ausführungen (z.B. kein Doppelklick nötig)

## Offene Punkte / Erweiterungen

1. **Planning Entry Creation aus Wizard**: Wenn ganztägiger Eintrag im Wizard erstellt wird, sollte auch Planning Entry erzeugt werden (aktuell nur Time Entry)

2. **Planning Entry Edit/Delete**: UI für Bearbeiten/Löschen von Planning Entries noch nicht implementiert

3. **Week Navigation**: Vorherige/Nächste Woche Navigation für Planning Views

4. **Drag & Drop**: Planning Blocks per Drag & Drop verschieben

5. **Bulk Confirm**: Mehrere Tage auf einmal bestätigen

## Wichtige Hinweise

- **Backend-Kompatibilität**: Die API-Endpunkte müssen das PlanningEntry-Schema unterstützen
- **Location Schema**: Backend muss `resourcesRequired` als Array speichern können
- **Time Entry Mapping**: Backend sollte `timeEntryRef` Feld unterstützen für Duplikat-Prüfung

