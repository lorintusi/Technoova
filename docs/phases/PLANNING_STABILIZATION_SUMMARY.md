# Planning-Stabilisierung: Edge-Cases & Daten-Sync

## Übersicht

Stabilisierung der Planning-Implementierung: Duplikat-Verhinderung, konsistente Statusregeln, Worker-Sync, Backend-Robustness und minimales UI-Polish.

## Implementierte Verbesserungen

### 1. Idempotente Duplikat-Verhinderung

**Problem:** `confirmDayFromPlanning()` konnte bei wiederholtem Aufruf doppelte Time Entries erzeugen.

**Lösung:** Drei-stufige Duplikat-Prüfung:
1. **Planning Entry hat bereits `timeEntryId`** → Skip
2. **TimeEntry existiert mit `meta.sourcePlanningEntryId`** → Link vorhanden
3. **TimeEntry existiert mit gleichen Attributen** → Fallback-Prüfung

**Implementierung:**
- `app/services/planningService.js`: `confirmDayFromPlanning()` erweitert
- TimeEntry erhält `meta.sourcePlanningEntryId` (Option A bevorzugt)
- Batch-Update der Planning Entries nach Bestätigung

**Ergebnis:** Mehrfaches Bestätigen erzeugt keine Duplikate.

### 2. Konsistente Statusregeln

**Regeln:**
- `PlanningEntry.status`: `PLANNED` | `CONFIRMED`
- Sobald PlanningEntry eine TimeEntry-Referenz hat → Status `CONFIRMED`
- Teamkalender zeigt Status visuell (Badge: ✓ / ⏳)
- Mitarbeiter sieht nur eigene Einträge
- Admin sieht alle im Teamkalender
- Validierung: Worker darf nicht für andere bestätigen

**Implementierung:**
- `app/services/planningService.js`: Worker-Validierung in `confirmDayFromPlanning()`
- `app/views/planning/weekView.js`: Status-Badge in Planning Blocks
- `app/views/planning/teamCalendarView.js`: Status-Badge in Team Blocks
- `app/state/actions.js`: `markPlanningEntriesConfirmed()` für Batch-Update

### 3. ActiveDate + SelectedWorker Sync

**Problem:** Worker-Auswahl und Datum waren nicht synchronisiert.

**Lösung:**
- `planning.selectedWorkerId` als Single Source of Truth
- Actions: `setSelectedPlanningWorkerId()`
- Selectors: `getSelectedPlanningWorkerId()`
- Wizard nutzt `activeDate` + `selectedWorkerId`

**Implementierung:**
- `app/state/store.js`: `planning.selectedWorkerId` hinzugefügt
- `app/state/actions.js`: `setSelectedPlanningWorkerId()` erstellt
- `app/state/selectors.js`: `getSelectedPlanningWorkerId()` erstellt
- `app/handlers/planningHandlers.js`: Worker-Selector ändert `selectedWorkerId`
- `app/handlers/planningHandlers.js`: Wizard öffnet mit `activeDate` + `selectedWorkerId`

**Ergebnis:** Admin wählt Worker → "Zeit erfassen" nutzt diesen Worker automatisch.

### 4. Backend Robustness

**Problem:** Fehlende oder fehlerhafte API-Endpunkte konnten App zum Absturz bringen.

**Lösung:**
- Try/Catch in allen API-Calls
- Graceful Degradation: App läuft weiter auch bei Fehlern
- User-friendly Error Messages (Toast statt Alert)
- Logging für Debugging

**Implementierung:**
- `app/api/endpoints.js`: Try/Catch in Planning-Endpunkten
- `app/services/planningService.js`: Error-Handling in `loadPlanningEntries()`, `savePlanningEntry()`, `confirmDayFromPlanning()`
- `app/bootstrap.js`: `loadPlanningEntriesForCurrentWeek()` crasht nicht bei Fehlern
- `app/utils/toast.js`: Toast-System für User-Feedback

**Ergebnis:** App bleibt stabil auch bei Backend-Fehlern.

### 5. UI Minimal Polish

**Planning Block (Week View):**
- Klare Darstellung: `[Projekt/Baustelle]` + `[Kategorie]`
- Zweite Zeile: Ort oder Ressourcen-Kurztext
- Hover/Tooltip: Adresse + Ressourcen + Notiz
- Status-Badge: ✓ für CONFIRMED, ⏳ für PLANNED

**Teamkalender:**
- Blocktext: Worker-Kürzel + Kategorie (optional Projekt)
- Status-Badge: ✓ / ⏳

**Day View:**
- Confirm Button disabled wenn keine planned entries
- Confirm Button zeigt Loading-State während Bestätigung läuft
- Status-Badge wenn alle bestätigt oder keine Planung

**Implementierung:**
- `app/views/planning/weekView.js`: Erweiterte Block-Darstellung
- `app/views/planning/teamCalendarView.js`: Status-Badge hinzugefügt
- `app/views/planning/dayView.js`: Button-States verbessert
- `app/handlers/planningHandlers.js`: Loading-State für Confirm-Button

## Geänderte Dateien

### Neu erstellt (1 Datei):
1. `app/utils/toast.js` - Toast-Notification-System

### Geändert (11 Dateien):

1. **`app/state/store.js`**
   - `planning.selectedWorkerId` hinzugefügt

2. **`app/state/actions.js`**
   - `setSelectedPlanningWorkerId()` - Setzt ausgewählten Worker
   - `upsertPlanningEntries()` - Upsert für Batch-Operationen
   - `markPlanningEntriesConfirmed()` - Batch-Status-Update

3. **`app/state/selectors.js`**
   - `getSelectedPlanningWorkerId()` - Getter für ausgewählten Worker
   - `getPlanningEntriesForWorkerWeek()` - Alias für Kompatibilität
   - `getPlanningEntriesForWorkerDay()` - Alias für Kompatibilität

4. **`app/services/planningService.js`**
   - `confirmDayFromPlanning()` - Idempotent gemacht, Worker-Validierung, besseres Error-Handling
   - `loadPlanningEntries()` - Error-Handling verbessert
   - `savePlanningEntry()` - Error-Messages verbessert

5. **`app/handlers/planningHandlers.js`**
   - Worker-Selector nutzt `setSelectedPlanningWorkerId()`
   - Confirm-Button zeigt Loading-State
   - Wizard öffnet mit `activeDate` + `selectedWorkerId`
   - Toast statt Alert für Fehler

6. **`app/handlers/locationHandlers.js`**
   - `collectResourcesFromForm()` - Robust: trim, dedupe, remove empty

7. **`app/api/endpoints.js`**
   - Planning-Endpunkte mit Try/Catch und Error-Handling

8. **`app/bootstrap.js`**
   - `loadPlanningEntriesForCurrentWeek()` - Robustes Error-Handling

9. **`app/views/planning/weekView.js`**
   - Erweiterte Block-Darstellung mit Status-Badge und Details-Zeile

10. **`app/views/planning/teamCalendarView.js`**
    - Status-Badge in Team-Blocks

11. **`app/views/planning/dayView.js`**
    - Button-States verbessert (disabled, loading, empty state)

## Technische Details

### Duplikat-Verhinderung (Idempotenz)

**Referenzierung:**
- TimeEntry erhält `meta.sourcePlanningEntryId = planningEntry.id` (Option A)
- PlanningEntry erhält `timeEntryId` (bidirektionale Referenz)

**Prüfung:**
1. PlanningEntry.timeEntryId vorhanden → Skip
2. TimeEntry.meta.sourcePlanningEntryId match → Skip
3. Fallback: Gleiche Attribute → Skip

**Ergebnis:** Mehrfaches Bestätigen ist idempotent.

### Statusregeln

**PlanningEntry Status:**
- `PLANNED`: Initial, noch nicht bestätigt
- `CONFIRMED`: Hat TimeEntry-Referenz oder wurde erfolgreich übernommen

**Automatische Status-Update:**
- Beim Bestätigen: Batch-Update aller betroffenen Entries
- Persistierung: API-Call für jeden Entry (mit Error-Handling)

### Worker-Sync

**Flow:**
1. Admin wählt Worker im Selector → `planning.selectedWorkerId` gesetzt
2. "Zeit erfassen" öffnet → Nutzt `selectedWorkerId` + `activeDate`
3. Wizard speichert → TimeEntry erhält `worker_id = selectedWorkerId`

**Validierung:**
- Worker kann nur für sich selbst bestätigen
- Admin kann für alle bestätigen

### Error-Handling

**Strategie:**
- Try/Catch in allen kritischen Pfaden
- Graceful Degradation: App läuft weiter
- User-Feedback: Toast statt Alert
- Logging: Console für Debugging

**Beispiele:**
- API-Endpunkt fehlt → Leeres Array zurückgegeben
- API-Fehler → Error-Message im Toast
- Bestätigung fehlgeschlagen → Button wird wieder aktiviert

## Smoke-Test Checkliste

### 1. Confirm Idempotent
- [ ] Tag mit geplanten Blocks bestätigen
- [ ] Erneut bestätigen (Button sollte disabled sein oder keine Duplikate erzeugen)
- [ ] Prüfen: Keine doppelten Time Entries
- [ ] Prüfen: Planning Entries Status = CONFIRMED

### 2. Worker Selection Sync
- [ ] Als Admin: Worker im Selector auswählen
- [ ] "Zeit erfassen" öffnen
- [ ] Prüfen: Wizard nutzt ausgewählten Worker
- [ ] TimeEntry speichern
- [ ] Prüfen: TimeEntry hat `worker_id = selectedWorkerId`

### 3. Backend Fail Doesn't Crash
- [ ] Backend-Endpunkt für Planning deaktivieren/simulieren
- [ ] App starten
- [ ] Prüfen: App läuft weiter (kein Crash)
- [ ] Prüfen: Toast zeigt Error-Message
- [ ] Prüfen: Planning Views zeigen leere Liste

### 4. Status Visualisierung
- [ ] Planning Block in Week View: Status-Badge sichtbar
- [ ] Team Calendar: Status-Badge sichtbar
- [ ] Day View: Confirm Button disabled wenn keine planned entries
- [ ] Day View: Status-Badge wenn alle bestätigt

### 5. UI Polish
- [ ] Planning Block: Zweite Zeile mit Details sichtbar
- [ ] Hover über Block: Tooltip mit vollständigen Infos
- [ ] Confirm Button: Loading-State während Bestätigung
- [ ] Toast: Erfolgs-/Fehler-Messages erscheinen

## Wichtige Hinweise

- **Backend-Kompatibilität:** Backend muss `meta.sourcePlanningEntryId` in TimeEntry unterstützen
- **Idempotenz:** Mehrfaches Bestätigen ist sicher (keine Duplikate)
- **Error-Handling:** App bleibt stabil auch bei Backend-Fehlern
- **Worker-Sync:** Admin kann für ausgewählten Worker planen und erfassen

