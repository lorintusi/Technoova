# Fix-Analyse: Schritt 1 - API Routing & Auth

## 🔍 Problem-Analyse

### ✅ Routing ist KORREKT
**Frontend (`frontend/src/api/client.js`):**
- Base URL: `window.location.origin + '/backend/api'` (Zeile 6)
- Request: `${API_BASE_URL}/${endpoint}` (Zeile 45)
- Credentials: `'include'` ist bereits gesetzt (Zeile 60)

**Backend (`server.js`):**
- Route-Check: `urlPath.startsWith('/backend/api')` (Zeile 714)
- Handler: `handleAPI(urlPath, req, res)` (Zeile 715)
- Pfad-Parsing: `urlPath.replace('/backend/api/', '')` (Zeile 250)

**Beispiel:**
```
Frontend sendet: GET http://localhost:8080/backend/api/users
Server empfängt: /backend/api/users
Handler parst:   users
```

✅ **Routing ist perfekt abgestimmt - keine Änderung nötig!**

---

## ❌ AUTH ist KAPUTT

### Problem 1: Login setzt KEINE Session
**Code (`server.js`, Zeile 263-278):**
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

**Was fehlt:**
- ❌ Kein Session-Cookie wird gesetzt
- ❌ Kein Session-Store
- ❌ Keine Zuordnung User ↔ Session

### Problem 2: GET /me gibt IMMER Admin zurück
**Code (`server.js`, Zeile 300-307):**
```javascript
if (resource === 'me' && req.method === 'GET') {
  const user = mockDB.users[0]; // ← IMMER admin!
  sendJSONResponse(res, 200, {
    success: true,
    user: normalizeData(user, 'user')
  });
  return;
}
```

**Folge:**
- Worker logged sich ein → bekommt Worker-User zurück
- Frontend ruft `/me` auf → bekommt admin zurück!
- UI zeigt "Admin" statt "Worker"

---

## 🔧 FIX-Plan

### Fix 1: Session-System implementieren
**Änderungen:**
1. In-Memory Session-Store (Map: sessionId → userId)
2. Login: Generiere Session-ID, setze Cookie
3. /me: Lese Session-Cookie, return entsprechenden User
4. Logout: Lösche Session

**Warum einfach?**
- Für Dev/Demo reicht In-Memory
- Kein Node-Modul nötig (keine Dependencies)
- Session überlebt Neustart nicht → akzeptabel für Prototyp

### Fix 2: Auth-Middleware für geschützte Routen
**Änderungen:**
- Hilfsfunktion: `getSessionUser(req)` → user oder null
- Alle CRUD-Routen prüfen Session
- Bei 401: Frontend zeigt Login

---

## 📊 Erwartetes Verhalten nach Fix

### Szenario 1: Login als Admin
```
1. POST /backend/api/auth {username: 'admin', password: '010203'}
   → Response: {success: true, user: {...}}
   → Cookie: session=abc123

2. GET /backend/api/me
   → Read Cookie: session=abc123
   → Lookup: sessions['abc123'] = userId 1
   → Return: mockDB.users[0] (admin)

3. GET /backend/api/users
   → Read Cookie: session=abc123
   → User = admin → Permission 'manage_users' → 200 OK
```

### Szenario 2: Login als Worker
```
1. POST /backend/api/auth {username: 'test1', password: '010203'}
   → Response: {success: true, user: {...}}
   → Cookie: session=def456

2. GET /backend/api/me
   → Read Cookie: session=def456
   → Lookup: sessions['def456'] = userId 2
   → Return: mockDB.users[1] (test1, Worker)

3. GET /backend/api/users
   → Read Cookie: session=def456
   → User = Worker → NO 'manage_users' → 403 Forbidden
```

### Szenario 3: Kein Login
```
GET /backend/api/me
→ No Cookie oder ungültige Session
→ 401 Unauthorized
→ Frontend zeigt Login-Screen
```

---

## 🧪 Testplan

### Test 1: Login + Session
```powershell
# 1. Login als Admin
Invoke-RestMethod -Uri "http://localhost:8080/backend/api/auth" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"action":"login","username":"admin","password":"010203"}' `
  -SessionVariable session

# Erwartung: {success: true, user: {id: 1, name: "Admin User", ...}}

# 2. Session-Check
Invoke-RestMethod -Uri "http://localhost:8080/backend/api/me" `
  -WebSession $session

# Erwartung: {success: true, user: {id: 1, name: "Admin User", ...}}
```

### Test 2: Browser-Flow
```
1. Browser öffnen: http://localhost:8080
2. Login: admin / 010203
3. DevTools → Application → Cookies
   → Prüfe: "session" Cookie existiert
4. Network → XHR → GET /backend/api/me
   → Status: 200
   → Response: admin user
5. Klicke "Verwalten" → "👥 Benutzer"
   → Liste wird geladen (nicht 403)
```

### Test 3: Worker-Login
```
1. Browser: Incognito/Private Window
2. Login: test1 / 010203
3. UI zeigt: "Test User" (nicht "Admin User")
4. "Verwalten"-Tab: NICHT sichtbar
5. Nur "Planen"-Tab verfügbar
```

---

## ⚠️ Bekannte Einschränkungen

1. **In-Memory Sessions:**
   - Überleben Server-Neustart NICHT
   - Für Multi-Instance (Load Balancer) NICHT geeignet
   - Für Produktion: Redis/DB-Sessions empfohlen

2. **Security:**
   - Session-ID ist einfacher Zufalls-String (nicht kryptografisch sicher)
   - Kein CSRF-Schutz
   - Kein Session-Timeout
   - Für Produktion: echte Auth-Library empfohlen

3. **Session-Management:**
   - Keine automatische Session-Bereinigung (Memory Leak möglich bei vielen Logins)
   - Keine "Remember Me"-Funktion
   - Kein paralleles Login von mehreren Geräten trackbar

**→ Für Prototyp/Demo OK, für Produktion muss ersetzt werden!**

