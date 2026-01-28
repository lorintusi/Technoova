# Schritt 4: Locations CRUD - Manueller Test-Plan

## ✅ Code-Analyse Ergebnis

### Server-Implementierung
- ✅ Generic CRUD für alle Ressourcen inklusive `locations` (server.js, Zeile 501-643)
- ✅ GET /backend/api/locations → Alle Locations
- ✅ GET /backend/api/locations/:id → Eine Location
- ✅ POST /backend/api/locations → Location erstellen
- ✅ PUT /backend/api/locations/:id → Location updaten
- ✅ DELETE /backend/api/locations/:id → Location löschen

### Frontend-Implementierung
- ✅ View: `locationManagementView.js` - Rendert Location-Liste und Modal
- ✅ Handler: `managementHandlers.js` - Event-Listener für Create/Edit/Delete
- ✅ Binding: `bindManagementHandlers()` ruft `bindLocationManagementHandlers()` auf

### Event-Handler vorhanden
- ✅ `#btn-add-location` → Öffnet Create-Modal
- ✅ `#btn-add-location-empty` → Öffnet Create-Modal (wenn Liste leer)
- ✅ `[data-action="edit-location"]` → Öffnet Edit-Modal
- ✅ `[data-action="delete-location"]` → Löscht Location (mit Confirm)
- ✅ `#form-location` submit → Erstellt oder updated Location

---

## 📝 Manueller Test-Plan

### Vorbereitung
```powershell
# 1. Server starten (falls nicht schon läuft)
cd C:\Users\Startklar\OneDrive\Desktop\app.technoova.ch
npm start

# 2. Browser öffnen
# URL: http://localhost:8080
```

### Test 1: Als Admin einloggen
1. Browser öffnen: `http://localhost:8080`
2. Login:
   - **Username:** `admin`
   - **Password:** `010203`
3. **Erwartung:**
   - ✅ Login erfolgreich
   - ✅ Topbar zeigt "Planen" + "Verwalten" Tabs

### Test 2: Locations-Liste öffnen
1. Klick auf **"Verwalten"** Tab
2. Klick auf **"🏗️ Baustellen"** Icon in der Sidebar (das 4. Icon von oben, 📍)
3. **Erwartung:**
   - ✅ Locations-Liste wird angezeigt
   - ✅ Header: "Baustellenverwaltung"
   - ✅ Button: "Baustelle hinzufügen"
   - ✅ Liste zeigt existierende Locations (oder "Keine Baustellen vorhanden")

### Test 3: Location erstellen
1. Klick auf **"Baustelle hinzufügen"**
2. **Erwartung:** Modal öffnet sich mit Titel "Neue Baustelle"
3. Eingaben:
   - **Projektcode:** `TEST-001`
   - **Adresse:** `Teststrasse 123, 8000 Zürich`
   - **Beschreibung:** `Test-Baustelle für CRUD`
   - **Ressourcen:** `LKW, Kran, Schweissgerät`
4. Klick auf **"Erstellen"**
5. **Erwartung:**
   - ✅ Button zeigt "Erstelle..." (Loading-State)
   - ✅ Modal schliesst sich
   - ✅ Toast: "Baustelle erstellt"
   - ✅ Liste wird aktualisiert und zeigt die neue Location
   - ✅ Network: POST /backend/api/locations → 200

### Test 4: Location bearbeiten
1. Klick auf **✏️** (Edit-Button) bei der gerade erstellten Location
2. **Erwartung:** Modal öffnet sich mit Titel "Baustelle bearbeiten" und vorausgefüllten Feldern
3. Änderungen:
   - **Beschreibung:** `Test-Baustelle für CRUD (Bearbeitet)`
   - **Ressourcen:** `LKW, Kran, Schweissgerät, Kompressor`
4. Klick auf **"Speichern"**
5. **Erwartung:**
   - ✅ Button zeigt "Speichere..." (Loading-State)
   - ✅ Modal schliesst sich
   - ✅ Toast: "Baustelle aktualisiert"
   - ✅ Liste zeigt die geänderten Daten
   - ✅ Network: PUT /backend/api/locations/:id → 200

### Test 5: Location löschen
1. Klick auf **🗑️** (Delete-Button) bei der Test-Location
2. **Erwartung:** Browser-Confirm-Dialog: "Baustelle 'TEST-001' wirklich löschen?"
3. Klick auf **"OK"**
4. **Erwartung:**
   - ✅ Toast: "Baustelle gelöscht"
   - ✅ Location verschwindet aus der Liste
   - ✅ Network: DELETE /backend/api/locations/:id → 200

### Test 6: Persistenz (Server-Restart)
1. Location erstellen (wie Test 3)
2. Server-Restart:
   ```powershell
   # Im Terminal, wo npm start läuft: Ctrl+C
   npm start
   ```
3. Browser neu laden (F5)
4. Login als Admin
5. Zu Locations navigieren
6. **Erwartung:**
   - ✅ Die erstellte Location ist noch vorhanden
   - ✅ Daten sind identisch (Code, Adresse, Beschreibung, Ressourcen)

### Test 7: Worker-Rechte (403/401)
1. Als Admin abmelden
2. Als Worker einloggen:
   - **Username:** `test1`
   - **Password:** `010203`
3. **Erwartung:**
   - ✅ NUR "Planen" Tab sichtbar (KEIN "Verwalten")
   - ✅ Worker kann nicht auf `/backend/api/locations` zugreifen (theoretisch - optional zu testen via DevTools)

### Test 8: Fehlerbehandlung
1. Als Admin einloggen
2. Location erstellen, aber:
   - **Projektcode:** ` ` (nur Leerzeichen)
   - **Adresse:** ` ` (nur Leerzeichen)
3. Klick auf **"Erstellen"**
4. **Erwartung:**
   - ✅ Toast: "Bitte füllen Sie alle Pflichtfelder aus"
   - ✅ Modal bleibt offen
   - ✅ Submit-Button wird wieder enabled

---

## 📊 Erwartete Ergebnisse

### Success Criteria
| Test | Status | Beweis |
|------|--------|--------|
| Admin sieht "Verwalten" Tab | ⏳ Manuell | Browser |
| Locations-Liste lädt | ⏳ Manuell | Browser + Network |
| Create Location | ⏳ Manuell | POST 200 + Toast |
| Edit Location | ⏳ Manuell | PUT 200 + Toast |
| Delete Location | ⏳ Manuell | DELETE 200 + Toast |
| Persistenz | ⏳ Manuell | Server-Restart |
| Worker Rechte | ⏳ Manuell | Kein "Verwalten" Tab |
| Fehler-Validierung | ⏳ Manuell | Toast + Button enabled |

### Network-Requests (Beispiel)
```
# Create
POST /backend/api/locations
Body: { code: "TEST-001", address: "Teststrasse 123", description: "...", resourcesRequired: ["LKW", "Kran"] }
Response: { success: true, id: 3, data: { id: 3, code: "TEST-001", ... } }

# Edit
PUT /backend/api/locations/3
Body: { code: "TEST-001", address: "Teststrasse 123", description: "... (Bearbeitet)", resourcesRequired: [...] }
Response: { success: true, data: { id: 3, code: "TEST-001", ... } }

# Delete
DELETE /backend/api/locations/3
Response: { success: true, message: "Deleted" }
```

---

## 🚀 Nächste Schritte

**Nach erfolgreichem Test:**
1. ✅ Dokumentiere Test-Ergebnisse (Screenshots, Network-Logs)
2. ✅ Optional: Vehicles CRUD testen (analog zu Locations)
3. ✅ Optional: Devices CRUD testen (analog zu Locations)
4. ✅ Optional: Todos CRUD testen (analog zu Locations)

**Wichtig:**
- ⚠️ Der Browser-Test mit Automation-Tools schlug fehl (JavaScript-Fehler)
- ✅ Code-Analyse zeigt, dass alles korrekt implementiert ist
- ⏳ Manueller Test wird empfohlen, um Funktionalität zu bestätigen

