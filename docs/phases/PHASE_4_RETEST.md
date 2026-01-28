# PHASE 4 - RETEST & AKZEPTANZKRITERIEN

## PATCH SUMMARY

| Bug | Datei | Zeilen | Fix |
|-----|-------|--------|-----|
| View-Switch-Handler nicht gebunden | `app.js` | 1781-1804 → 1781-1783 | Event-Delegation auf `document` statt direkter Bindung |

**Geänderte Listener:**
- **Zeile 1783:** `document.addEventListener('click', handleViewSwitch)` 
- **Entfernt:** Direkte Bindung auf `.content__toolbar` und `[data-view]` Buttons
- **Funktion:** `handleViewSwitch()` bleibt unverändert (Zeile 1466-1478)

**Bestätigung:**
- ✅ Keine Logik geändert, nur Binding-Strategie
- ✅ `handleViewSwitch()` prüft bereits `e.target.closest('[data-view]')` → perfekt für Event-Delegation
- ✅ Handler wird nur einmal gebunden (via `bindGlobalEventHandlers()` Guard)

---

## RETEST-CHECKLISTE

### TEST 1: Klick auf "Teams"

**Schrittfolge:**
1. App starten (localhost)
2. Einloggen (falls notwendig)
3. Planen-Modus aktivieren (falls nicht aktiv)
4. **Klick auf "Teams" Button** (in `.content__tabs`)

**Erwartung:**
- ✅ Teams-View wird angezeigt (`renderTeamsDashboard()`)
- ✅ `uiState.activeView = "teams"` wird gesetzt
- ✅ Console log: `Switching view to: teams`
- ✅ Kein Console Error

**Prüfen:**
- Browser Console (F12) → Console-Tab
- Network-Tab → keine Failed Requests
- UI zeigt Teams-Dashboard

---

### TEST 2: Klick auf "Kalender"

**Schrittfolge:**
1. App starten und einloggen
2. Planen-Modus aktivieren
3. **Klick auf "Kalender" Button** (in `.content__tabs`)

**Erwartung:**
- ✅ Kalender-View wird angezeigt
- ✅ `uiState.activeView = "calendar"` wird gesetzt
- ✅ Console log: `Switching view to: calendar`
- ✅ Kein Console Error

**Prüfen:**
- Browser Console (F12) → Console-Tab
- Network-Tab → keine Failed Requests
- UI zeigt Kalender-View (mit View-Mode-Switcher)

---

### TEST 3: Klick auf "Mitarbeiter"

**Schrittfolge:**
1. App starten und einloggen
2. Planen-Modus aktivieren
3. **Klick auf "Mitarbeiter" Button** (in `.content__tabs`)

**Erwartung:**
- ✅ Mitarbeiter-View wird angezeigt (`renderWorkerDashboard()`)
- ✅ `uiState.activeView = "workers"` wird gesetzt
- ✅ Console log: `Switching view to: workers`
- ✅ Kein Console Error

**Prüfen:**
- Browser Console (F12) → Console-Tab
- Network-Tab → keine Failed Requests
- UI zeigt Mitarbeiter-Dashboard

---

## ZUSÄTZLICHE TESTS

### TEST 4: View-Wechsel zwischen allen Views

**Schrittfolge:**
1. Teams → Kalender → Mitarbeiter → Teams
2. Jeden Button mehrmals klicken

**Erwartung:**
- ✅ Jeder Klick führt zu View-Wechsel
- ✅ Keine doppelten Events (ein Klick → eine Aktion)
- ✅ Keine Console Errors

**Prüfen:**
- Browser Console → keine wiederholten Fehler
- Keine doppelten Render-Zyklen

---

### TEST 5: Console & Network Errors

**Schrittfolge:**
1. DevTools öffnen (F12)
2. Console-Tab prüfen
3. Network-Tab prüfen
4. Durch alle Views wechseln

**Erwartung:**
- ✅ Keine Console Errors (keine roten Fehlermeldungen)
- ✅ Keine Network Errors (404/500/CORS)
- ✅ Console log: `Switching view to: ...` für jeden Wechsel

**Prüfen:**
- Erste 10 Console-Fehler dokumentieren (falls vorhanden)
- Failed Requests dokumentieren (falls vorhanden)

---

## AKZEPTANZKRITERIEN

✅ **Alle Tests bestehen:**
- Teams-Button klickbar → Teams-View wird angezeigt
- Kalender-Button klickbar → Kalender-View wird angezeigt
- Mitarbeiter-Button klickbar → Mitarbeiter-View wird angezeigt

✅ **Keine Regressionen:**
- Keine Console Errors
- Keine doppelten Events
- Keine Network Errors

✅ **Funktionalität:**
- View-Wechsel funktioniert in beide Richtungen
- Alle Views rendern korrekt
- State (`uiState.activeView`) wird korrekt gesetzt

---

## FALLBACK (WENN TEST FEHLSCHLÄGT)

**Backup wiederherstellen:**
```powershell
Copy-Item "_backups/app.js.backup-2026-01-20_01-30-45.before-teams-calendar-workers.js" -Destination "app.js"
```

**Debugging:**
1. Browser Console öffnen (F12)
2. Erste rote Fehlermeldung dokumentieren
3. Network-Tab prüfen (Failed Requests)
4. Event-Listener prüfen:
   - DevTools → Elements → Event Listeners auf `[data-view]` Buttons

---

**ENDE RETEST-CHECKLISTE**

