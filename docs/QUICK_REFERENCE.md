# Technova Dispo Planner – Quick Reference

**Zweck:** Schnelle Referenz für Cursor während Implementierung  
**Für:** Phase 1-12 Umstrukturierung

---

## ⚡ Grundregeln (immer gültig)

### Boot-Sicherheit
- ✅ Nach jeder Änderung: App muss ohne Console Errors starten
- ✅ Keine großen TODOs auf kritischen Pfaden (Boot/Login/Planen/Verwalten)

### ESM & Imports
- ✅ State-Imports nur über `app/state/index.js`
- ✅ Keine direkten Imports von `store.js`/`actions.js`/`selectors.js` (außer intern)

### Event Handling
- ✅ Nur Event Delegation (`handlers/events.js`)
- ✅ Kein mehrfaches Binding
- ✅ Pro Event-Type ein Listener

### Daten-Normalisierung
- ✅ `snake_case` → `camelCase`
- ✅ Arrays deduped by `id`
- ✅ State speichert konsistent `camelCase`

### Design System
- ✅ Keine Inline-Styles
- ✅ Nutze Technova CSS-Klassen

### RBAC
- ✅ Nur zwei Rollen: `ADMIN`, `WORKER`
- ✅ Permission-Checks: Frontend + Backend

---

## 📋 Arbeitsroutine pro Phase

### Schritt A — Scannen
1. Lese relevante Views, Handlers, Services, State
2. Prüfe Backend API + Migrations
3. Prüfe CSS `styles.css`

### Schritt B — Minimaler Change
- Änderungen so klein wie möglich
- Ein Featurepfad vollständig (z.B. Dispatch create + list)

### Schritt C — Dateienliste
- Liste "Neu" / "Geändert"
- Kurznotizen pro Datei (1-2 Zeilen)

### Schritt D — Smoke Tests
- Boot
- Kernflow des Features
- Reload Persistence
- RBAC Checks (Admin vs Worker)

---

## ✅ Definition "Done" pro Phase

Eine Phase gilt nur als fertig, wenn:

- ✅ Keine Console Errors
- ✅ Kein doppeltes Event-Firing
- ✅ UI passt ins Technova Design
- ✅ API + State + View + Handler bilden geschlossenen Kreis
- ✅ Smoke Tests bestehen

---

## 🎯 Phase 1: RBAC vereinfachen (Nächste Phase)

### Aufgaben
1. `app/utils/permissions.js` konsolidieren:
   - `isAdmin()`, `isWorker()`
   - `canPlanFor()`, `canViewTeamCalendar()`
   - `canManageUsers()`, `canManageLocations()`
   - `canUploadMedicalCert()`, `canConfirmDay()`

2. UI Guards:
   - Teamkalender-Button nur Admin
   - Worker-Dropdown nur Admin (Worker sieht "Ich")
   - Verwalten Tabs nur Admin

3. Backend Permission Checks sicherstellen

### Smoke Tests
- ✅ Admin sieht Verwalten + Teamkalender
- ✅ Worker sieht nur Planen, keine Admin Tabs
- ✅ Worker kann nicht für andere planen (UI + API)

---

## 🔧 Wichtige Patterns

### State Import Pattern
```javascript
// ✅ RICHTIG
import { getState, setState, getActiveUser } from '../state/index.js';

// ❌ FALSCH
import { getState } from '../state/store.js';
import { getActiveUser } from '../state/selectors.js';
```

### Event Handler Pattern
```javascript
// ✅ RICHTIG (Event Delegation)
on('click', '[data-action="delete-entry"]', (e) => {
  const entryId = e.target.closest('[data-action="delete-entry"]')?.getAttribute('data-entry-id');
  // Handler logic
});

// ❌ FALSCH (Direktes Binding)
element.addEventListener('click', handler); // Mehrfach = Duplikat!
```

### Normalisierung Pattern
```javascript
// ✅ RICHTIG
const normalized = {
  id: entry.id,
  workerId: entry.worker_id || entry.workerId,
  date: entry.date || entry.entry_date,
  startTime: entry.start_time || entry.startTime || null,
  // ...
};
```

### Permission Check Pattern
```javascript
// ✅ RICHTIG
import { isAdmin, canPlanFor } from '../utils/permissions.js';

if (!canPlanFor(currentUser, workerId)) {
  showToast('Keine Berechtigung', 'error');
  return;
}
```

---

## 🚨 Kritische Pfade (müssen immer funktionieren)

1. **Boot:** `bootstrap.js` → `loadAllData()` → `renderApp()`
2. **Login:** Auth Flow funktioniert
3. **Planen:** Kalender lädt, CRUD funktioniert
4. **Verwalten:** Tabs wechseln, CRUD funktioniert
5. **RBAC:** Admin vs Worker Checks funktionieren

---

## 📁 Wichtige Dateien

### State
- `app/state/index.js` - Barrel Export (Public API)
- `app/state/store.js` - State Store (intern)
- `app/state/actions.js` - State Mutations (intern)
- `app/state/selectors.js` - State Accessors (intern)

### Permissions
- `app/utils/permissions.js` - Permission Checks

### Guards Scripts
- `scripts/check-duplicates.mjs` - Prüft doppelte Exports
- `scripts/check-imports.mjs` - Prüft State-Imports

### Dokumentation
- `docs/ARCHITECTURE.md` - Architektur-Übersicht
- `docs/PHASE_ROADMAP.md` - Phasen-Roadmap
- `docs/IMPLEMENTATION_LOG.md` - Implementation Log
- `docs/REGRESSION_CHECKLIST.md` - Regression Tests
- `docs/DEV_GUIDE.md` - Development Guide

---

## 🧪 Pre-Commit Checklist

1. ✅ `node scripts/check-duplicates.mjs` → ✅
2. ✅ `node scripts/check-imports.mjs` → ✅
3. ✅ App bootet ohne SyntaxError
4. ✅ Smoke Tests bestehen

---

## ⚠️ Sidebar Sichtbarkeit (Fix!)

**WICHTIG:** Sidebar darf nie komplett unsichtbar sein!

- Wenn collapsed: Dock-Icons bleiben sichtbar + Toggle
- Es muss immer mindestens eine Möglichkeit geben, den Ressourcentyp zu wechseln

---

## 📝 Output-Template pro Phase

Nach jeder Phase:

### Was wurde umgesetzt (Kurz)
- 2-3 Sätze Beschreibung

### Dateien
**Neu:**
- `path/to/file.js` - Beschreibung

**Geändert:**
- `path/to/file.js` - Was geändert wurde

### Smoke Tests
- ✅ Boot: App startet ohne Errors
- ✅ Feature: Kernflow funktioniert
- ✅ RBAC: Admin/Worker Checks passen
- ✅ Reload: Daten persistieren

### Risiken / Next Steps
- Max 5 Bullet Points

---

**Ende Quick Reference**



