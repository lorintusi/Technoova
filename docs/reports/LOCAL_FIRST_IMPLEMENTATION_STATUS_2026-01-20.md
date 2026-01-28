# Lokal-First Umstellung - Implementierungsstatus
**Erstellt:** 2026-01-20  
**Status:** PHASE 2 in Arbeit

---

## ✅ ABGESCHLOSSEN

### 1. SQLite Schema (database/schema.sql)
- ✅ Vollständiges Schema erstellt (1:1 MySQL → SQLite)
- ✅ Alle 7 Tabellen: users, workers, teams, team_members, locations, assignments, time_entries
- ✅ Foreign Keys aktiviert (`PRAGMA foreign_keys = ON`)
- ✅ Indizes erstellt
- ✅ Initial Admin User eingefügt

### 2. Database Layer (database/db.js)
- ✅ SQL.js Integration für Browser
- ✅ `initDatabase()` - Initialisiert SQLite DB
- ✅ `runSchema()` - Führt Schema aus
- ✅ `saveDatabase()` - Persistiert in localStorage
- ✅ `query()` - SELECT Queries
- ✅ `execute()` - INSERT/UPDATE/DELETE

### 3. Repository Layer
- ✅ `userRepository.js` - User CRUD
- ✅ `timeEntryRepository.js` - Time Entry CRUD + Filtering

### 4. Service Layer
- ✅ `authService.js` - Login, getCurrentUser, logout
- ✅ `timeEntryService.js` - confirmDay, checkOverlap
- ✅ `adminService.js` - getWeekOverview, cleanupPlanned

### 5. Local API Wrapper (database/localApi.js)
- ✅ Ersetzt Backend API Calls
- ✅ Behält gleiche API-Schnittstelle bei (`api.*`)
- ✅ Implementiert: login, getCurrentUser, getTimeEntries, createTimeEntry, confirmDay, getAdminOverview

### 6. Frontend Integration
- ✅ `index.html` - SQL.js, db.js, repositories, services, localApi.js eingebunden
- ✅ `app.js` - Verwendet `window.api` wenn verfügbar (von localApi.js)

### 7. Session → LocalStorage
- ✅ `authService.js` speichert `currentUserId` und `currentUser` in localStorage
- ✅ `getCurrentUser()` liest aus localStorage

---

## 🚧 IN ARBEIT / TODO

### 1. Weitere Repositories (optional, für vollständige Funktionalität)
- ⏳ `workerRepository.js`
- ⏳ `teamRepository.js`
- ⏳ `locationRepository.js`
- ⏳ `assignmentRepository.js`

**Hinweis:** Diese werden im Frontend weniger genutzt. Für MVP reicht die aktuelle Implementierung.

### 2. Bcrypt Password Verification
- ⚠️ `authService.js` - `verifyPassword()` verwendet aktuell Fallback
- **TODO:** Echte bcrypt Library einbinden (z.B. `bcryptjs` für Browser)

### 3. SQL.js Library Loading
- ⚠️ `index.html` lädt SQL.js von CDN
- **Alternative:** Lokale Datei einbinden für Offline-Nutzung

### 4. Error Handling
- ⚠️ Lokale Fehler müssen HTTP-Status-Codes simulieren (für Kompatibilität)
- **TODO:** Error Wrapper implementieren

### 5. Testing
- ⏳ Offline-Funktionalität testen
- ⏳ Login-Flow testen
- ⏳ Time Entry CRUD testen
- ⏳ Confirm-Day testen
- ⏳ Teamkalender testen

---

## 📋 ARCHITEKTUR-ÜBERSICHT

### Datenfluss (Lokal):

```
UI Event → app.js (api.*) → localApi.js → Service Layer → Repository → SQLite DB
                                                                    ↓
UI Update ← renderApp() ← State Update ← Service Response ← Repository Response
```

### Dateien-Struktur:

```
app.technoova.ch/
├── index.html                    # Lädt SQL.js + lokale Module
├── app.js                        # Frontend (unverändert, nutzt window.api)
│
├── database/
│   ├── schema.sql                # SQLite Schema
│   ├── db.js                     # SQLite Connection
│   ├── localApi.js               # API Wrapper (ersetzt Backend)
│   │
│   ├── repositories/
│   │   ├── userRepository.js     # User CRUD
│   │   └── timeEntryRepository.js # Time Entry CRUD
│   │
│   └── services/
│       ├── authService.js        # Authentication
│       ├── timeEntryService.js   # Time Entry Business Logic
│       └── adminService.js       # Admin Functions
│
└── backend/                      # ⚠️ DEPRECATED (kann entfernt werden)
    └── api/                      # Nicht mehr verwendet
```

---

## 🔧 TECHNISCHE DETAILS

### SQLite Storage
- **Speicherort:** localStorage (als JSON-serialisiertes Uint8Array)
- **Limit:** ~5-10MB (localStorage Limit)
- **Alternative:** IndexedDB für größere Datenmengen (TODO)

### Session Management
- **Speicherort:** localStorage
- **Keys:** `currentUserId`, `currentUser`
- **Lifetime:** Persistiert bis Logout oder Browser-Cache löschen

### API Kompatibilität
- **Schnittstelle:** Identisch zu Backend API
- **Response Format:** Identisch (`{success: true, data: [...]}`)
- **Error Format:** Identisch (`{success: false, error: '...'}`)

---

## ⚠️ BEKANNTE LIMITATIONEN

1. **Bcrypt:** Passwort-Verifikation verwendet aktuell Fallback (nicht sicher für Production)
2. **SQL.js Größe:** ~1MB Library (muss geladen werden)
3. **localStorage Limit:** ~5-10MB (kann bei vielen Daten problematisch sein)
4. **Weitere Repositories:** workers, teams, locations, assignments noch nicht implementiert (werden aber im Frontend weniger genutzt)

---

## 🚀 NÄCHSTE SCHRITTE

1. **Bcrypt Library einbinden** (bcryptjs für Browser)
2. **Testing:** Alle Kern-Funktionen testen
3. **IndexedDB Migration:** Für größere Datenmengen
4. **Backend entfernen:** Als deprecated markieren oder löschen
5. **Dokumentation:** User-Dokumentation für lokale Nutzung

---

## ✅ VERIFIZIERUNG

### Funktionalität (zu testen):

- [ ] Login funktioniert (admin / 010203)
- [ ] Time Entries laden (Tag/Woche)
- [ ] Time Entry erstellen
- [ ] Time Entry bestätigen (confirm-day)
- [ ] Teamkalender öffnen (Admin)
- [ ] Daten persistieren nach Neustart
- [ ] Offline-Nutzung (kein Netzwerk)

---

**ENDE STATUS-REPORT**



