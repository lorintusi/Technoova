# BUG-FIXES (Debugging-Session)

## FIX #1: User Switcher Handler auf Event-Delegation umgestellt

**Datei:** `app.js`  
**Zeilen:** 1976-2003  
**Priorität:** 🔴 HOCH

**Problem:**
- Handler wurde direkt via `getElementById()` gebunden
- `attachCalendarViewModeHandlers()` läuft NUR EINMAL (Guard)
- Wenn Element beim ersten Aufruf nicht existiert → Handler wird nie gebunden

**Ursache:**
- Direkte Bindung statt Event-Delegation
- Element existiert nur für Admins, könnte nach Login gerendert werden

**Fix:**
- Umgestellt auf Event-Delegation via `document.addEventListener('change', ...)`
- Prüfung via `e.target.id === 'user-switcher-select'`
- Funktioniert jetzt dynamisch, auch wenn Element später gerendert wird

**Code-Änderung:**
```javascript
// VORHER:
const userSwitcher = document.getElementById('user-switcher-select');
if (userSwitcher) {
  userSwitcher.addEventListener('change', async (e) => { ... });
}

// NACHHER:
document.addEventListener('change', async (e) => {
  if (e.target.id === 'user-switcher-select') {
    // ... gleiche Logik ...
  }
});
```

**Retest-Skript:**
1. App starten (als Admin einloggen)
2. User-Switcher öffnen (falls vorhanden)
3. Einen anderen User auswählen
4. **ERWARTET:** Zeit-Einträge werden für den ausgewählten User geladen
5. **Console prüfen:** Sollte `[UserSwitcher] Changed to: ...` loggen

---

## FIX #2: Time-Slot-Click-Handler hinzugefügt (via Event-Delegation)

**Datei:** `app.js`  
**Zeilen:** 2008-2070  
**Priorität:** 🟡 MITTEL

**Problem:**
- Time-Slot-Click-Handler wurden entfernt, aber nicht durch Event-Delegation ersetzt
- Handler fehlte komplett → Time-Slots in Week-View nicht klickbar

**Ursache:**
- Handler wurde in vorheriger Refactoring-Session entfernt
- Kommentar sagte "event delegation for time slots", aber Handler existierte nicht

**Fix:**
- Event-Delegation-Handler hinzugefügt via `document.addEventListener('click', ...)`
- Prüfung via `e.target.closest('.day-column__slot[data-click-slot="true"]')`
- Gleiche Logik wie vorher, aber jetzt dynamisch und nur einmal gebunden

**Code-Änderung:**
```javascript
// HINZUGEFÜGT:
document.addEventListener('click', (e) => {
  const slot = e.target.closest('.day-column__slot[data-click-slot="true"]');
  if (!slot) return;
  // ... Logik zum Öffnen des Time-Entry-Wizards ...
});
```

**Retest-Skript:**
1. App starten und einloggen
2. Week-View öffnen (Kalender → Week)
3. Auf einen Time-Slot klicken (z.B. 08:00 in einer Spalte)
4. **ERWARTET:** Time-Entry-Wizard öffnet sich mit vorgeschlagenen Zeiten
5. **NICHT ERWARTET:** Keine Reaktion beim Klick

---

## STATUS

✅ **FIX #1:** Implementiert und getestet (Syntax OK)  
✅ **FIX #2:** Implementiert und getestet (Syntax OK)  
⚠️ **Browser-Test:** Noch ausstehend

---

## NÄCHSTE SCHRITTE

1. **Browser-Test durchführen:**
   - Fix #1: User-Switcher testen (als Admin)
   - Fix #2: Time-Slot-Clicks testen (Week-View)

2. **Console-Fehler prüfen:**
   - DevTools öffnen (F12)
   - Console-Tab prüfen
   - Erste rote Fehlermeldung dokumentieren (falls vorhanden)

3. **Network-Fehler prüfen:**
   - Network-Tab prüfen
   - Failed requests dokumentieren (404/500/CORS)

---

**ENDE BUG-FIXES**

