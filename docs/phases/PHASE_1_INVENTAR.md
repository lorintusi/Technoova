# PHASE 1 - IST-ZUSTAND & INVENTAR

## UI-BEREICHE WO MITARBEITER/USERS AUSWÄHLBAR SIND

| UI-Bereich | Selector/ID | Render-Funktion | Datenquelle | Update nach CreateWorker? |
|------------|-------------|-----------------|-------------|---------------------------|
| **Kalender User Switcher** | `#user-switcher-select` | `renderPlanningShell()` Zeile 1226-1234 | `data.users.filter(u => u.workerId && u.id !== data.currentUser.id)` | ❌ NEIN - `loadAllData()` wird aufgerufen, aber Select wird nicht explizit neu gerendert |
| **Mitarbeiter-Verwaltung** | `renderWorkerDashboard()` | `renderWorkerDashboard()` Zeile 4591 | `data.workers` gefiltert | ✅ JA - `renderApp()` rendert neu |
| **Teams-Verwaltung** | `renderTeamsDashboard()` | `renderTeamsDashboard()` Zeile 4527 | `data.teams`, `data.workers` | ✅ JA - `renderApp()` rendert neu |
| **Baustellen Teamleiter** | `#leadName` (Input) | `openAddLocationModal()` Zeile 5628-5640 | **NICHT AUS SELECT** - nur Input-Feld | ❌ PROBLEM - Teamleiter wird als Text-Input gespeichert, nicht als User/Worker Reference |

## CREATE-WORKER FLOW

**Funktion:** `openAddWorkerModal()` Zeile 5432-5584

**Ablauf:**
1. Worker wird erstellt via `saveWorkerToAPI(workerData)` (Zeile 5550)
2. User wird erstellt via `saveUserToAPI(userData)` mit `worker_id: workerId` (Zeile 5569)
3. `loadAllData()` wird aufgerufen (Zeile 5575)
4. `renderApp()` wird aufgerufen (Zeile 5576)

**Problem identifiziert:**
- ✅ `loadAllData()` lädt `users` und `workers` neu
- ✅ `renderApp()` rendert alles neu
- ⚠️ **ABER:** User Switcher nutzt `data.users.filter(u => u.workerId)` - wenn `workerId` nicht gesetzt ist, erscheint User nicht
- ⚠️ **ABER:** Nach `saveUserToAPI()` wird nur `users` neu geladen, nicht `workers` - ABER `loadAllData()` lädt beide neu

**Tatsächliches Problem:**
- `loadAllData()` lädt beide Listen neu
- `renderApp()` rendert alles neu
- **User Switcher sollte funktionieren ABER:** Möglicherweise Race Condition oder `workerId` wird nicht korrekt gesetzt

## PROJEKT/BAUSTELLEN VERWALTUNG

**Teamleiter-Auswahl:**
- **Zeile 5628-5640:** `openAddLocationModal()` - Teamleiter wird als **TEXT-INPUT** gespeichert (`#leadName`, `#leadPhone`)
- **KEINE** Select-Dropdown für User/Worker
- **Problem:** Teamleiter ist nur Text, keine Verknüpfung zu User/Worker → **KANN NICHT AUS LISTE AUSGEWÄHLT WERDEN**

**Speicherung:**
- Teamleiter wird in Location-Daten gespeichert (vermutlich `location.teamLeader` oder ähnlich)
- **KEIN** Select-Dropdown existiert

## FEHLENDE FUNKTIONALITÄT

### ❌ Backend fehlt:
1. **Teamleiter als User/Worker Reference:** Aktuell nur Text-Input, kein Select-Dropdown
   - **Wird NICHT implementiert** (nur dokumentiert)

### ✅ Muss gefixt werden:
1. **User Switcher aktualisiert sich nicht korrekt** nach CreateWorker
   - Fix: Sicherstellen, dass nach `loadAllData()` auch der User Switcher explizit neu gerendert wird
   - Oder: Prüfen ob `workerId` korrekt in `data.users` gesetzt ist

## ZUSAMMENFASSUNG

**Hauptproblem:**
- User Switcher sollte nach `loadAllData()` + `renderApp()` aktualisiert werden
- Aber möglicherweise Race Condition oder `workerId` wird nicht korrekt gesetzt
- **Fix:** Explizit `data.users` und `data.workers` synchronisieren nach CreateWorker

**Nebenfrage:**
- Teamleiter-Auswahl ist nur Text-Input, kein Select-Dropdown
- **Wird dokumentiert, aber nicht gefixt** (keine Backend-Änderung)

