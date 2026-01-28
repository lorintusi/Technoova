# Boot-Fehler Behebung - Zusammenfassung

## Behobene Probleme

### 1. Doppelte Script-Tags entfernt
**Problem:** `index.html` lud database/*.js als non-module Scripts, die dann auch via ESM importiert wurden.

**Lösung:** 
- Entfernt alle `<script src="database/*.js">` Tags aus `index.html`
- Nur noch SQL.js wird als non-module geladen
- ESM-App (`app/index.js`) lädt database-Module via `import`

**Geänderte Datei:**
- `index.html`

### 2. CommonJS require() entfernt
**Problem:** Repositories/Services verwendeten `require()` als Fallback, was im Browser nicht funktioniert.

**Lösung:**
- Alle Repositories/Services zu ESM-Modulen konvertiert
- `require()` durch `import` ersetzt
- Legacy-Kompatibilität: `window.*` Exports für non-ESM Code

**Geänderte Dateien:**
- `database/db.js` - ESM exports (`export function dbQuery`, `export function dbExec`)
- `database/repositories/userRepository.js` - ESM imports
- `database/repositories/timeEntryRepository.js` - ESM imports
- `database/repositories/locationRepository.js` - ESM imports
- `database/services/authService.js` - ESM imports
- `database/services/timeEntryService.js` - ESM imports
- `database/services/adminService.js` - ESM imports
- `database/localApi.js` - ESM imports

### 3. Doppelte Deklarationen behoben
**Problem:** `const { query, execute } = window.dbModule || require('./db.js');` führte zu doppelten `query`/`execute` Deklarationen.

**Lösung:**
- Einheitliche DB-Funktionen: `dbQuery()` und `dbExec()` in `db.js`
- Alle Repositories importieren diese Funktionen via ESM
- Keine globalen Top-Level Namen mehr

**Geänderte Dateien:**
- `database/db.js` - Exportiert `dbQuery` und `dbExec` statt `query` und `execute`
- Alle Repositories - Importieren `dbQuery, dbExec` statt Destructuring

### 4. updatePlanningEntry Namenskonflikt behoben
**Problem:** `planningService.js` importierte `updatePlanningEntry` aus `actions.js` und exportierte auch eine Funktion mit demselben Namen.

**Lösung:**
- Import umbenannt: `updatePlanningEntry as updatePlanningEntryAction`
- Export umbenannt: `updatePlanningEntryService`
- Handler importiert als: `updatePlanningEntryService as updatePlanningEntry`

**Geänderte Dateien:**
- `app/services/planningService.js` - Import/Alias angepasst
- `app/handlers/planningEntryHandlers.js` - Import angepasst

### 5. SQL Schema-Split-Logik korrigiert
**Problem:** `db.js` splittete Schema naiv nach `;`, was zu abgeschnittenen Statements führte (z.B. "ON u", "ON user").

**Lösung:**
- Schema als Array kompletter Statements definiert (in korrekter Reihenfolge)
- CREATE TABLE Statements zuerst
- CREATE INDEX Statements danach
- Keine Split-Logik mehr, direkte Ausführung

**Geänderte Datei:**
- `database/db.js` - `runSchema()` verwendet jetzt Array von vollständigen Statements

### 6. API-Initialisierung in Bootstrap
**Problem:** `bootstrap.js` verwendete `api` ohne Initialisierung.

**Lösung:**
- `initApi()` Funktion erstellt
- Prüft `window.api` (localApi) oder lädt `localApi.js` via ESM
- Fallback zu `endpoints.js` (remote API)

**Geänderte Datei:**
- `app/bootstrap.js` - API-Initialisierung hinzugefügt

## Neue Struktur

### ESM-Module (Browser-kompatibel)
- `database/db.js` - DB-Initialisierung und Schema
- `database/repositories/*.js` - Datenzugriff
- `database/services/*.js` - Business Logic
- `database/localApi.js` - API-Wrapper

### Legacy-Kompatibilität
- Alle Module exportieren auch auf `window.*` für non-ESM Code
- `window.dbModule`, `window.userRepository`, etc. bleiben verfügbar

### Schema-Definition
- Schema als Array in `db.js` (nicht mehr aus `schema.sql` geladen)
- Vollständige Statements, keine Split-Logik
- Korrekte Reihenfolge: Tables → Indexes → Data

## Test-Checkliste

- [ ] Browser startet ohne SyntaxError
- [ ] Keine "require is not defined" Fehler
- [ ] Keine "already been declared" Fehler
- [ ] Local API initialisiert ohne Schema-Warnings
- [ ] Tabellen werden korrekt erstellt
- [ ] Indizes werden korrekt erstellt
- [ ] App init läuft weiter (Login/Views können getestet werden)

## Wichtige Hinweise

- **ESM-only:** Alle database-Module sind jetzt ESM-Module
- **Backward Compatibility:** `window.*` Exports bleiben für non-ESM Code
- **Schema:** Wird jetzt direkt in `db.js` definiert (nicht mehr aus `schema.sql` geladen)
- **API:** `bootstrap.js` initialisiert API automatisch (local oder remote)



