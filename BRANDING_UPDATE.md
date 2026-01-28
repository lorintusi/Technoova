# Branding-Update: LoomOne → Technoova

**Datum:** 23. Januar 2026  
**Status:** ✅ Abgeschlossen

## Übersicht

Alle Vorkommen von "LoomOne" wurden durch "Technoova" ersetzt, um das Branding des Projekts zu aktualisieren.

---

## Aktualisierte Dateien

### 📦 Package Management

1. **`package.json`**
   - Name: `loomone-planner` → `technoova-planner`
   - Beschreibung aktualisiert

2. **`frontend/package.json`**
   - Name: `loomone-planner-frontend` → `technoova-planner-frontend`
   - Beschreibung aktualisiert

### 🌐 Frontend

3. **`frontend/public/index.html`**
   - Titel: `LoomOne Planner Prototype` → `Technoova Planner`

4. **`frontend/src/app.js`**
   - Kommentare und Referenzen aktualisiert

### 🖥️ Server & Konfiguration

5. **`server.js`**
   - Test-E-Mails: `@loomone.app` → `@technoova.app`

6. **`README.md`**
   - Projektname: `Technova` → `Technoova` (mit doppel-o)

### 🔧 Backend

7. **`backend/config.php`**
   - Kommentar: `LoomOne Database Configuration` → `Technoova Database Configuration`
   - **HINWEIS:** Produktionsdatenbank bleibt `alefodas_loomone` (Hostpoint-Konfiguration)

8. **`backend/api/index.php`**
   - API-Kommentare: `LoomOne API` → `Technoova API`
   - API-Message: `LoomOne API is running` → `Technoova API is running`

9. **`backend/database.sql`**
   - Schema-Kommentar: `LoomOne Database Schema` → `Technoova Database Schema`
   - Datenbank-Name: `loomone_db` → `technoova_db`
   - Admin-E-Mail: `admin@loomone.app` → `admin@technoova.app`

10. **`backend/setup_db.php`**
    - Titel: `LoomOne Datenbank Setup` → `Technoova Datenbank Setup`
    - Überschriften und Kommentare aktualisiert

11. **`backend/install.php`**
    - Titel: `LoomOne Database Installation` → `Technoova Database Installation`
    - Standard-DB-Name: `loomone_db` → `technoova_db`
    - Kommentare und UI-Texte aktualisiert

### 💾 Datenbank (SQLite/Local)

12. **`database/schema.sql`**
    - Schema-Kommentar: `LoomOne SQLite Database Schema` → `Technoova SQLite Database Schema`
    - Admin-E-Mail: `admin@loomone.app` → `admin@technoova.app`

13. **`database/db.js`**
    - DB-Dateiname: `loomone.db` → `technoova.db`
    - LocalStorage-Key: `loomone_db` → `technoova_db`
    - Admin-E-Mail: `admin@loomone.app` → `admin@technoova.app`

### 📚 Dokumentation

14. **`PACKAGE_JSON_SETUP.md`**
    - Alle Referenzen zu `loomone-planner` → `technoova-planner`
    - Beschreibungen aktualisiert

---

## Wichtige Hinweise

### ⚠️ Produktionsdatenbank NICHT geändert

Die folgenden Produktionsdatenbanknamen wurden **NICHT** geändert, da sie in der Hostpoint-Infrastruktur bereits konfiguriert sind:

```php
// backend/config.php
define('DB_NAME', 'alefodas_loomone');  // Bleibt so!
define('DB_USER', 'alefodas_loom');     // Bleibt so!
```

```sql
-- backend/migrations/20250120_consolidate_core_schema.sql
USE alefodas_loomone;  -- Bleibt so!
```

Diese Werte müssen in der Produktion beibehalten werden, da die Datenbank bereits existiert und läuft.

### 🔄 LocalStorage-Migration

**Wichtig für Benutzer mit bestehenden Daten:**

Der LocalStorage-Key wurde geändert von `loomone_db` → `technoova_db`.

Bestehende lokale Daten gehen **nicht automatisch verloren**, da der alte Key noch existiert. Aber die App verwendet jetzt den neuen Key.

Falls Migration nötig:
```javascript
// In Browser-Konsole ausführen:
const oldData = localStorage.getItem('loomone_db');
if (oldData) {
  localStorage.setItem('technoova_db', oldData);
  console.log('Daten migriert!');
}
```

---

## Nicht aktualisierte Dateien

Die folgenden Dateien wurden **bewusst NICHT** aktualisiert:

### Backups
- `_archive/*` - Alte Backups bleiben unverändert
- `_FULL_BACKUP_*/*` - Backup-Snapshots bleiben historisch korrekt

### Dokumentation (optional)
- `docs/phases/*` - Historische Dokumentation
- `docs/reports/*` - Reports beziehen sich auf historischen Zustand

**Begründung:** Backups und historische Dokumentation sollten den originalen Zustand widerspiegeln.

---

## Branding-Konsistenz

### Schreibweise

✅ **Korrekt:** Technoova (mit doppel-o)  
❌ **Falsch:** Technova, TechNova, Tech Nova

### Domain & URLs

- Domain: `app.technoova.ch`
- E-Mails: `@technoova.app`
- Package: `technoova-planner`

### Projekt-Namen

- **Vollständig:** Technoova Planner
- **Kurz:** Technoova
- **Intern:** technoova-planner

---

## Verifizierung

### Suche nach verbleibenden Vorkommen:

```bash
# In PowerShell:
Select-String -Path . -Pattern "loomone|LoomOne" -Recurse -Exclude _archive,_FULL_BACKUP*,docs
```

### Wichtige Dateien prüfen:

```bash
# package.json
cat package.json | Select-String "technoova"

# index.html  
cat frontend/public/index.html | Select-String "Technoova"

# API
cat backend/api/index.php | Select-String "Technoova"
```

---

## Migration-Checkliste

Für bestehende Installationen:

- [ ] Lokale Daten migrieren (LocalStorage)
- [ ] Browser-Cache leeren
- [ ] Neue Dokumentation prüfen
- [ ] API-Endpoints testen
- [ ] Admin-Login mit neuer E-Mail testen

---

## Zusammenfassung

✅ **14 Dateien** aktualisiert  
✅ **Alle aktiven Dateien** enthalten jetzt "Technoova"  
✅ **Produktionsdatenbank** bleibt unverändert (richtig!)  
✅ **Backups** bleiben historisch korrekt  
✅ **Konsistentes Branding** über das gesamte Projekt  

Das Projekt heißt jetzt offiziell **Technoova Planner**! 🎉

---

## Git Commit Message (Empfehlung)

```
chore: Rebrand from LoomOne to Technoova

- Update all package.json files
- Update frontend titles and meta tags
- Update backend API comments and messages
- Update database schema comments
- Update admin email addresses (@technoova.app)
- Keep production database names unchanged (alefodas_loomone)
- Update documentation

BREAKING CHANGE: LocalStorage key changed from loomone_db to technoova_db
Users need to migrate local data if needed.
```

