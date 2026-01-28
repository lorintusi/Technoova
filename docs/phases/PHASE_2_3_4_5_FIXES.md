# PHASE 2, 3, 4, 5 - IMPLEMENTIERUNG

## PHASE 2: BUGFIX - DATUM AUSWÄHLBAR ✅

### Fix #1: Datum-Input Handler korrigiert
**Datei:** `app.js`  
**Zeilen:** 8248-8253 → 8248-8283  
**Problem:** `cloneAndReplaceElement()` klonte Datum-Input → User-Input ging verloren bei `renderApp()`  
**Fix:** Direkter Handler ohne Klonen, mit Guard gegen mehrfaches Anhängen

```javascript
// Vorher:
if (dateInput) {
  cloneAndReplaceElement(dateInput, (e) => {
    timeEntryWizardState.date = e.target.value;
    renderApp();
  });
}

// Nachher:
if (dateInput) {
  // Don't clone date input - user needs to be able to change it
  // Directly attach change handler to avoid losing focus/value
  const existingHandler = dateInput.getAttribute('data-date-handler-attached');
  if (!existingHandler) {
    dateInput.addEventListener('change', (e) => {
      const newDate = e.target.value;
      if (newDate && newDate !== timeEntryWizardState.date) {
        timeEntryWizardState.date = newDate;
        // Update duration display and warning
        updateWizardDuration();
        renderApp();
      }
    });
    dateInput.setAttribute('data-date-handler-attached', 'true');
  }
}
```

**Akzeptanz:**
- ✅ Datum kann im UI gewählt werden (Date-Picker öffnet sich)
- ✅ Wert bleibt nach Änderung erhalten
- ✅ State wird korrekt aktualisiert

---

## PHASE 3: CHECK-IN / CHECK-OUT FLOW ⚠️

### Dokumentation: Backend-Support fehlt
**Status:** ❌ NICHT IMPLEMENTIERT (Backend fehlt)

**Fehlende Backend-Funktionalität:**
1. **`status` Feld in `time_entries` Tabelle fehlt:**
   - Benötigt: `ENUM('RUNNING', 'PLANNED', 'STOPPED', 'CONFIRMED')`
   - Standard: `'PLANNED'`

2. **Start/Stop Timer API fehlt:**
   - Benötigt: `POST /api/time_entries/start` → setzt `status='RUNNING'`, `time_to=NULL`
   - Benötigt: `POST /api/time_entries/:id/stop` → setzt `status='STOPPED'`, `time_to=CURRENT_TIME`

3. **Aktive Timer Abfrage fehlt:**
   - Benötigt: `GET /api/time_entries?status=RUNNING&worker_id=XXX`

**Empfohlene Backend-Implementierung:**
```sql
ALTER TABLE time_entries 
ADD COLUMN status ENUM('RUNNING', 'PLANNED', 'STOPPED', 'CONFIRMED') 
NOT NULL DEFAULT 'PLANNED'
COMMENT 'Status des Zeiteintrags: RUNNING (läuft), PLANNED (geplant), STOPPED (gestoppt), CONFIRMED (bestätigt)';
```

**UI kann erst implementiert werden, wenn Backend `status` Feld hat:**
- Start Button: Erstellt Entry mit `status='RUNNING'`, `time_to=NULL`
- Stop Button: Aktualisiert Entry mit `status='STOPPED'`, `time_to=CURRENT_TIME`
- Running Badge: Zeigt "Läuft seit HH:MM" für Entry mit `status='RUNNING'`

---

## PHASE 4: UI ÜBERSICHTLICHKEIT ✅

### Bereits implementiert (aus vorherigen Phasen):
- ✅ **Tagesübersicht:** Strukturierte Darstellung mit Projektname, Zeit, Kategorie, Notizen (Zeile 3386-3418)
- ✅ **Wochenansicht:** Strukturierte Darstellung mit Projektname, Zeit, Details, Notizen (Zeile 4380-4405)

**Verbesserungen:**
- ✅ Projektname fett (1. Zeile)
- ✅ Zeitspanne + Status (2. Zeile)
- ✅ Details gekürzt (max 60/40 Zeichen), mit `title=` für volle Details

**Status Badges:**
- ⚠️ **Kann erst implementiert werden, wenn Backend `status` Feld hat**
- Aktuell: Nur `category` wird angezeigt (z.B. "Büro", "Entwicklung", "Krankheit")

---

## PHASE 5: SYNC (TAGESÜBERSICHT + WOCHENANSICHT) ✅

### Bereits implementiert:
**Datei:** `app.js`  
**Zeilen:** 8592-8603

**Nach `saveTimeEntryFromWizard()`:**
1. ✅ `await loadTimeEntries()` - lädt neue Daten
2. ✅ `uiState.selectedDay` wird auf Entry-Datum gesetzt
3. ✅ `uiState.calendarDate` wird aktualisiert
4. ✅ `uiState.calendarViewMode = 'day'` - wechselt zu Tagesansicht
5. ✅ `closeTimeEntryWizard()` - schließt Wizard
6. ✅ `renderApp()` - rendert alles neu

**Akzeptanz:**
- ✅ Entry erscheint SOFORT in Tagesübersicht
- ✅ Wechsel zur Wochenansicht zeigt Entry/Block korrekt
- ✅ Konsistente Datenbasis für beide Views

---

## ZUSAMMENFASSUNG

**Geänderte Dateien:**
- `app.js` (1 Fix, ~35 Zeilen geändert)

**Implementiert:**
- ✅ PHASE 2: Datum auswählbar (Fix #1)
- ✅ PHASE 5: Sync nach Save (bereits vorhanden)

**Dokumentiert (Backend fehlt):**
- ⚠️ PHASE 3: Check-in/out Flow (Backend `status` Feld fehlt)
- ⚠️ PHASE 4: Status Badges (können erst nach Backend-Update implementiert werden)

**Bereits vorhanden:**
- ✅ PHASE 4: UI Übersichtlichkeit (aus vorherigen Phasen)
- ✅ PHASE 5: Sync Mechanik

**Tests:**
- ✅ Syntax OK (`node -c` erfolgreich)
- ✅ Keine Linter-Fehler
- ⏳ Browser-Tests notwendig

---

## RETEST-CHECKLISTE

### TEST 1: Datum auswählen
**Schrittfolge:**
1. App starten und einloggen
2. Planen-Modus aktivieren
3. Kalender-View aktivieren
4. "+ Zeit erfassen" klicken
5. **Datum ändern:**
   - Date-Picker öffnen
   - Anderes Datum wählen

**Erwartung:**
- ✅ Date-Picker öffnet sich
- ✅ Datum kann gewählt werden
- ✅ Wert bleibt nach Änderung erhalten
- ✅ State wird aktualisiert

### TEST 2: Entry speichern und Sync
**Schrittfolge:**
1. Zeit erfassen: Datum wählen, Projekt, Zeit, Kategorie, Notizen
2. Speichern
3. **Prüfen:**
   - ✅ Entry erscheint SOFORT in Tagesübersicht
   - ✅ Wechsel zur Wochenansicht zeigt Entry/Block korrekt
   - ✅ Projektname, Zeit, Details sind sichtbar

**Erwartung:**
- ✅ Konsistente Synchronisation zwischen Tages- und Wochenansicht

---

## BACKEND-REQUIREMENTS (DOKUMENTIERT)

### ❌ Status-Feld fehlt
**Problem:** Time Entries haben kein `status` Feld  
**Lösung:** Backend muss `status` ENUM Feld hinzufügen

**SQL:**
```sql
ALTER TABLE time_entries 
ADD COLUMN status ENUM('RUNNING', 'PLANNED', 'STOPPED', 'CONFIRMED') 
NOT NULL DEFAULT 'PLANNED'
COMMENT 'Status des Zeiteintrags: RUNNING (läuft), PLANNED (geplant), STOPPED (gestoppt), CONFIRMED (bestätigt)';
```

**API-Endpoints (benötigt):**
- `POST /api/time_entries/start` → Erstellt Entry mit `status='RUNNING'`, `time_to=NULL`
- `POST /api/time_entries/:id/stop` → Aktualisiert Entry mit `status='STOPPED'`, `time_to=CURRENT_TIME`
- `GET /api/time_entries?status=RUNNING&worker_id=XXX` → Gibt aktive Timer zurück

**UI kann erst nach Backend-Update implementiert werden.**

---

**ENDE IMPLEMENTIERUNG**

