# PHASE 3 - MINIMAL FIX

## FIX #1: View-Switch-Handler auf Event-Delegation umgestellt

**Datei:** `app.js`  
**Zeilen:** 1781-1804 → 1781-1783  
**Priorität:** 🔴 BLOCKER

**Problem:**
- Handler wurde direkt auf `.content__toolbar` gebunden
- `bindPlanningHandlers()` läuft nur einmal (weil `globalHandlersBound` Guard)
- **WENN** `.content__toolbar` beim ersten Aufruf nicht existiert → Handler wird nie gebunden
- **WENN** `[data-view]` Buttons beim ersten Aufruf nicht existieren → direkte Bindung via `.forEach()` funktioniert nicht

**Ursache:**
- Binding-Zeitpunkt: Handler wird gebunden, bevor DOM-Elemente existieren
- Guard `globalHandlersBound` verhindert erneute Bindung
- Direkte Bindung auf DOM-Elemente statt Event-Delegation

**Fix:**
- Event-Delegation auf `document` statt direkter Bindung
- `handleViewSwitch()` prüft bereits `e.target.closest('[data-view]')` → perfekt für Event-Delegation
- Entfernt:
  - Direkte Bindung auf `.content__toolbar`
  - Direkte `.forEach()` Bindung auf `[data-view]` Buttons
- Hinzugefügt:
  - `document.addEventListener('click', handleViewSwitch)`

**Code-Änderung:**
```javascript
// VORHER (Zeile 1781-1804):
const contentToolbar = document.querySelector('.content__toolbar');
if (contentToolbar) {
  contentToolbar.addEventListener('click', handleViewSwitch);
}
document.querySelectorAll("[data-view]").forEach((btn) => {
  // ... direkte Bindung ...
});

// NACHHER (Zeile 1781-1783):
// View switching via event delegation on document (works for dynamically rendered elements)
// Note: handleViewSwitch already uses e.target.closest('[data-view]') - perfect for delegation
document.addEventListener('click', handleViewSwitch);
```

**Vorteile:**
- `document` existiert immer → Handler wird immer gebunden
- Event-Delegation funktioniert auch für später gerenderte Elemente
- Nur ein Handler statt mehrerer direkter Bindungen
- `handleViewSwitch()` prüft bereits `e.target.closest('[data-view]')` → keine Logik-Änderung nötig

**Risiko:** 🟢 MINIMAL
- Keine Logik geändert, nur Binding-Strategie
- `handleViewSwitch()` bleibt unverändert
- Event-Delegation ist stabiler als direkte Bindung

**Retest:**
- Syntax OK (`node -c` erfolgreich)
- Keine Linter-Fehler
- Browser-Test notwendig

