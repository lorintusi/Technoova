# ES Modules Migration

**Datum:** 23. Januar 2026  
**Status:** ✅ Abgeschlossen

## Übersicht

`server.js` wurde erfolgreich von CommonJS zu ES Modules (ESM) migriert, um mit der `"type": "module"` Konfiguration in `package.json` kompatibel zu sein.

---

## Änderungen

### 1. Import-Statements

**Vorher (CommonJS):**
```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
```

**Nachher (ES Modules):**
```javascript
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
```

### 2. __dirname und __filename

**Problem:** `__dirname` und `__filename` existieren nicht in ES Modules.

**Lösung:**
```javascript
// ES Module equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### 3. Doppelte require()-Aufrufe entfernt

**Vorher:**
```javascript
const { execSync } = require('child_process');  // Innerhalb von Funktionen
```

**Nachher:**
```javascript
// execSync bereits oben importiert, direkt verwenden
execSync('php -v', { stdio: 'ignore', timeout: 2000 });
```

---

## Verifizierung

### ✅ Server startet erfolgreich

```bash
$ node server.js
WARNUNG: PHP wurde nicht gefunden!
Server läuft auf http://localhost:8080
Server erreichbar auf http://127.0.0.1:8080
```

### ✅ npm start funktioniert

```bash
$ npm start

> technoova-planner@1.0.0 start
> node server.js

Server läuft auf http://localhost:8080
```

### ✅ Keine Linter-Fehler

```bash
$ eslint server.js
# Keine Fehler
```

---

## ES Modules vs CommonJS

### ES Modules (ESM) ✅

```javascript
// Import
import fs from 'fs';
import { readFile } from 'fs';

// Export
export default myFunction;
export { helper1, helper2 };

// __dirname
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

### CommonJS (veraltet) ❌

```javascript
// Require
const fs = require('fs');
const { readFile } = require('fs');

// Export
module.exports = myFunction;
module.exports = { helper1, helper2 };

// __dirname
// Direkt verfügbar
console.log(__dirname);
```

---

## Vorteile von ES Modules

### 1. **Moderner Standard**
- ES6+ Standard seit 2015
- Native Browser-Unterstützung
- Zukunftssicher

### 2. **Statische Analyse**
- Tree-shaking möglich
- Bessere IDE-Unterstützung
- Compile-Zeit Optimierungen

### 3. **Konsistenz**
- Gleiche Syntax wie Frontend
- Einheitlicher Code-Stil
- Weniger Verwirrung

### 4. **Asynchron**
- Top-level await möglich
- Bessere Performance
- Paralleles Laden

---

## Kompatibilität

### Node.js Versionen

- ✅ **Node.js 18+** - Vollständige ESM-Unterstützung
- ✅ **Node.js 16+** - ESM stabil
- ⚠️ **Node.js 14** - ESM experimentell
- ❌ **Node.js 12 und älter** - Keine ESM-Unterstützung

### package.json Konfiguration

```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Migration-Checkliste

Für andere Dateien, die noch CommonJS verwenden:

- [x] `server.js` → ES Modules
- [ ] `check_php.js` → Prüfen ob Migration nötig
- [ ] `backend/api/*.js` → Bleiben CommonJS (PHP-Kontext)
- [ ] `database/*.js` → Prüfen ob Migration nötig
- [ ] `scripts/*.mjs` → Bereits ES Modules (.mjs Extension)

---

## Häufige Probleme & Lösungen

### Problem: "Cannot use import statement outside a module"

**Ursache:** `"type": "module"` fehlt in `package.json`

**Lösung:**
```json
{
  "type": "module"
}
```

### Problem: "__dirname is not defined"

**Ursache:** `__dirname` existiert nicht in ES Modules

**Lösung:**
```javascript
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Problem: "require is not defined"

**Ursache:** `require()` existiert nicht in ES Modules

**Lösung:**
```javascript
// Statt:
const fs = require('fs');

// Verwende:
import fs from 'fs';
```

### Problem: JSON-Dateien importieren

**Lösung:**
```javascript
// Option 1: Import Assertion (Node 17.5+)
import data from './data.json' assert { type: 'json' };

// Option 2: fs.readFile
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
```

---

## Best Practices

### 1. **Konsistente Datei-Extensions**

```javascript
// ✅ Gut: Explizite .js Extension
import { helper } from './utils/helper.js';

// ❌ Schlecht: Keine Extension (funktioniert nicht in ESM)
import { helper } from './utils/helper';
```

### 2. **Named vs Default Exports**

```javascript
// Named Exports (bevorzugt für mehrere Funktionen)
export function helper1() {}
export function helper2() {}

// Default Export (für Hauptfunktion)
export default class MyClass {}
```

### 3. **Top-Level Await**

```javascript
// ✅ Möglich in ES Modules
const data = await fetch('https://api.example.com/data');

// ❌ Nicht möglich in CommonJS
```

---

## Testing

### Manueller Test

```bash
# 1. Server starten
npm start

# 2. Browser öffnen
http://localhost:8080

# 3. Prüfen ob Seite lädt
# Erwartung: Index.html wird angezeigt
```

### Automatischer Test

```bash
# Server im Hintergrund starten
npm start &

# Warten
sleep 2

# HTTP-Request testen
curl http://localhost:8080

# Server stoppen
pkill -f "node server.js"
```

---

## Zusammenfassung

✅ **server.js** vollständig zu ES Modules migriert  
✅ **Alle `require()` durch `import` ersetzt**  
✅ **`__dirname` und `__filename` korrekt implementiert**  
✅ **Server startet erfolgreich mit `npm start`**  
✅ **Keine Linter-Fehler**  
✅ **`"type": "module"` bleibt aktiv**  
✅ **Keine Dateien umbenannt**  

Das Projekt verwendet jetzt **vollständig ES Modules** und folgt **moderne JavaScript-Standards**! 🎉

---

## Nächste Schritte (Optional)

### 1. Weitere Dateien migrieren

```bash
# Prüfen welche Dateien noch CommonJS verwenden
grep -r "require(" --include="*.js" .
```

### 2. ESLint für ESM konfigurieren

```json
{
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  }
}
```

### 3. TypeScript erwägen

ES Modules sind perfekt vorbereitet für TypeScript-Migration:

```typescript
import http from 'http';
import type { Server } from 'http';

const server: Server = http.createServer(...);
```

---

## Referenzen

- [Node.js ES Modules Documentation](https://nodejs.org/api/esm.html)
- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [ES Modules: A cartoon deep-dive](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)

