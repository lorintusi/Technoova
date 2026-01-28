# Technoova Dispo Planner

Moderne Dispositions- und Planungs-App für Baustellen, Personal, Fahrzeuge und Geräte.

**Tech Stack:** Vanilla JavaScript (ES Modules) + PHP REST API + MySQL/MariaDB

---

## 🚀 Quick Start

### Voraussetzungen

- **PHP 8.0+** (mit PDO MySQL Extension)
- **MySQL 8.0+** oder **MariaDB 10.5+**
- **Node.js 18+** (nur für lokalen Dev-Server)

### Installation

1. **Repository klonen**
   ```bash
   git clone <repo-url>
   cd app.technoova.ch
   ```

2. **Datenbank einrichten**
   ```bash
   # MySQL/MariaDB starten
   mysql -u root -p
   
   # Datenbank erstellen und Schema importieren
   mysql -u root -p < backend/database.sql
   ```

3. **Backend-Konfiguration**
   
   Öffne `backend/config.php` und passe die Datenbank-Zugangsdaten an:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'loomone_db');
   define('DB_USER', 'your_db_user');
   define('DB_PASS', 'your_db_password');
   ```

4. **Server starten**
   
   **Option A: Node.js Dev-Server (empfohlen für Entwicklung)**
   ```bash
   node server.js
   ```
   → App läuft auf `http://localhost:8080`
   
   **Option B: PHP Built-in Server**
   ```bash
   php -S localhost:8080
   ```

5. **App öffnen**
   
   Browser: `http://localhost:8080`
   
   **Standard-Login:**
   - Benutzername: `admin`
   - Passwort: `admin123` (bitte nach erstem Login ändern!)

---

## 📁 Projekt-Struktur

```
app.technoova.ch/
├── app/                      # Frontend (Vanilla JS ESM)
│   ├── api/                  # API Client (HTTP Layer)
│   ├── handlers/             # Event Handlers (Event Delegation)
│   ├── services/             # Business Logic Layer
│   ├── state/                # State Management (Store, Actions, Selectors)
│   ├── utils/                # Utilities (Format, Permissions, UI Helpers)
│   ├── views/                # View Renderer (DOM Generation)
│   └── bootstrap.js          # App Initialization
├── backend/                  # Backend (PHP REST API)
│   ├── api/                  # REST Endpoints (users, vehicles, etc.)
│   ├── lib/                  # Shared Helpers (DB, Response, Validation)
│   ├── config.php            # Database Config
│   └── database.sql          # MySQL Schema
├── database/                 # Local Fallback (SQL.js, optional)
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System Architecture
│   ├── DEV_GUIDE.md          # Developer Guide
│   └── SMOKE_TESTS_FINAL.md  # Testing Guide
├── styles.css                # Global Styles (CSS Variables)
├── index.html                # Entry Point
└── server.js                 # Node Dev Server
```

---

## 🏗️ Architektur

### Frontend (Vanilla JS ESM)

**State Management:**
- Zentraler Store (`app/state/store.js`)
- Actions für Mutations (`app/state/actions.js`)
- Selectors für Queries (`app/state/selectors.js`)

**Event Handling:**
- Event Delegation (`app/handlers/events.js`)
- Handler pro Domain (planning, management, dispatch, etc.)

**Rendering:**
- Pure Functions: `state → DOM`
- Partial Rendering für Performance (`renderSidebarOnly`, `renderMainOnly`)

**API Layer:**
- HTTP Client mit Timeout (`app/api/client.js`)
- Standardisiertes Error-Format
- Auto-401-Handling (Session Timeout)

### Backend (PHP REST API)

**Endpoints:**
- `GET /api/users` — Liste aller Benutzer
- `POST /api/users` — Neuen Benutzer erstellen
- `PUT /api/users?id=X` — Benutzer aktualisieren
- `DELETE /api/users?id=X` — Benutzer löschen
- _(Analog für: vehicles, devices, locations, workers, teams, etc.)_

**Response Format:**
```json
// Success
{
  "ok": true,
  "data": { ... }
}

// Error
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pflichtfelder fehlen",
    "fieldErrors": {
      "email": "Email ist erforderlich"
    }
  }
}
```

**Validation:**
- Server-side Validation (`backend/lib/validation.php`)
- Field-level Errors
- Enum/Length/Unique Checks

---

## 🎨 UI/UX

**Design System:**
- Purple Branding (`--primary: #6a4df7`)
- Konsistente Spacing Scale (`--spacing-xs` bis `--spacing-xl`)
- Shadows & Radius (`--shadow-sm`, `--radius-lg`)

**Responsive:**
- **Desktop:** Sidebar + Topbar
- **Tablet/Mobile:** Drawer (Burger-Menü)
- **Tables → Cards** auf kleinen Bildschirmen

**Components:**
- Toast Notifications
- Inline Field Errors
- Loading States (Spinner, Disabled Buttons)
- Empty States
- Error States

---

## 🧪 Testing

### Smoke Tests

Siehe `docs/SMOKE_TESTS_FINAL.md` für vollständige Test-Suite.

**Quick Check:**
```bash
# 1. Backend läuft?
curl http://localhost:8080/backend/api/test.php

# 2. Datenbank erreichbar?
mysql -u root -p loomone_db -e "SELECT COUNT(*) FROM users;"

# 3. Frontend lädt?
curl http://localhost:8080
```

### Debug Mode

URL mit `?debug=1` öffnen:
```
http://localhost:8080?debug=1
```

**Console Commands:**
```js
__dbg.logState()                  // Alle State Counts
__dbg.logResource('users')        // Spezifische Ressource
__dbg.compareFlow('vehicles')     // API → State → Selector vergleichen
```

---

## 🔧 Entwicklung

### Code Style

- **ES Modules:** `import/export` (kein CommonJS)
- **Async/Await:** Keine Callbacks
- **Arrow Functions:** Bevorzugt
- **Template Literals:** Für HTML-Strings
- **Destructuring:** Wo sinnvoll

### Best Practices

1. **Keine DOM-Updates in Services** → Nur in Views
2. **Keine API-Calls in Views** → Nur in Services/Handlers
3. **State ist Single Source of Truth** → Kein "hidden state" in DOM
4. **Event Delegation** → Keine direkten `addEventListener` auf dynamischen Elementen
5. **Validation Server + Client** → Gleiche Regeln

### Neue Ressource hinzufügen

**Beispiel: "Certificates"**

1. **Backend:**
   ```bash
   # Datenbank-Tabelle erstellen
   backend/migrations/add_certificates.sql
   
   # API Endpoint erstellen
   backend/api/certificates.php
   ```

2. **Frontend:**
   ```bash
   # State erweitern
   app/state/actions.js → setCertificates, upsertCertificate, removeCertificate
   app/state/selectors.js → getCertificates
   
   # View erstellen
   app/views/management/certificateManagementView.js
   
   # Handler erstellen
   app/handlers/managementHandlers.js → bindCertificateHandlers
   ```

3. **Testen:**
   ```bash
   # Smoke Test durchführen
   docs/SMOKE_TESTS_FINAL.md → Create → Reload → Exists
   ```

---

## 📦 Deployment

### Production Build

1. **Backend:**
   - PHP-Dateien auf Server hochladen
   - `config.php` mit Production-DB-Credentials anpassen
   - Sicherstellen: `display_errors = 0` in `php.ini`

2. **Frontend:**
   - Keine Build-Step nötig (Vanilla JS)
   - Dateien direkt hochladen
   - Optional: Minify CSS/JS (z.B. mit `terser`, `cssnano`)

3. **Datenbank:**
   ```bash
   mysql -u prod_user -p prod_db < backend/database.sql
   ```

4. **Permissions:**
   ```bash
   chmod 755 backend/api/*.php
   chmod 644 backend/config.php
   ```

### Environment Variables

Für Production: Verwende `.env` oder Server-Umgebungsvariablen statt Hardcoded-Credentials in `config.php`.

---

## 🐛 Troubleshooting

### Problem: "Verbindung zum Server fehlgeschlagen"

**Ursache:** Backend nicht erreichbar.

**Lösung:**
1. Prüfe, ob PHP-Server läuft: `curl http://localhost:8080/backend/api/test.php`
2. Prüfe `backend/config.php` DB-Credentials
3. Prüfe MySQL läuft: `mysql -u root -p`

### Problem: "Keine Berechtigung"

**Ursache:** User hat nicht die nötigen Permissions.

**Lösung:**
1. Prüfe User-Rolle: `SELECT role, permissions FROM users WHERE username='admin';`
2. Admin braucht: `role='Admin'` ODER `permissions` enthält `'Verwalten'`

### Problem: Neue Einträge erscheinen nicht

**Ursache:** State wird nicht aktualisiert.

**Lösung:**
1. Debug Mode aktivieren: `?debug=1`
2. Console: `__dbg.compareFlow('users')`
3. Prüfe, ob `upsertUser()` nach Create aufgerufen wird

---

## 📚 Weitere Dokumentation

- **Architektur:** `docs/ARCHITECTURE.md`
- **Developer Guide:** `docs/DEV_GUIDE.md`
- **Smoke Tests:** `docs/SMOKE_TESTS_FINAL.md`
- **API Reference:** `docs/API_REFERENCE.md` (TODO)

---

## 🤝 Contributing

1. Feature Branch erstellen: `git checkout -b feature/my-feature`
2. Änderungen committen: `git commit -m "feat: Add certificate management"`
3. Tests durchführen: `docs/SMOKE_TESTS_FINAL.md`
4. Pull Request erstellen

---

## 📄 Lizenz

Proprietary — Technova GmbH

---

## 🆘 Support

**Email:** support@technoova.ch  
**Docs:** `docs/`  
**Issues:** GitHub Issues (wenn öffentlich)

---

**Version:** 2.0 (Post-Refactoring)  
**Zuletzt aktualisiert:** 2026-01-23

