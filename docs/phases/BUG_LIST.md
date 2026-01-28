# BUG-LISTE (Code-basierte Analyse)

## BLOCKER #1: User Switcher Handler wird nie gebunden

**Datei:** `app.js`  
**Zeilen:** 1977-2003  
**Priorität:** 🔴 HOCH (Admin-Feature funktioniert nicht)

**Problem:**
- `attachCalendarViewModeHandlers()` läuft NUR EINMAL (Guard `calendarViewModeHandlersBound`)
- `getElementById('user-switcher-select')` wird beim ersten Aufruf ausgeführt
- Wenn Element beim ersten Aufruf NICHT existiert → Handler wird nie gebunden
- Element existiert nur für Admins, könnte auch nach Login gerendert werden

**Fehlertyp:** ReferenceError / Silent Failure (Feature funktioniert nicht)

**Ursache:**
- Direkte Bindung statt Event-Delegation
- Guard verhindert erneute Bindung, wenn Element später existiert

**Fix:**
- Umstellen auf Event-Delegation (ähnlich wie andere Handler)

---

## BLOCKER #2: Time-Slot-Click-Handler fehlen (behoben?)

**Datei:** `app.js`  
**Zeilen:** 2008-2013 (nur Kommentar)  
**Priorität:** 🟡 MITTEL (Week-View Feature)

**Status:** Unklar - Handler wurden entfernt, sollten via Event-Delegation existieren

**Zu prüfen:**
- Existiert ein Event-Delegation-Handler für `.day-column__slot[data-click-slot="true"]`?
- Wenn nein: Handler wieder hinzufügen (Event-Delegation)

---

## POTENTIELLE FEHLER (zu prüfen)

### #3: Event-Delegation mit `.closest()` - Null-Check fehlt?
**Stellen:** Alle Event-Delegation-Handler  
**Priorität:** 🟢 NIEDRIG (bereits durch `if (!element) return;` abgefangen)

**Status:** ✅ OK - alle Handler prüfen auf null

### #4: Scroll-Sync Handler - werden sie dynamisch gebunden?
**Stellen:** `setupScrollSynchronization()` wird in `bindPlanningHandlers()` aufgerufen  
**Priorität:** 🟢 NIEDRIG (wird dynamisch aufgerufen)

**Status:** ✅ OK - wird dynamisch via `setupScrollSynchronization()` gehandhabt

---

## NÄCHSTER SCHRITT

1. Fix #1 implementieren (User Switcher auf Event-Delegation)
2. Fix #2 prüfen (Time-Slot-Clicks - existiert Handler?)
3. Browser-Test durchführen

