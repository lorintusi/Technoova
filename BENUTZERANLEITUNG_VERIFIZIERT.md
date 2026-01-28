# Technoova Planner – Verifizierte Benutzeranleitung

**Stand:** 2026-01-23  
**Methode:** 100% Code-basiert (keine Annahmen)  
**Projekt-Version:** Node.js Backend (kein PHP)

---

## 🔍 PHASE A: Was die App heute wirklich kann (Code-verifiziert)

### ✅ Authentifizierung
- **Login-Screen** mit Benutzername/Passwort  
  *Quelle:* `frontend/src/views/auth/loginView.js` (Zeile 40-72)
- **Standard-Credentials:**
  - `admin` / `010203` (Rolle: Admin)  
  - `test1` / `010203` (Rolle: Worker)  
  *Quelle:* `server.js` (Zeile 263)
- **Session-Management:** Automatischer 401-Redirect bei ungültiger Session  
  *Quelle:* `frontend/src/utils/authGuard.js`

### ✅ Navigation & UI-Modi

#### Hauptmodi (Topbar)
1. **"Planen"** – Kalender- und Ressourcenplanung  
   *Quelle:* `frontend/src/views/topbar.js` (Zeile 33)
2. **"Verwalten"** – Stammdatenverwaltung (nur Admin)  
   *Quelle:* `frontend/src/views/topbar.js` (Zeile 36)

#### Kalenderansichten (im "Planen"-Modus)
- **Tag** (📋 Tag)  
  *Quelle:* `frontend/src/views/planning/calendarHeader.js` (Zeile 106-113)
- **Woche** (📆 Woche)  
  *Quelle:* `frontend/src/views/planning/calendarHeader.js` (Zeile 114-121)
- **Monat** (📅 Monat)  
  *Quelle:* `frontend/src/views/planning/calendarHeader.js` (Zeile 122-129)

**WICHTIG:** Es gibt KEINE Jahresansicht im Code (trotz UI-State-Definition).

#### Verwaltungs-Tabs (im "Verwalten"-Modus)
1. **👥 Benutzer** – Benutzerverwaltung  
2. **🏗️ Baustellen** – Standorte/Locations  
3. **🚗 Fahrzeuge** – Fahrzeug-Stammdaten  
4. **🔧 Geräte** – Geräte-Stammdaten  
5. **🏥 Arztzeugnisse** – Medizinische Atteste  
6. **📝 TODOs** – Notizen und Aufgaben  
*Quelle:* `frontend/src/views/management/managementShell.js` (Zeile 144-161)

### ✅ Verfügbare Funktionen nach Rolle

#### Admin (role: 'Admin')
- ✅ Zugriff auf "Planen" UND "Verwalten"  
  *Quelle:* `frontend/src/views/topbar.js` (Zeile 17, 34-38)
- ✅ Teamkalender anzeigen (Button "👥 Teamkalender")  
  *Quelle:* `frontend/src/views/planning/calendarHeader.js` (Zeile 158-165)
- ✅ Einsatz erstellen (Button "+ Einsatz")  
  *Quelle:* `frontend/src/views/planning/calendarHeader.js` (Zeile 181-189)
- ✅ Alle Ressourcen verwalten (CRUD für Benutzer, Baustellen, Fahrzeuge, Geräte, Arztzeugnisse, TODOs)

#### Worker (role: 'Worker')
- ✅ Zugriff nur auf "Planen"  
  *Quelle:* `frontend/src/views/topbar.js` (Zeile 34-38, Button "Verwalten" fehlt wenn nicht `manage_users` Permission)
- ⛔ KEIN Zugriff auf "Verwalten"
- ⛔ KEIN Teamkalender
- ⛔ KEIN Einsatz erstellen
- ✅ Eigene Planung einsehen  
  *Quelle:* `frontend/src/utils/permissions.js` (Zeile 62-75)

### ✅ API-Endpoints (vollständig implementiert)

**Authentifizierung:**
- `POST /backend/api/auth` (Login)  
- `GET /backend/api/me` (Session-Check)

**Ressourcen (CRUD):**
- `/backend/api/users`
- `/backend/api/workers`
- `/backend/api/teams`
- `/backend/api/locations`
- `/backend/api/assignments`
- `/backend/api/week_planning`
- `/backend/api/time_entries`
- `/backend/api/medical_certificates`
- `/backend/api/vehicles`
- `/backend/api/devices`
- `/backend/api/dispatch_items`
- `/backend/api/dispatch_assignments`
- `/backend/api/todos`

**Spezial-Endpoints:**
- `POST /backend/api/time_entries/confirm_day` (Tag bestätigen)  
- `POST /backend/api/dispatch_items/confirm_day` (Dispo-Tag bestätigen)  
- `GET /backend/api/admin/overview/week` (Admin-Übersicht)

*Quelle:* `frontend/src/api/endpoints.js` + `server.js` (handleAPI-Funktion)

### ✅ Datenpersistenz
- **File-based Storage:** JSON-Dateien in `/data/` Verzeichnis  
  *Quelle:* `server.js` (Zeile 11-62)
- **Automatisches Speichern:** Bei jedem POST/PUT/DELETE  
- **Laden beim Start:** Alle Daten werden aus `/data/*.json` geladen  
- **⚠️ Wichtig:** Daten überleben Server-Neustarts (nicht mehr in-memory)

---

## 📖 PHASE B: Benutzeranleitung (mit exakten UI-Texten)

### 1. App starten (Windows PowerShell)

```powershell
# Im Projektverzeichnis
cd C:\Users\Startklar\OneDrive\Desktop\app.technoova.ch

# Server starten
npm start

# Erwartete Ausgabe:
# ✓ Loaded users: 2 items
# ✓ Loaded workers: 4 items
# ...
# ✓ Server läuft auf http://localhost:8080
```

**Browser öffnen:** http://localhost:8080

---

### 2. Anmeldung

**Login-Screen:**
- **Benutzername:** `admin` (für Admin-Zugang) oder `test1` (für Worker-Zugang)
- **Passwort:** `010203`
- Button: **"Anmelden"**

*UI-Text verifiziert in:* `frontend/src/views/auth/loginView.js` (Zeile 35-36, 42-63, 66)

**Bei Fehler:**
- Fehlermeldung erscheint in roter Box über dem Button
- Mögliche Fehler:
  - "Bitte Benutzername und Passwort eingeben"
  - "Verbindung zum Server fehlgeschlagen. Bitte überprüfen Sie, ob der Server läuft."

---

### 3. Hauptoberfläche nach Login

#### Topbar (oben)
- **Logo:** "technova" (links)
- **Navigation-Tabs:**
  - Button: **"Planen"** (immer sichtbar)
  - Button: **"Verwalten"** (nur für Admin)
- **Rechts:**
  - Vollbild-Button (Quadrat-Icon)
  - Aktuelles Datum (z.B. "Donnerstag, 23. Januar 2026")
  - User-Chip: Avatar + Name + Rolle
    - Dropdown-Menü: Button **"Abmelden"**

*UI-Text verifiziert in:* `frontend/src/views/topbar.js` (Zeile 20-83)

---

### 4. "Planen"-Modus (Kalender)

#### Header-Bereich

**Ansichts-Tabs (links):**
- Button: **"📋 Tag"** (Tagesansicht)
- Button: **"📆 Woche"** (Wochenansicht)
- Button: **"📅 Monat"** (Monatsansicht)

*UI-Text verifiziert in:* `frontend/src/views/planning/calendarHeader.js` (Zeile 106-129)

**Navigations-Bereich (Mitte):**
- Button: **"‹"** (Vorheriger Tag/Woche/Monat)
- **Aktueller Bereich:** z.B. "KW 5 - 27.1. - 2.2. 2026" (bei Wochenansicht)
- Button: **"›"** (Nächster Tag/Woche/Monat)
- Button: **"Heute"**

*UI-Text verifiziert in:* `frontend/src/views/planning/calendarHeader.js` (Zeile 135-154)

**Aktionen (rechts, nur Admin):**
- Button: **"👥 Teamkalender"** (Admin only)  
  *Quelle:* Zeile 158-165
- Button: **"📝 Notizen"** (Alle Benutzer)  
  *Quelle:* Zeile 174-180
- Button: **"+ Einsatz"** (Admin only)  
  *Quelle:* Zeile 181-189

#### Funktionen im Planen-Modus

**[UNBESTÄTIGT]** – Die genaue Funktionsweise der Kalenderansichten (Drag&Drop, Zuweisung, etc.) ist nicht aus den View-Dateien ersichtlich ohne weitere Code-Analyse. Folgende Handler sind vorhanden:

*Verfügbare Handler (verifiziert):*
- `planningHandlers.js` – Planungs-Events
- `dragDropHandlers.js` – Drag & Drop
- `calendarNavHandlers.js` – Kalender-Navigation
- `assignmentDragDropHandlers.js` – Zuweisung-Drag&Drop
- `dispatchHandlers.js` – Dispatch-Events

*Quelle:* `frontend/src/bootstrap.js` (Zeile 325-366)

---

### 5. "Verwalten"-Modus (nur Admin)

#### Tab-Leiste
*UI-Text verifiziert in:* `frontend/src/views/management/managementShell.js` (Zeile 143-162)

**Tab 1: 👥 Benutzer**
- **Header:** "Benutzerverwaltung"
- **Beschreibung:** "Rollen vergeben, Berechtigungen anpassen und Accounts verwalten."
- **Button:** "+ Personal hinzufügen"
- **Tabelle mit Spalten:**
  - Name
  - Rolle
  - Berechtigungen
  - Letzter Login

*Quelle:* Zeile 110-136

**Tab 2: 🏗️ Baustellen**
- Baustellen/Standorte verwalten
- *Implementierung in:* `frontend/src/views/management/locationManagementView.js`

**Tab 3: 🚗 Fahrzeuge**
- Fahrzeug-Stammdaten
- *Implementierung in:* `frontend/src/views/management/vehicleManagementView.js`

**Tab 4: 🔧 Geräte**
- Geräte/Werkzeuge
- *Implementierung in:* `frontend/src/views/management/deviceManagementView.js`

**Tab 5: 🏥 Arztzeugnisse**
- Medizinische Atteste hochladen/verwalten
- *Implementierung in:* `frontend/src/views/management/medicalCertificatesView.js`

**Tab 6: 📝 TODOs**
- Notizen und Aufgaben
- *Implementierung in:* `frontend/src/views/management/todoManagementView.js`

---

### 6. Abmelden

1. Klicke auf **User-Chip** (rechts oben)
2. Dropdown öffnet sich
3. Klicke auf Button **"Abmelden"**
4. App kehrt zurück zum Login-Screen

*UI-Text verifiziert in:* `frontend/src/views/topbar.js` (Zeile 73-78)

---

## 📋 PHASE C: Abweichungen zur bisherigen Anleitung

### ❌ Folgendes war ERFUNDEN (nicht im Code):

1. **"Jahresansicht"** – Existiert NICHT als Button/View  
   - State definiert `calendarViewMode: "year"`, aber kein UI-Element vorhanden
   - *Quelle:* `frontend/src/views/planning/calendarHeader.js` (nur Tag/Woche/Monat)

2. **"Dispo-Modul"** als separate Sidebar-Navigation – Existiert NICHT  
   - Dispo ist integriert in Kalenderansicht (Dispatch Items)
   - Keine separate "Dispo"-Navigation im Sidebar

3. **"Berichte-Modul"** – Existiert NICHT  
   - Kein Tab, keine Route, keine View für Reports
   - Nur Admin-Overview-Endpoint vorhanden

4. **"Zeiterfassung-Modul"** als separates Modul – UNKLAR  
   - Zeiteinträge existieren (API-Endpoint vorhanden)
   - Aber keine dedizierte Navigation/View nachweisbar

5. **"Projekt auswählen"** im Workflow – UNKLAR  
   - Locations (Baustellen) existieren
   - Aber genaue UI-Interaktion nicht verifiziert ohne Render-Analyse

6. **Rollen "Disponent"/"Viewer"** – NUR teilweise vorhanden  
   - Code definiert nur: `Admin` und `Worker`  
   - *Quelle:* `server.js` (Zeile 89, 100)
   - `managementShell.js` erwähnt "Dispatcher" und "Viewer" (Zeile 22-25), aber diese sind NICHT in Mock-Daten

### ⚠️ Folgendes war UNVOLLSTÄNDIG:

1. **Login-Credentials** – Waren korrekt genannt, aber nicht verifiziert
2. **Tab-Namen** – Teilweise korrekt, aber Icons fehlten
3. **Persistenz** – War als "in-memory" beschrieben, ist aber jetzt file-based

---

## 🔍 PHASE D: TODO/UNBESTÄTIGT – Was muss noch geprüft werden?

### Offene Fragen (Code-Analyse erforderlich):

1. **Wie funktioniert die Kalender-Interaktion genau?**
   - Wo im Code wird Drag&Drop initiiert?
   - Welche Daten werden angezeigt (Mitarbeiter? Baustellen? Beide?)?
   - *Zu prüfen:* `frontend/src/views/planning/weekViewDispatch.js`

2. **Zeiterfassung: Gibt es eine dedizierte UI?**
   - API-Endpoint existiert (`/time_entries`)
   - Handler existiert (`timeEntryHandlers.js`?)
   - Aber wo ist die View/Modal?
   - *Zu prüfen:* Suche nach `TimeEntry` in Views

3. **Was macht "Notizen"-Button genau?**
   - Button existiert im Header
   - `data-action="open-notes-modal"`
   - *Zu prüfen:* Handler für diese Action + Modal-Code

4. **Admin-Übersicht: Wo wird sie angezeigt?**
   - Endpoint: `GET /backend/api/admin/overview/week`
   - Aber keine dedizierte View gefunden
   - *Zu prüfen:* Wird sie in Sidebar angezeigt?

5. **Teamkalender: Was zeigt er genau?**
   - Button existiert, View existiert (`teamCalendarView.js`)
   - Aber Inhalt/Darstellung nicht analysiert
   - *Zu prüfen:* `frontend/src/views/planning/teamCalendarView.js`

6. **Medical Certificates: Upload-Workflow?**
   - API unterstützt FormData-Upload
   - *Zu prüfen:* `frontend/src/views/management/medicalCertificatesView.js`

7. **Dispatch Items: Was ist der Unterschied zu Planning Entries?**
   - Beide existieren im State
   - Dispatch scheint primär zu sein
   - *Zu prüfen:* Datenmodelle + Verwendung

8. **Worker vs. User: Beziehung?**
   - User hat `worker_id` (kann null sein)
   - Worker ist separate Entität
   - *Zu prüfen:* Wie hängen sie zusammen? Ist jeder User ein Worker?

---

## 🚀 Quick Start (10 Schritte, verifiziert)

1. **Terminal öffnen:** PowerShell in Projektverzeichnis
2. **Server starten:** `npm start`
3. **Browser öffnen:** http://localhost:8080
4. **Login:** `admin` / `010203`
5. **Hauptansicht:** Du siehst "Planen"-Tab aktiv
6. **Kalender-Ansicht wählen:** Klicke "📆 Woche" (Standard)
7. **Navigation:** Nutze "‹" / "›" oder "Heute"
8. **Verwaltung öffnen:** Klicke "Verwalten"-Tab (oben)
9. **Tab wählen:** z.B. "👥 Benutzer"
10. **Abmelden:** User-Chip → "Abmelden"

---

## 🗺️ Mapping-Tabelle: UI → Code

| UI-Element | Route/State | Komponente/View | Datei |
|------------|-------------|-----------------|-------|
| **"Planen"-Button** | `state.ui.activeMode = 'plan'` | renderPlanningShell() | `frontend/src/views/planning/planningShell.js` |
| **"Verwalten"-Button** | `state.ui.activeMode = 'manage'` | renderManagementShell() | `frontend/src/views/management/managementShell.js` |
| **"📋 Tag"** | `state.ui.calendarViewMode = 'day'` | renderDayView() | `frontend/src/views/planning/dayView.js` |
| **"📆 Woche"** | `state.ui.calendarViewMode = 'week'` | renderWeekViewDispatch() | `frontend/src/views/planning/weekViewDispatch.js` |
| **"📅 Monat"** | `state.ui.calendarViewMode = 'month'` | renderMonthViewDispatch() | `frontend/src/views/planning/monthViewDispatch.js` |
| **"👥 Benutzer"** | `state.ui.managementTab = 'users'` | Inline in managementShell | `frontend/src/views/management/managementShell.js` (Zeile 110-136) |
| **"🏗️ Baustellen"** | `state.ui.managementTab = 'locations'` | renderLocationManagementView() | `frontend/src/views/management/locationManagementView.js` |
| **"🚗 Fahrzeuge"** | `state.ui.managementTab = 'vehicles'` | renderVehicleManagementView() | `frontend/src/views/management/vehicleManagementView.js` |
| **"🔧 Geräte"** | `state.ui.managementTab = 'devices'` | renderDeviceManagementView() | `frontend/src/views/management/deviceManagementView.js` |
| **"🏥 Arztzeugnisse"** | `state.ui.managementTab = 'medical'` | renderMedicalCertificatesView() | `frontend/src/views/management/medicalCertificatesView.js` |
| **"📝 TODOs"** | `state.ui.managementTab = 'todos'` | renderTodoManagementView() | `frontend/src/views/management/todoManagementView.js` |
| **"Abmelden"** | Logout-Handler | setState → renderApp() | `frontend/src/bootstrap.js` (Zeile 308-322) |
| **Login-Form** | – | renderLogin() | `frontend/src/views/auth/loginView.js` |

---

## 📊 State-Flow (Vereinfacht)

```
Initialisierung (bootstrap.js)
    ↓
Login? → Nein → renderLogin()
    ↓ Ja
loadAllData() → Daten aus API laden
    ↓
renderApp()
    ↓
state.ui.activeMode?
    ├─ 'plan' → renderPlanningShell()
    │             ↓
    │        calendarViewMode?
    │          ├─ 'day' → renderDayView()
    │          ├─ 'week' → renderWeekViewDispatch()
    │          └─ 'month' → renderMonthViewDispatch()
    │
    └─ 'manage' → renderManagementShell()
                    ↓
                 managementTab?
                   ├─ 'users' → Inline Tabelle
                   ├─ 'locations' → renderLocationManagementView()
                   ├─ 'vehicles' → renderVehicleManagementView()
                   ├─ 'devices' → renderDeviceManagementView()
                   ├─ 'medical' → renderMedicalCertificatesView()
                   └─ 'todos' → renderTodoManagementView()
```

---

## 🔐 Rollen-Matrix (Code-verifiziert)

| Funktion | Admin | Worker |
|----------|-------|--------|
| Login | ✅ | ✅ |
| "Planen"-Modus | ✅ | ✅ |
| Kalenderansicht (Tag/Woche/Monat) | ✅ | ✅ |
| "Verwalten"-Tab sichtbar | ✅ | ⛔ |
| Benutzer verwalten | ✅ | ⛔ |
| Baustellen verwalten | ✅ | ⛔ |
| Fahrzeuge/Geräte verwalten | ✅ | ⛔ |
| Arztzeugnisse verwalten | ✅ | ⛔ |
| TODOs verwalten | ✅ | ⛔ |
| Teamkalender-Button | ✅ | ⛔ |
| "+ Einsatz"-Button | ✅ | ⛔ |
| Notizen-Button | ✅ | ✅ |
| Eigene Planung ansehen | ✅ | ✅ |
| Fremde Planung ansehen | ✅ | ⛔ |

*Quelle:* `frontend/src/utils/permissions.js` + `frontend/src/views/topbar.js`

---

## 🎯 Zusammenfassung

### Was SICHER funktioniert (Code-verifiziert):
- ✅ Login mit admin/010203 oder test1/010203
- ✅ Zwei Hauptmodi: "Planen" und "Verwalten"
- ✅ Drei Kalenderansichten: Tag, Woche, Monat
- ✅ Sechs Verwaltungs-Tabs (nur Admin)
- ✅ Rollen-basierte Zugriffskontrolle (Admin vs. Worker)
- ✅ File-basierte Datenpersistenz (überlebt Neustarts)
- ✅ Vollständige REST-API (14 Ressourcen)

### Was UNKLAR ist (weitere Analyse nötig):
- ⚠️ Genaue Kalender-Interaktion (Drag&Drop-Workflow)
- ⚠️ Zeiterfassung-UI (existiert API, aber wo ist die View?)
- ⚠️ Admin-Übersicht-Anzeige
- ⚠️ Teamkalender-Inhalt
- ⚠️ Notizen-Modal-Funktion

### Was NICHT existiert (trotz Vermutungen):
- ❌ Jahresansicht
- ❌ Separates "Dispo"-Modul
- ❌ Berichte-Modul
- ❌ Rolle "Disponent" (nur im Code-Kommentar, nicht in Daten)

---

**Ende der verifizierten Dokumentation**

