# Migration Notes - ESM Browser-Module Umstellung

## Neue Struktur

Die App wurde von einer monolithischen 9.277-Zeilen-Datei in Browser-ESM-Module überführt:

```
app/
├── index.js                 # Entry Point (ESM)
├── bootstrap.js             # Initialisierung + Session Check + Data Load
├── legacyBridge.js          # Kompatibilität: globale Namen bleiben erreichbar
├── api/
│   ├── client.js           # Low-level HTTP requests
│   └── endpoints.js        # Domain API (login/users/workers/...)
├── state/
│   ├── store.js            # Single source of truth state
│   ├── selectors.js        # State accessors (getActiveUserId etc.)
│   └── actions.js          # State mutations
├── utils/
│   ├── time.js             # Zeitberechnungen
│   ├── format.js           # Formatierung
│   ├── validators.js       # Validierung
│   └── dom.js              # DOM-Helper
├── views/
│   ├── renderApp.js        # Main orchestrator
│   ├── auth/
│   │   └── loginView.js    # Login rendering + handlers
│   ├── topbar.js           # Topbar view
│   ├── footer.js           # Footer view
│   ├── planning/
│   │   └── planningShell.js # Planning interface
│   └── management/
│       └── managementShell.js # Management interface
└── handlers/
    └── events.js           # Zentrale Event-Delegation
```

## Entry Point

**WICHTIG:** Die App muss über HTTP laufen (nicht `file://`), da Browser-ESM-Module CORS erfordern.

### Starten:

1. **Server starten:**
   ```bash
   node server.js
   ```
   Oder einen anderen HTTP-Server auf Port 8080.

2. **Browser öffnen:**
   ```
   http://localhost:8080
   ```

3. **Module werden geladen:**
   - `index.html` lädt zuerst SQL.js und Database-Scripts (non-module)
   - Dann wird `app/index.js` als ESM-Modul geladen
   - `app/index.js` importiert `bootstrap.js`
   - `bootstrap.js` initialisiert Legacy Bridge, Event-System und startet App

## Globals über Legacy Bridge

Die `legacyBridge.js` stellt folgende globale Namen bereit:

### API:
- `window.api` - API-Endpunkte (kompatibel mit alter API)

### State (Proxy-Objekte):
- `window.data` - Datenstruktur (getter/setter auf Store)
- `window.workflowState` - Workflow-State (Proxy)
- `window.uiState` - UI-State (Proxy)
- `window.timeEntryState` - Time Entry State (Proxy)
- `window.timeEntryWizardState` - Wizard State (Proxy)
- `window.weekPlanningState` - Week Planning State (Proxy)

### Render-Funktionen:
- `window.renderApp()` - Haupt-Render-Funktion
- `window.renderLogin()` - Login-View
- `window.renderTopbar()` - Topbar
- `window.renderFooter()` - Footer
- `window.renderPlanningShell()` - Planning Shell
- `window.renderManagementShell()` - Management Shell
- `window.renderTimeEntryModal()` - Time Entry Modal (noch aus altem app.js)
- `window.renderTimeEntryWizard()` - Time Entry Wizard (noch aus altem app.js)
- `window.renderEmployeeCalendarModal()` - Employee Calendar Modal (noch aus altem app.js)

### Utility-Funktionen:
- Alle Zeit-Funktionen: `parseHHMMToMinutes`, `durationMinutes`, `entryHours`, etc.
- Alle Format-Funktionen: `formatDate`, `formatDateTime`, `getDayName`, etc.
- Validatoren: `validateTimeEntry`, `norm`
- DOM-Helper: `getCurrentDate`, `cloneAndReplaceElement`

### Selectors:
- `window.getActiveUser()`
- `window.getActiveWorkerId()`
- `window.getActiveUserId()`
- `window.getCalendarViewUserId()`
- `window.getDefaultWorkHours()`

### Store:
- `window.store` - Store-Objekt
- `window.getState()` - State lesen

## Render/Bind Zyklus

1. **Render:** `renderApp()` rendert HTML in `#app`
2. **Bind:** Event-Delegation wird über `handlers/events.js` gebunden (einmalig beim Start)
3. **Keine mehrfachen Bindings:** Event-Delegation verhindert Duplikate

### Event-Delegation:

```javascript
import { on } from './handlers/events.js';

// Statt:
document.getElementById('button').addEventListener('click', handler);

// Jetzt:
on('click', '#button', handler);
```

Das System verwendet einen einzigen Event-Listener pro Event-Type auf dem Root-Element und matched dann mit `closest(selector)`.

## State Management

Zentraler State Store:

```javascript
import { getState, setState } from './state/store.js';

// State lesen
const state = getState();
const currentUser = state.data.currentUser;

// State ändern
setState({
  ui: {
    ...getState().ui,
    activeMode: 'plan'
  }
});
```

## Bootstrap-Zyklus

1. **Legacy Bridge Setup** - Globale Namen bereitstellen
2. **Event-Delegation binden** - Einmalig beim Start
3. **Global Handlers binden** - View-Switch, Logout, etc.
4. **Session Check** - Prüft ob User eingeloggt ist
5. **Data Load** - Lädt alle Daten wenn Session vorhanden
6. **Render App** - Zeigt Login oder App Shell

## Migration-Status

### ✅ Abgeschlossen:
- ESM-Struktur erstellt
- Legacy Bridge implementiert
- Event-Delegation System
- Bootstrap-Zyklus
- Views extrahiert: renderApp, loginView, topbar, footer, planningShell, managementShell
- Login-Flow funktioniert
- View-Switch funktioniert

### 🔄 In Arbeit:
- Weitere Views extrahieren (renderActiveView, calendar views, etc.)
- Modal-Funktionen migrieren
- Weitere Handler migrieren

### 📝 Noch zu migrieren:
- Calendar Views (year/month/week/day)
- Time Entry Modal/Wizard komplett
- Management Views (User Management, etc.)
- Alle weiteren Handler

## Smoke-Tests (Manuelle Checkliste)

### ✅ App startet:
- [ ] Browser-Konsole zeigt keine Fehler beim Laden
- [ ] `[Bootstrap] Application modules initialized` erscheint
- [ ] `[LegacyBridge] Legacy compatibility layer initialized` erscheint

### ✅ Login:
- [ ] Login-View wird angezeigt wenn nicht eingeloggt
- [ ] Login-Formular ist sichtbar
- [ ] Submit-Button funktioniert
- [ ] Bei erfolgreichem Login wird App Shell angezeigt
- [ ] Bei fehlerhaftem Login wird Fehlermeldung angezeigt

### ✅ View-Switch:
- [ ] Topbar zeigt "Planen" und "Verwalten" Tabs (wenn Berechtigung)
- [ ] Klick auf "Planen" wechselt zu Planning Shell
- [ ] Klick auf "Verwalten" wechselt zu Management Shell
- [ ] Keine Doppelklicks/Double-Fire (nur einmaliger Wechsel)

### ✅ Navigation:
- [ ] Planning Shell zeigt Kalender-View-Mode Switcher
- [ ] Klick auf View-Mode Buttons ändert Ansicht (wenn implementiert)
- [ ] Keine mehrfachen Event-Firings

### ⚠️ Bekannte Einschränkungen:
- `renderActiveView` kommt noch aus altem app.js (wird später migriert)
- Modals kommen noch aus altem app.js (wird später migriert)
- Viele Handler kommen noch aus altem app.js (werden später migriert)

## Kompatibilität

Die Legacy Bridge stellt sicher, dass:
- Alter Code weiterhin funktioniert
- Globale Funktionen verfügbar sind
- State-Zugriff funktioniert
- API-Calls funktionieren

Die Migration kann schrittweise erfolgen - alte und neue Module können parallel existieren.

## Troubleshooting

### Module-Loading-Fehler:
- **Problem:** CORS-Fehler beim Laden von Modulen
- **Lösung:** App muss über HTTP laufen (nicht file://), z.B. `http://localhost:8080`

### Funktion nicht gefunden:
- **Problem:** `window.renderApp is not a function`
- **Lösung:** Legacy Bridge muss vor dem Aufruf initialisiert sein (passiert automatisch in bootstrap.js)

### Doppelte Events:
- **Problem:** Event wird mehrfach gefeuert
- **Lösung:** Event-Delegation sollte verwendet werden statt direkter addEventListener

### State nicht aktualisiert:
- **Problem:** State-Änderungen werden nicht übernommen
- **Lösung:** `setState()` verwenden statt direkter Mutation
