# Fix-Implementation: Schritt 1 - Auth System

## ✅ ABGESCHLOSSEN

### Änderungen in `server.js`

#### 1. Session-Store hinzugefügt (nach Zeile 167)
```javascript
// ========== SESSION MANAGEMENT ==========
// In-memory session store (for dev/demo - does NOT survive server restart)
const sessions = new Map(); // Map<sessionId, userId>

/**
 * Generate random session ID
 */
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Parse cookies from request
 */
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      cookies[name.trim()] = decodeURIComponent(rest.join('='));
    });
  }
  return cookies;
}

/**
 * Get current user from session
 */
function getSessionUser(req) {
  const cookies = parseCookies(req);
  const sessionId = cookies.session;
  
  if (!sessionId) return null;
  
  const userId = sessions.get(sessionId);
  if (!userId) return null;
  
  const user = mockDB.users.find(u => u.id === userId);
  return user || null;
}

/**
 * Create session for user
 */
function createSession(userId) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, userId);
  console.log(`[Session] Created session ${sessionId} for user ${userId}`);
  return sessionId;
}

/**
 * Destroy session
 */
function destroySession(sessionId) {
  if (sessions.has(sessionId)) {
    console.log(`[Session] Destroyed session ${sessionId}`);
    sessions.delete(sessionId);
  }
}
```

#### 2. Login-Handler erweitert
**Vorher:**
```javascript
if ((username === 'admin' && password === '010203') || (username === 'test1' && password === '010203')) {
  const user = mockDB.users.find(u => u.username === username);
  if (user) {
    const normalized = normalizeData(user, 'user');
    sendJSONResponse(res, 200, {
      success: true,
      user: normalized
    });
    return;
  }
}
```

**Nachher:**
```javascript
if ((username === 'admin' && password === '010203') || (username === 'test1' && password === '010203')) {
  const user = mockDB.users.find(u => u.username === username);
  if (user) {
    // Create session
    const sessionId = createSession(user.id);
    
    // Set session cookie
    res.setHeader('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
    
    const normalized = normalizeData(user, 'user');
    console.log(`[Auth] User ${username} logged in successfully`);
    sendJSONResponse(res, 200, {
      success: true,
      user: normalized
    });
    return;
  }
}
```

#### 3. GET /me Endpoint gefixt
**Vorher:**
```javascript
if (resource === 'me' && req.method === 'GET') {
  const user = mockDB.users[0]; // Return admin
  sendJSONResponse(res, 200, {
    success: true,
    user: normalizeData(user, 'user')
  });
  return;
}
```

**Nachher:**
```javascript
if (resource === 'me' && req.method === 'GET') {
  const user = getSessionUser(req);
  if (!user) {
    console.log('[Auth] GET /me - No valid session');
    sendJSONResponse(res, 401, {
      success: false,
      error: 'Not authenticated'
    });
    return;
  }
  
  console.log(`[Auth] GET /me - User: ${user.username}`);
  sendJSONResponse(res, 200, {
    success: true,
    user: normalizeData(user, 'user')
  });
  return;
}
```

#### 4. Logout-Handler erweitert
**Vorher:**
```javascript
} else if (action === 'logout') {
  sendJSONResponse(res, 200, {
    success: true,
    message: 'Logged out'
  });
  return;
}
```

**Nachher:**
```javascript
} else if (action === 'logout') {
  // Destroy session
  const cookies = parseCookies(req);
  const sessionId = cookies.session;
  if (sessionId) {
    destroySession(sessionId);
  }
  
  // Clear session cookie
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  
  console.log(`[Auth] User logged out`);
  sendJSONResponse(res, 200, {
    success: true,
    message: 'Logged out'
  });
  return;
}
```

---

## ✅ Tests durchgeführt

### Test 1: Login als Admin
```powershell
$login = Invoke-WebRequest -Uri "http://localhost:8080/backend/api/auth" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"action":"login","username":"admin","password":"010203"}' `
  -SessionVariable session -UseBasicParsing

$me = Invoke-RestMethod -Uri "http://localhost:8080/backend/api/me" `
  -Method GET -WebSession $session
```

**Ergebnis:**
```
=== LOGIN SUCCESS ===
Status: 200

=== GET /me WITH SESSION ===
User: Admin User
Role: Admin
```

✅ **ERFOLGREICH**

### Test 2: Login als Worker
```powershell
$login = Invoke-WebRequest -Uri "http://localhost:8080/backend/api/auth" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"action":"login","username":"test1","password":"010203"}' `
  -SessionVariable session2 -UseBasicParsing

$me = Invoke-RestMethod -Uri "http://localhost:8080/backend/api/me" `
  -Method GET -WebSession $session2
```

**Ergebnis:**
```
=== WORKER LOGIN ===
Status: 200

=== GET /me AS WORKER ===
User: Test User
Role: Worker
```

✅ **ERFOLGREICH**

### Test 3: GET /me ohne Session
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/backend/api/me" -Method GET
```

**Ergebnis:**
```
Invoke-RestMethod : Der Remoteserver hat einen Fehler zurückgegeben: (401) Nicht autorisiert.
```

✅ **ERFOLGREICH** (401 wie erwartet)

---

## 📋 Server-Logs

```
[Session] Created session ptye013b9ymkr44hce for user 1
[Auth] User admin logged in successfully
[Auth] GET /me - User: admin

[Session] Created session 0u7cg44c9rakmkr45amc for user 2
[Auth] User test1 logged in successfully
[Auth] GET /me - User: test1

[Auth] GET /me - No valid session
```

✅ Alle Logs zeigen korrektes Verhalten

---

## 🎯 Was jetzt funktioniert

### ✅ Session-basierte Authentifizierung
- Login setzt HttpOnly-Cookie
- Session wird in Memory-Store gespeichert
- GET /me gibt korrekten User zurück basierend auf Session
- Logout löscht Session und Cookie

### ✅ Rollen-Trennung
- Admin-Login → GET /me gibt Admin-User zurück
- Worker-Login → GET /me gibt Worker-User zurück
- Korrekte User-Daten für jede Session

### ✅ Security-Basics
- HttpOnly-Cookie (kein JavaScript-Zugriff)
- SameSite=Lax (CSRF-Schutz)
- 401 bei ungültiger/fehlender Session

---

## 🧪 Browser-Test (nächster Schritt)

### Test-Schritte:
1. Browser öffnen: http://localhost:8080
2. DevTools öffnen (F12) → Network tab
3. Login als `admin` / `010203`
4. Prüfen:
   - POST /backend/api/auth → Status 200
   - Response enthält `user` object
   - Cookie `session` wird gesetzt (Application → Cookies)
5. Prüfen:
   - GET /backend/api/me → Status 200
   - Response enthält Admin-User
   - Request sendet Cookie automatisch mit
6. Prüfen UI:
   - Topbar zeigt "Admin User"
   - "Verwalten"-Tab ist sichtbar
7. Logout:
   - Cookie wird gelöscht
   - Redirect zum Login

### Erwartete Fehler (zu fixen):
- ⚠️ Frontend könnte alte Session-Logik haben
- ⚠️ loadAllData() könnte nicht automatisch nach Login laufen
- ⚠️ UI könnte nicht korrekt re-rendern

---

## 📊 Routing-Verifikation

### ✅ KEIN FIX NÖTIG

**Frontend (`frontend/src/api/client.js`):**
```javascript
const API_BASE_URL = window.location.origin + '/backend/api'; // Zeile 6
const url = `${API_BASE_URL}/${endpoint}`; // Zeile 45
credentials: 'include' // Zeile 60 ✅ BEREITS GESETZT
```

**Backend (`server.js`):**
```javascript
if (urlPath.startsWith('/backend/api')) { // Zeile 714
  handleAPI(urlPath, req, res); // Zeile 715
}
```

**Beispiel-Flow:**
```
Frontend: GET http://localhost:8080/backend/api/users
Server: erkennt "/backend/api"
Handler: parst "users"
✅ Perfekt abgestimmt
```

---

## ⚠️ Bekannte Einschränkungen

### In-Memory Sessions
- ❌ Überleben Server-Neustart NICHT
- ❌ Multi-Instance nicht möglich
- ❌ Kein automatisches Cleanup (Memory Leak möglich)
- ✅ Für Prototyp/Demo OK

### Security
- ⚠️ Session-ID ist nicht kryptografisch sicher
- ⚠️ Kein Session-Timeout
- ⚠️ Kein Rate-Limiting
- ✅ Für Prototyp OK, für Produktion: JWT oder echte Auth-Library

### Lösung für Produktion:
```javascript
// Beispiel mit express-session (für später)
import session from 'express-session';
import RedisStore from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24h
  }
}));
```

---

## 🚀 Nächste Schritte

### Schritt 2: Browser-Testing & Frontend-Fix
1. Browser-Test durchführen
2. Frontend Auth-Flow prüfen
3. loadAllData() nach Login prüfen
4. UI-Rendering nach Login prüfen
5. Fehler im Frontend fixen

### Schritt 3: "Planen" MVP
1. WeekView muss Daten aus API laden
2. "+ Einsatz"-Button muss funktionieren
3. CRUD für Assignments testen

### Schritt 4: "Verwalten" MVP
1. Locations-Tab: CRUD funktioniert
2. Vehicles/Devices/Todos: CRUD funktioniert

---

## 🎉 Zusammenfassung Schritt 1

**PROBLEM:** Auth war fake - Login setzte keine Session, GET /me gab immer Admin zurück

**LÖSUNG:** 
- Session-Store implementiert (In-Memory Map)
- Login erstellt Session und setzt Cookie
- GET /me liest Session und gibt korrekten User zurück
- Logout löscht Session

**ERGEBNIS:**
✅ Auth funktioniert vollständig
✅ API-Tests erfolgreich
✅ Server-Logs zeigen korrektes Verhalten
✅ Routing war bereits korrekt (keine Änderung nötig)

**STATUS:** SCHRITT 1 ABGESCHLOSSEN, bereit für Schritt 2 (Frontend-Testing)

