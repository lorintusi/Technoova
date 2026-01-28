# Smoke Tests — Technova Dispo Planner

## Ziel
Nach jedem größeren Update sicherstellen, dass CRUD → State → UI End-to-End funktioniert und Daten nach Reload persistieren.

---

## ⚠️ CRITICAL AUTH TESTS (P0 - Must Pass)

### AUTH-1: Vehicle Create Does Not Trigger Logout
**Goal:** Ensure CRUD operations don't falsely trigger 401 logout

**Steps:**
1. Login as Admin
2. Navigate to "Verwalten" → "Fahrzeuge"
3. Click "+ Fahrzeug hinzufügen"
4. Fill form: Name="Test Vehicle", Status="Verfügbar"
5. Click "Speichern"

**Expected:**
- ✅ Success toast appears
- ✅ Vehicle appears in list
- ✅ User stays logged in (NO redirect to login)
- ✅ DevTools Network: POST `/backend/api/vehicles` returns 200/201 (not 401)

---

### AUTH-2: Network Down Shows Error State (No Logout)
**Goal:** Network errors should NOT trigger logout

**Steps:**
1. Login as Admin
2. Open DevTools → Network → Enable "Offline" mode
3. Try to create a Vehicle

**Expected:**
- ✅ Error toast: "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung."
- ✅ User stays logged in (NO redirect to login)
- ✅ Console: `[API Client] Network error: ...`
- ❌ Console should NOT show: `[AuthGuard] Unauthorized access detected`

---

### AUTH-3: Real 401 Triggers Logout
**Goal:** Genuine 401 from server should trigger logout

**Steps:**
1. Login as Admin
2. Open Browser DevTools → Application → Cookies
3. Delete the PHP session cookie (usually `PHPSESSID`)
4. Try to create a Vehicle

**Expected:**
- ✅ Console: `[AuthGuard] Unauthorized access detected`
- ✅ Toast: "Ihre Sitzung ist abgelaufen..."
- ✅ Redirect to login page after 500ms
- ✅ DevTools Network: POST `/backend/api/vehicles` returns 401

---

## Voraussetzungen

1. **Backend läuft**: PHP Server auf `http://localhost:8080`
2. **Datenbank erreichbar**: MySQL/MariaDB mit `loomone_db`
3. **Admin-Login**: Als Admin anmelden (volle Berechtigungen)
4. **Browser**: Chrome/Edge/Firefox (neueste Version)

---

## Test-Suite

### 1️⃣ BENUTZER (Users)

#### Test: Create → Reload → Exists

**Schritte:**
1. Navigiere zu **Verwalten** → **Benutzer**
2. Klicke **"+ Personal hinzufügen"**
3. Fülle Formular aus:
   - Name: `Test User`
   - Benutzername: `testuser`
   - Email: `test@example.com`
   - Passwort: `Test1234!`
   - Rolle: `Worker`
4. Klicke **"Speichern"**

**Erwartetes Ergebnis:**
- ✅ Toast: "Benutzer erstellt"
- ✅ Modal schließt sich
- ✅ Neuer User erscheint **sofort** in Tabelle
- ✅ Count in Header steigt (z.B. "5 Benutzer" → "6 Benutzer")

**Persistenz-Check:**
1. Drücke **F5** (Reload)
2. Navigiere wieder zu **Verwalten** → **Benutzer**
3. ✅ `Test User` ist noch in der Liste

---

### 2️⃣ BAUSTELLEN (Locations)

#### Test: Create → Reload → Exists

**Schritte:**
1. Navigiere zu **Verwalten** → **Baustellen**
2. Klicke **"+ Baustelle hinzufügen"**
3. Fülle Formular aus:
   - Code: `TEST-001`
   - Adresse: `Teststraße 123, 8000 Zürich`
   - Beschreibung: `Test Baustelle`
   - Status: `Geplant`
4. Klicke **"Speichern"**

**Erwartetes Ergebnis:**
- ✅ Toast: "Baustelle erstellt"
- ✅ Modal schließt sich
- ✅ Neue Baustelle erscheint **sofort** in Tabelle
- ✅ Count steigt

**Persistenz-Check:**
1. Reload (F5)
2. ✅ `TEST-001` ist noch in der Liste

---

### 3️⃣ FAHRZEUGE (Vehicles)

#### Test: Create → Reload → Exists

**Schritte:**
1. Navigiere zu **Verwalten** → **Fahrzeuge**
2. Klicke **"+ Fahrzeug hinzufügen"**
3. Fülle Formular aus:
   - Name: `Test Transporter`
   - Typ: `Transporter`
   - Kennzeichen: `ZH-12345`
   - Status: `Verfügbar`
4. Klicke **"Speichern"**

**Erwartetes Ergebnis:**
- ✅ Toast: "Fahrzeug erstellt"
- ✅ Modal schließt sich
- ✅ Neues Fahrzeug erscheint **sofort** in Tabelle
- ✅ Count steigt

**Persistenz-Check:**
1. Reload (F5)
2. ✅ `Test Transporter` ist noch in der Liste

---

### 4️⃣ GERÄTE (Devices)

#### Test: Create → Reload → Exists

**Schritte:**
1. Navigiere zu **Verwalten** → **Geräte**
2. Klicke **"+ Gerät hinzufügen"**
3. Fülle Formular aus:
   - Name: `Test Bohrmaschine`
   - Typ: `Werkzeug`
   - Seriennummer: `SN-12345`
   - Status: `Verfügbar`
4. Klicke **"Speichern"**

**Erwartetes Ergebnis:**
- ✅ Toast: "Gerät erstellt"
- ✅ Modal schließt sich
- ✅ Neues Gerät erscheint **sofort** in Tabelle
- ✅ Count steigt

**Persistenz-Check:**
1. Reload (F5)
2. ✅ `Test Bohrmaschine` ist noch in der Liste

---

### 5️⃣ EDIT (Update)

#### Test: Edit User → Reload → Updated

**Schritte:**
1. Navigiere zu **Verwalten** → **Benutzer**
2. Klicke **"Bearbeiten"** bei `Test User`
3. Ändere Name zu: `Test User Updated`
4. Klicke **"Speichern"**

**Erwartetes Ergebnis:**
- ✅ Toast: "Benutzer aktualisiert"
- ✅ Name in Tabelle ändert sich **sofort** zu `Test User Updated`

**Persistenz-Check:**
1. Reload (F5)
2. ✅ Name ist noch `Test User Updated`

---

### 6️⃣ DELETE (Remove)

#### Test: Delete Location → Reload → Gone

**Schritte:**
1. Navigiere zu **Verwalten** → **Baustellen**
2. Klicke **"Löschen"** bei `TEST-001`
3. Bestätige Dialog

**Erwartetes Ergebnis:**
- ✅ Toast: "Baustelle gelöscht"
- ✅ `TEST-001` verschwindet **sofort** aus Tabelle
- ✅ Count sinkt

**Persistenz-Check:**
1. Reload (F5)
2. ✅ `TEST-001` ist nicht mehr in der Liste

---

### 7️⃣ SIDEBAR SYNC (Planen View)

#### Test: Dock → Sidebar → Correct Context

**Schritte:**
1. Navigiere zu **Planen**
2. Klicke Dock Icon **"Personal"** (👤)
3. Prüfe Sidebar Header: zeigt **"Personal"**
4. Klicke Dock Icon **"Fahrzeuge"** (🚗)
5. Prüfe Sidebar Header: zeigt **"Fahrzeuge"**

**Erwartetes Ergebnis:**
- ✅ Sidebar Header ändert sich **sofort**
- ✅ Sidebar Content zeigt richtige Ressourcen
- ✅ Aktiver Dock-Button hat `.dock__btn--active` CSS-Klasse

---

### 8️⃣ ERROR HANDLING

#### Test: Validation Error → Field Errors

**Schritte:**
1. Navigiere zu **Verwalten** → **Benutzer**
2. Klicke **"+ Personal hinzufügen"**
3. Lasse **Email** leer
4. Klicke **"Speichern"**

**Erwartetes Ergebnis:**
- ✅ Toast: "Email ist erforderlich" (oder ähnlich)
- ✅ Email-Feld hat roten Border (`.input--error`)
- ✅ Inline Error unter Email-Feld: "Email ist erforderlich"
- ✅ Modal bleibt offen (nicht geschlossen)

---

### 9️⃣ AUTH (Session Timeout)

#### Test: 401 → Redirect to Login

**Schritte:**
1. Öffne Browser DevTools → Application → Cookies
2. Lösche Session-Cookie (z.B. `PHPSESSID`)
3. Navigiere zu **Verwalten** → **Benutzer**
4. Klicke **"+ Personal hinzufügen"** und versuche zu speichern

**Erwartetes Ergebnis:**
- ✅ Toast: "Ihre Sitzung ist abgelaufen"
- ✅ Automatischer Redirect zu Login-Seite (`/`)

---

### 🔟 RESPONSIVE (Mobile)

#### Test: Mobile Sidebar Drawer

**Schritte:**
1. Öffne Browser DevTools → Toggle Device Toolbar
2. Wähle **iPhone 12 Pro** oder **iPad**
3. Navigiere zu **Planen**
4. Prüfe: Sidebar ist **nicht sichtbar** (Drawer-Mode)
5. Klicke **Burger-Menü** (☰)
6. Prüfe: Sidebar öffnet sich als **Overlay/Drawer**

**Erwartetes Ergebnis:**
- ✅ Desktop: Sidebar immer sichtbar
- ✅ Mobile: Sidebar als Drawer (nur bei Bedarf)
- ✅ Burger-Menü funktioniert

---

## 📱 MOBILE SMOKE TESTS (Zusätzlich)

### Test M1: Mobile Drawer Navigation

**Schritte:**
1. Öffne Browser DevTools → Toggle Device Toolbar
2. Wähle **iPhone 12 Pro** (390x844)
3. Navigiere zu **Planen**
4. Prüfe: Sidebar ist nicht sichtbar
5. Klicke **Burger-Menü** (☰ oben links)
6. Prüfe: Sidebar öffnet sich von links als Overlay
7. Klicke **Overlay** (dunkler Bereich)
8. Prüfe: Sidebar schließt sich
9. Öffne Drawer erneut
10. Drücke **ESC**
11. Prüfe: Sidebar schließt sich

**Erwartetes Ergebnis:**
- ✅ Burger-Menü sichtbar auf Mobile
- ✅ Drawer öffnet sich smooth (Transition)
- ✅ Overlay ist sichtbar und klickbar
- ✅ ESC schließt Drawer
- ✅ Body-Scroll ist gesperrt während Drawer offen

---

### Test M2: Mobile Create mit Validation

**Schritte:**
1. Mobile Viewport (iPhone 12 Pro)
2. Navigiere zu **Verwalten** → **Fahrzeuge**
3. Klicke **"+ Fahrzeug hinzufügen"**
4. Modal öffnet sich fullscreen
5. Lasse **Name** leer
6. Klicke **"Speichern"**
7. Prüfe: Inline Error unter Name-Feld
8. Fülle **Name** aus: `Mobile Test Fahrzeug`
9. Klicke **"Speichern"**
10. Prüfe: Toast "Fahrzeug erstellt"
11. Prüfe: Fahrzeug erscheint als **Card** (nicht Table)

**Erwartetes Ergebnis:**
- ✅ Modal ist fullscreen auf Mobile
- ✅ Buttons sind sticky am unteren Rand
- ✅ Inline Errors funktionieren
- ✅ Nach Create: Card-Ansicht (kein horizontales Scrollen)

---

### Test M3: Devices als Cards

**Schritte:**
1. Mobile Viewport
2. Navigiere zu **Verwalten** → **Geräte**
3. Prüfe: Geräte werden als **Cards** angezeigt (nicht als Table)
4. Jede Card zeigt:
   - Name
   - Typ
   - Seriennummer
   - Status (Badge)
   - Buttons: Bearbeiten, Löschen (untereinander)

**Erwartetes Ergebnis:**
- ✅ Keine Table auf Mobile
- ✅ Cards sind lesbar ohne Zoom
- ✅ Buttons sind groß genug für Touch (min 44x44px)
- ✅ Kein horizontales Scrollen

---

### Test M4: Error State (API Down)

**Schritte:**
1. Mobile Viewport
2. Browser DevTools → Network → **Offline**
3. Navigiere zu **Verwalten** → **Fahrzeuge**
4. Versuche **"+ Fahrzeug hinzufügen"** → Speichern
5. Prüfe: Toast "Keine Verbindung zum Server"
6. Prüfe: UI bleibt nutzbar (kein Freeze)
7. Network → **Online**
8. Versuche erneut

**Erwartetes Ergebnis:**
- ✅ User-friendly Error Message
- ✅ UI bleibt responsive
- ✅ Nach Online: Funktioniert wieder

---

### Test M5: 401 Redirect

**Schritte:**
1. Mobile Viewport
2. Angemeldet als Admin
3. Browser DevTools → Application → Cookies
4. Lösche **PHPSESSID** Cookie
5. Navigiere zu **Verwalten** → **Benutzer**
6. Versuche **"+ Personal hinzufügen"** → Speichern

**Erwartetes Ergebnis:**
- ✅ Toast: "Ihre Sitzung ist abgelaufen"
- ✅ Automatischer Redirect zu Login
- ✅ Nach Login: Zurück zur letzten Seite (optional)

---

## Fehlersuche

### Problem: Neue Einträge erscheinen nicht

**Debug-Schritte:**
1. Öffne Browser Console (F12)
2. Aktiviere Debug-Mode: URL mit `?debug=1` öffnen
3. Console: `__dbg.compareFlow('users')` (oder `vehicles`, `devices`, etc.)
4. Prüfe Output:
   - **API Response**: Enthält neuen Eintrag?
   - **State**: Ist neuer Eintrag im State?
   - **Selector**: Gibt Selector neuen Eintrag zurück?

**Häufige Ursachen:**
- API gibt keinen vollständigen Datensatz zurück → Backend Fix
- State wird nicht aktualisiert → `upsertX()` fehlt in Handler
- Selector filtert Eintrag raus → Context/Permission Problem
- Normalisierung fehlt → `snake_case` vs `camelCase`

---

### Problem: Daten verschwinden nach Reload

**Ursache:** Daten wurden nicht in MySQL gespeichert, nur im Frontend-State.

**Lösung:**
1. Prüfe Backend-Logs: `/backend/api/vehicles.php` etc.
2. Prüfe Datenbank direkt:
   ```sql
   SELECT * FROM vehicles ORDER BY created_at DESC LIMIT 10;
   ```
3. Wenn Daten in DB fehlen → Backend Endpoint prüfen (INSERT Statement)

---

### Problem: Toast erscheint nicht

**Ursache:** `showToast()` nicht importiert oder CSS fehlt.

**Lösung:**
1. Prüfe Import in Handler:
   ```js
   import { showToast } from '../utils/ui.js';
   ```
2. Prüfe CSS: `.toast` Styles in `styles.css`

---

## Erfolgs-Kriterien

✅ **Alle 10 Tests bestehen**  
✅ **Keine Console Errors**  
✅ **Daten persistieren nach Reload**  
✅ **Error Handling funktioniert**  
✅ **Responsive funktioniert**

---

## Nächste Schritte

Nach erfolgreichen Smoke Tests:
1. **Performance Tests**: Große Datenmengen (100+ Einträge)
2. **Concurrency Tests**: Mehrere Tabs gleichzeitig
3. **Browser Tests**: Safari, Firefox, Edge
4. **Mobile Tests**: Echte Geräte (iOS, Android)

---

**Zuletzt aktualisiert:** 2026-01-23  
**Version:** 1.0 (Post-Refactoring)

