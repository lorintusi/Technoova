# Projektstruktur-Reorganisation

**Datum:** 23. Januar 2026  
**Status:** ✅ Abgeschlossen

## Übersicht

Die Projektstruktur wurde grundlegend reorganisiert, um Frontend und Backend klar zu trennen und die Wartbarkeit zu verbessern.

---

## Neue Struktur

```
app.technoova.ch/
├── frontend/                  ← ALLE Frontend-Dateien
│   ├── public/
│   │   └── index.html        ← HTML-Einstiegspunkt
│   ├── src/                  ← Modularer Frontend-Code
│   │   ├── api/              → API-Client & Endpoints
│   │   ├── components/       → UI-Komponenten
│   │   ├── handlers/         → Event-Handler (12 Dateien)
│   │   ├── services/         → Business-Services (4 Dateien)
│   │   ├── state/            → State-Management (4 Dateien)
│   │   ├── utils/            → Hilfsfunktionen (13 Dateien)
│   │   ├── views/            → View-Komponenten (29 Dateien)
│   │   ├── app.js            → Legacy monolithische App
│   │   ├── bootstrap.js      → App-Initialisierung
│   │   └── index.js          → Entry Point
│   └── styles.css            ← Globales Styling
│
├── backend/                  ← PHP Backend
│   ├── api/                  → 22 PHP-Endpunkte
│   ├── services/             → 4 PHP-Services
│   ├── lib/                  → Helper-Libraries
│   ├── migrations/           → 7 SQL-Migrationen
│   ├── config.php            → Backend-Konfiguration
│   └── database.sql          → DB-Schema
│
├── docs/                     ← Dokumentation
│   ├── phases/               → 33 Phase-Dokumentationen
│   ├── reports/              → 10 Reports
│   └── *.md                  → Diverse Dokumentation
│
├── database/                 ← Node.js DB-Layer (optional)
│   ├── repositories/         → 3 Repositories
│   └── services/             → 3 Services
│
├── scripts/                  ← Utility-Scripts
│   └── *.mjs                 → 4 Check-Scripts
│
├── _archive/                 ← Archivierte Dateien
│   ├── _backups/             → 13 alte Backups
│   └── _project_backup_.../  → Vollständiges Backup
│
├── _FULL_BACKUP_2026-01-23_16-54-14/  ← Sicherheits-Backup
│
├── server.js                 ← Development Server
├── check_php.js              ← PHP-Check Tool
└── README.md                 ← Haupt-Dokumentation
```

---

## Was wurde geändert

### ✅ Frontend → `frontend/`

**Vorher:**
- `index.html` im Root
- `app.js` im Root
- `styles.css` im Root
- `app/` mit modularem Code

**Nachher:**
- `frontend/public/index.html`
- `frontend/src/app.js` (Legacy)
- `frontend/styles.css`
- `frontend/src/*` (alle Module)

### ✅ Dokumentation → `docs/`

**Vorher:**
- 30+ `.md` Dateien im Root (PHASE_*, REPORT_*, BUG_*, etc.)
- `REPORTS/` Ordner

**Nachher:**
- `docs/phases/*.md` (alle Phase-Dokumente)
- `docs/reports/*.md` (alle Reports)
- `docs/*.md` (Hauptdokumentation)

### ✅ Backups → `_archive/`

**Vorher:**
- `_backups/` im Root
- `_project_backup_*/` im Root
- `app.js.backup-*` im Root

**Nachher:**
- `_archive/_backups/`
- `_archive/_project_backup_.../`
- `_archive/app.js.backup-*`

### ✅ Backend → `backend/` (unverändert)

Das Backend blieb in `backend/` und wurde **nicht** verschoben.

---

## Pfad-Anpassungen

### server.js

Der Development-Server wurde angepasst:

```javascript
// Alt:
let filePath = '.' + urlPath;

// Neu:
if (urlPath.startsWith('/backend/')) {
  filePath = '.' + urlPath;          // Backend → backend/
} else {
  filePath = './frontend/public' + urlPath;  // Frontend → frontend/
  if (!fs.existsSync(filePath)) {
    filePath = './frontend' + urlPath;
  }
}
```

### index.html

Pfade in `frontend/public/index.html` wurden angepasst:

```html
<!-- Alt: -->
<link rel="stylesheet" href="styles.css" />
<script src="./app/index.js"></script>

<!-- Neu: -->
<link rel="stylesheet" href="../styles.css" />
<script src="../src/index.js"></script>
```

---

## Vorteile der neuen Struktur

### 1. **Klarheit**
- Frontend und Backend sind klar getrennt
- Neue Entwickler finden sich sofort zurecht
- Keine Verwirrung über Dateizugehörigkeit

### 2. **Wartbarkeit**
- Dokumentation zentral in `docs/`
- Backups isoliert in `_archive/`
- Saubere Ordnerhierarchie

### 3. **Deployment**
- Frontend kann separat gebaut werden
- Backend unabhängig deploybar
- Klare Build-Prozesse möglich

### 4. **Best Practices**
- Entspricht modernen Standards
- Vorbereitet für Build-Tools (Webpack, Vite, etc.)
- Skalierbar für Wachstum

---

## Migration & Rollback

### Sicherheits-Backup

Ein vollständiges Backup wurde erstellt:
```
_FULL_BACKUP_2026-01-23_16-54-14/
```

### Rollback-Prozess

Falls nötig, Rollback durchführen:

```powershell
# 1. Aktuellen Stand sichern
Move-Item frontend, docs, _archive _CURRENT_BACKUP/

# 2. Backup wiederherstellen
robocopy _FULL_BACKUP_2026-01-23_16-54-14 . /E
```

---

## Testing

### Start des Servers

```bash
node server.js
```

### Erwartetes Verhalten

1. ✅ Server läuft auf `http://localhost:8080`
2. ✅ `index.html` wird aus `frontend/public/` geladen
3. ✅ `styles.css` wird aus `frontend/` geladen
4. ✅ JavaScript-Module aus `frontend/src/` geladen
5. ✅ Backend-API unter `/backend/api/` erreichbar

### Test-URLs

- `http://localhost:8080` → index.html (Frontend)
- `http://localhost:8080/styles.css` → CSS (Frontend)
- `http://localhost:8080/backend/api/test` → API (Backend)

---

## Nächste Schritte (Optional)

### Phase 1: Package Management
- `package.json` im `frontend/` erstellen
- Frontend-Dependencies definieren
- NPM-Scripts für Build/Dev

### Phase 2: Build-Prozess
- Vite oder Webpack einrichten
- Bundling & Minification
- Hot Module Replacement (HMR)

### Phase 3: Weitere Optimierungen
- TypeScript-Migration
- ESLint-Konfiguration
- Unit-Tests hinzufügen

---

## Zusammenfassung

✅ **Frontend** → `frontend/` (public/ + src/)  
✅ **Backend** → `backend/` (unverändert)  
✅ **Dokumentation** → `docs/` (phases/ + reports/)  
✅ **Backups** → `_archive/`  
✅ **Pfade** angepasst (server.js, index.html)  
✅ **Vollständiges Backup** erstellt  

Die Projektstruktur ist jetzt **sauber, wartbar und skalierbar**! 🎉

