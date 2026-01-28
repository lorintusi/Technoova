# Development Guide

## State Management Rules

### 1. Exports nur einmal
**Regel:** Jede Funktion/Konstante darf nur **einmal** exportiert werden.

**Beispiel (❌ FALSCH):**
```javascript
// app/state/selectors.js
export function getActiveUser() { ... }
// ... später im selben File ...
export function getActiveUser() { ... } // ❌ DUPLIKAT!
```

**Beispiel (✅ RICHTIG):**
```javascript
// app/state/selectors.js
export function getActiveUser() { ... } // ✅ Einmalig
```

**Check:** Run `node scripts/check-duplicates.mjs` vor jedem Commit.

### 2. Imports nur über state/index.js
**Regel:** Alle State-Imports müssen über `../state/index.js` (oder relative Pfade) erfolgen.

**Beispiel (❌ FALSCH):**
```javascript
import { getState } from '../state/store.js';
import { setAuth } from '../state/actions.js';
import { getActiveUser } from '../state/selectors.js';
```

**Beispiel (✅ RICHTIG):**
```javascript
import { getState, setAuth, getActiveUser } from '../state/index.js';
```

**Ausnahme:** `legacyBridge.js` und die State-Dateien selbst (`store.js`, `actions.js`, `selectors.js`) dürfen direkt importieren.

**Check:** Run `node scripts/check-imports.mjs` vor jedem Commit.

### 3. Neue Selectors aufbauen
**Regel:** Neue Selectors sollten auf bestehenden Selectors oder `getStatePath()` aufbauen.

**Beispiel (✅ RICHTIG):**
```javascript
// app/state/selectors.js

// Basis-Selector nutzen
export function getMedicalCertificates() {
  return getStatePath('data.medicalCertificates') || [];
}

// Auf Basis-Selector aufbauen
export function getMedicalCertificateByPlanningEntryId(planningEntryId) {
  const certificates = getMedicalCertificates(); // ✅ Nutzt bestehenden Selector
  return certificates.find(c => c.planningEntryId === planningEntryId) || null;
}
```

## Pre-Commit Checklist

1. ✅ `node scripts/check-duplicates.mjs` - keine Duplikate
2. ✅ `node scripts/check-imports.mjs` - alle Imports über index.js
3. ✅ App bootet ohne SyntaxError
4. ✅ Funktionale Tests: Medical certificate badges funktionieren

## File Structure

```
app/
  state/
    index.js      ← Barrel Export (Public API)
    store.js      ← State Store (nur intern)
    actions.js    ← State Mutations (nur intern)
    selectors.js  ← State Accessors (nur intern)
```

**Wichtig:** Nur `index.js` sollte von außen importiert werden.



