# Technoova Planner - Start/Stop Scripts

## 📋 Übersicht

Einfache Scripts zum Starten und Stoppen der Technoova Planner App.

---

## 🚀 Server starten

```bash
./start-technoova
```

**Das Script:**
- ✅ Prüft ob Node.js installiert ist
- ✅ Prüft ob Port 8080 frei ist
- ✅ Erstellt das `data/` Verzeichnis falls nötig
- ✅ Startet den Server im Hintergrund
- ✅ Speichert die PID in `.technoova.pid`
- ✅ Schreibt Logs in `technoova.log`

**Nach dem Start:**
- **URL:** http://localhost:8080
- **Admin-Login:** `admin` / `010203`
- **Test-User:** `test1` / `010203`
- **Server-PID:** siehe Output oder `.technoova.pid`

---

## 🛑 Server stoppen

```bash
./stop-technoova
```

**Das Script:**
- ✅ Liest PID aus `.technoova.pid`
- ✅ Stoppt den Server (graceful shutdown)
- ✅ Falls nötig: Force-Kill nach 5 Sekunden
- ✅ Räumt Port 8080 auf
- ✅ Löscht PID-Datei

---

## 📊 Status prüfen

### Server läuft?
```bash
# Option 1: PID-Datei prüfen
cat .technoova.pid

# Option 2: Prozess prüfen
ps aux | grep node

# Option 3: Port prüfen
lsof -i :8080
```

### API testen
```bash
curl http://localhost:8080/backend/api/test
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Technoova API is running (Node.js)",
  "mode": "NODE_API",
  "timestamp": "2026-01-28T..."
}
```

---

## 📝 Logs anzeigen

### Live-Logs verfolgen
```bash
tail -f technoova.log
```

### Letzte 50 Zeilen
```bash
tail -50 technoova.log
```

### Alle Logs
```bash
cat technoova.log
```

---

## 🔧 Troubleshooting

### Problem: "Port 8080 ist bereits belegt"

**Lösung 1: Anderen Prozess stoppen**
```bash
# Prozess finden
lsof -i :8080

# Prozess stoppen
kill -9 $(lsof -ti:8080)

# Dann neu starten
./start-technoova
```

**Lösung 2: Anderen Port verwenden**
```bash
# server.js bearbeiten und PORT ändern
# oder Environment Variable setzen
PORT=8081 npm start
```

### Problem: "Server läuft bereits"

**Lösung:**
```bash
./stop-technoova
./start-technoova
```

### Problem: Server startet nicht

**Debug-Schritte:**
1. Logs prüfen: `cat technoova.log`
2. Node.js installiert? `node -v`
3. Dependencies installiert? (nicht nötig bei Technoova)
4. Port verfügbar? `lsof -i :8080`

### Problem: PID-Datei existiert aber Server läuft nicht

**Lösung:**
```bash
# PID-Datei löschen
rm -f .technoova.pid

# Neu starten
./start-technoova
```

---

## 🔄 Neustart

```bash
./stop-technoova && ./start-technoova
```

Oder als Einzeiler:
```bash
./stop-technoova ; sleep 1 ; ./start-technoova
```

---

## 📁 Generierte Dateien

| Datei | Beschreibung | Git-Status |
|-------|--------------|------------|
| `.technoova.pid` | Server Process ID | `.gitignore` |
| `technoova.log` | Server-Logs | `.gitignore` |
| `data/*.json` | Persistente Daten | `.gitignore` |

---

## 🔐 Sicherheitshinweise

1. **PID-Datei:** Wird bei Serverstart erstellt, bei Stopp gelöscht
2. **Logs:** Enthalten keine sensiblen Daten
3. **Port 8080:** Standard-Port, kann in `server.js` geändert werden
4. **Daten:** Werden in `data/` gespeichert (JSON-Format)

---

## 🚀 Automatischer Start beim Systemstart (Optional)

### macOS (launchd)

1. Service-Datei erstellen:
```bash
cat > ~/Library/LaunchAgents/ch.technoova.planner.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ch.technoova.planner</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/ibnizhaku/Desktop/Technoova/start-technoova</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/ibnizhaku/Desktop/Technoova/technoova-launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/ibnizhaku/Desktop/Technoova/technoova-launchd-error.log</string>
</dict>
</plist>
EOF
```

2. Service laden:
```bash
launchctl load ~/Library/LaunchAgents/ch.technoova.planner.plist
```

3. Service starten:
```bash
launchctl start ch.technoova.planner
```

4. Service stoppen:
```bash
launchctl stop ch.technoova.planner
```

5. Service entfernen:
```bash
launchctl unload ~/Library/LaunchAgents/ch.technoova.planner.plist
```

---

## 📚 Weiterführende Dokumentation

- **Deployment:** `DEPLOYMENT_GUIDE.md`
- **README:** `README.md`
- **API-Dokumentation:** Siehe `server.js` (Zeilen 305-816)

---

## ✨ Zusammenfassung

**Starten:**
```bash
./start-technoova
```

**Stoppen:**
```bash
./stop-technoova
```

**Status:**
```bash
# Läuft?
cat .technoova.pid && echo "Server läuft!"

# API-Test
curl http://localhost:8080/backend/api/test
```

**Logs:**
```bash
tail -f technoova.log
```

**Das war's! 🎉**
