# Production Readiness Checklist

**Vor Live-Deployment:** Diese Punkte MÜSSEN geprüft/konfiguriert werden.

---

## ✅ SECURITY

### Backend (PHP)

- [x] **Prepared Statements:** Alle DB-Queries nutzen PDO prepared statements
- [x] **SQL Injection Protection:** validate_unique() nutzt Whitelisting + Backticks
- [x] **XSS Protection:** Frontend escaped HTML-Output (sanitize.js)
- [x] **Content-Type Header:** `Content-Type: application/json; charset=utf-8` in allen Responses
- [ ] **HTTPS:** SSL/TLS Zertifikat installiert (Let's Encrypt)
- [ ] **Environment Variable:** `APP_ENV=production` setzen (unterdrückt DB Error Details)
- [ ] **Error Logging:** PHP `error_log` zu File, NICHT zu Browser
- [ ] **Rate Limiting:** Max Requests/Minute pro IP (z.B. 100/min)

**Action Items:**
```bash
# .env oder config setzen
export APP_ENV=production

# PHP error handling (php.ini oder .user.ini)
display_errors = Off
log_errors = On
error_log = /path/to/logs/php_error.log
```

---

### Cookies & Sessions

- [ ] **HttpOnly:** Session Cookie nur via HTTP (nicht via JavaScript)
- [ ] **Secure:** Cookie nur über HTTPS
- [ ] **SameSite:** `Lax` oder `Strict` gegen CSRF

**Action Items:**
```php
// In PHP Session Config (backend/config.php oder separate session.php)
session_set_cookie_params([
    'lifetime' => 86400, // 24h
    'path' => '/',
    'domain' => 'yourdomain.com',
    'secure' => true,      // Nur HTTPS
    'httponly' => true,    // Nicht via JS
    'samesite' => 'Lax'    // CSRF Schutz
]);
session_start();
```

---

### CORS

- [ ] **Restrict Origin:** Nicht `*`, sondern konkrete Domain
- [ ] **Credentials:** Nur wenn nötig

**Action Items:**
```php
// backend/config.php
$allowedOrigins = ['https://app.technoova.ch'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
```

---

## ✅ CACHING & PERFORMANCE

### Browser Caching

- [ ] **Cache Busting:** Statische Assets (app.js, styles.css) mit Version/Hash
- [ ] **Cache Headers:** `Cache-Control` für statische Files

**Action Items:**
```html
<!-- index.html -->
<link rel="stylesheet" href="styles.css?v=2026-01-23">
<script type="module" src="app.js?v=2026-01-23"></script>
```

Oder via Server (Apache .htaccess):
```apache
# Cache static assets 1 year
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|svg|ico)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>

# HTML no-cache
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
```

---

### DB Indexing

- [x] **Indizes vorhanden:** `backend/database.sql` hat bereits Indizes auf Foreign Keys, username, email
- [ ] **Query Performance:** Prüfe mit `EXPLAIN` bei langsamen Queries

---

## ✅ MONITORING & LOGGING

### Error Logging

- [ ] **Backend:** PHP Errors zu Log-File (nicht Browser)
- [ ] **Frontend:** `window.onerror` für unhandled exceptions (nur in Production mit Flag)

**Action Items:**
```js
// app/bootstrap.js
if (!window.location.search.includes('debug=1')) {
  window.onerror = function(msg, url, line, col, error) {
    // Send to logging service (z.B. Sentry, LogRocket)
    console.error('Unhandled Error:', { msg, url, line, col, error });
    // Optional: Send to backend /api/log-error
  };
}
```

---

### Uptime Monitoring

- [ ] **Ping-Service:** z.B. UptimeRobot, Pingdom
- [ ] **Endpoint:** `/backend/api/health.php` (returns 200 OK)

**Action Items:**
```php
<?php
// backend/api/health.php
header('Content-Type: application/json');
echo json_encode(['status' => 'ok', 'timestamp' => time()]);
```

---

## ✅ BACKUP & RECOVERY

### Database

- [ ] **Daily Backups:** Automatisches MySQL Dump (cron job)
- [ ] **Backup Retention:** Mind. 7 Tage, besser 30 Tage

**Action Items:**
```bash
# Cron job (täglich 3 Uhr nachts)
0 3 * * * /usr/bin/mysqldump -u USER -pPASSWORD loomone_db | gzip > /backups/loomone_$(date +\%Y-\%m-\%d).sql.gz

# Alte Backups löschen (älter als 30 Tage)
0 4 * * * find /backups -name "loomone_*.sql.gz" -mtime +30 -delete
```

---

### Files

- [ ] **Uploaded Files:** Plan-PDFs, Certificates etc. ebenfalls backuppen
- [ ] **Code:** Git Repository als Backup

---

## ✅ DEPLOYMENT

### Pre-Deploy Checklist

- [x] **Linter:** Keine Errors (`npm run lint` falls vorhanden)
- [x] **Smoke Tests:** Alle 10 Desktop + 5 Mobile Tests manuell durchgegangen
- [ ] **Database Migration:** `backend/database.sql` auf Production DB angewendet
- [ ] **Config:** `backend/config.php` mit Production DB-Credentials
- [ ] **Environment:** `APP_ENV=production` gesetzt

---

### Deploy Steps

1. **Backup:** DB + Files vor Deploy
2. **Code Upload:** Via FTP/SFTP oder Git Pull
3. **DB Migration:** Falls Schema-Änderungen
4. **Permissions:** `chmod 755` für PHP-Dateien, `chmod 644` für config
5. **Test:** Quick Smoke Test (Login, Create Vehicle, Reload)
6. **Monitor:** Logs prüfen in ersten 15 Minuten

---

### Rollback Plan

Wenn Deploy schief geht:
1. **Code:** Zurück auf vorherige Version (Git revert oder Backup restore)
2. **DB:** Backup restore (falls Schema-Migration fehlschlug)
3. **Logs:** Fehler analysieren

---

## ✅ FINAL CHECKS (vor Go-Live)

- [ ] **SSL:** HTTPS funktioniert, HTTP redirected zu HTTPS
- [ ] **Sessions:** Login funktioniert, Session bleibt nach Reload
- [ ] **CRUD:** Create/Edit/Delete funktioniert, Data persistiert nach Reload
- [ ] **Mobile:** Drawer funktioniert, Cards statt Tables, Keyboard-friendly
- [ ] **Errors:** 401 → Login Redirect, 500 → User-friendly Message
- [ ] **Performance:** Seite lädt in <3s, API Requests in <500ms

---

## 📊 POST-LAUNCH MONITORING (erste 48h)

### Metrics zu beobachten

1. **Error Rate:** Sollte <1% sein
2. **Response Time:** API <500ms, Page Load <3s
3. **User Complaints:** Keine Meldungen über "hängendes" UI oder Datenverlust
4. **Session Stability:** Keine unerwarteten Logouts

### Action Items bei Problemen

- **High Error Rate:** Logs prüfen, ggf. Rollback
- **Slow Response:** DB Queries optimieren, Caching aktivieren
- **Session Issues:** Cookie-Settings prüfen (HttpOnly, Secure, SameSite)

---

## ✅ LONG-TERM MAINTENANCE

### Monatlich

- [ ] **Security Updates:** PHP, MySQL, Dependencies
- [ ] **Backup Test:** 1 Backup restore testen
- [ ] **Log Review:** Ungewöhnliche Errors/Patterns

### Vierteljährlich

- [ ] **Performance Audit:** Langsame Queries optimieren
- [ ] **User Feedback:** Feature Requests sammeln, Bugs fixen

---

**Zuletzt aktualisiert:** 2026-01-23  
**Version:** 1.0 (Initial Production Release)

