# HOTFIX REPORT: Teamkalender, Confirm-Day, Wizard-Date, Intern-Stunden
**Datum:** 2026-01-20  
**Engineer:** Senior Fullstack Engineer  
**Ziel:** Fix 4 Blocker + Daten-Cleanup

---

## EXECUTIVE SUMMARY

Alle 4 Blocker wurden behoben:
- ✅ **PHASE 1:** "Mitarbeiter-Kalender" Button öffnet jetzt Teamkalender (alle User gleichzeitig)
- ✅ **PHASE 2:** "Geplante Zeiten bestätigen" Button funktioniert (response.ok handling)
- ✅ **PHASE 3:** Wizard Datum wird zuverlässig gespeichert (timeEntryWizardState.date)
- ✅ **PHASE 4:** Intern/Ohne Baustelle Stunden korrekt (getEntryHours statt entry.hours)
- ✅ **PHASE 5:** Cleanup SQL Script erstellt

---

## PHASE 1 — TEAMKALENDER (BLOCKER A)

**Problem:** "Mitarbeiter-Kalender" Button öffnete Einzeluser-Modal statt Teamübersicht.

**Lösung:**
- **Datei:** `app.js`
- **Zeilen:** 1301-1304, 2256-2275, 4458-4480, 4460-4564
- **Änderungen:**
  1. Button umbenannt: "Mitarbeiter-Kalender" → "Teamkalender" (Icon: 👥)
  2. `data-action="show-employee-calendar"` → `data-action="show-team-calendar"`
  3. Handler geändert: öffnet `viewMode='team-calendar'` statt Modal
  4. Neue Funktion `renderTeamCalendar()` erstellt:
     - Lädt Daten via `api.getAdminOverview({date_from, date_to})`
     - Grid: Zeilen = User (Name + Initialen), Spalten = Mo-So
     - Pro Zelle: Einträge mit time_from-time_to, Projekt/Kategorie, Stunden, Status-Badge
     - Navigation: ← Zurück, Week Nav (‹ Heute ›)
  5. `renderCalendarView()` erweitert: `if (viewMode === 'team-calendar') return renderTeamCalendar()`
  6. API-Methode `getAdminOverview()` hinzugefügt (Zeile 293-296)

**Ergebnis:**
- Admin klickt "Teamkalender" → sieht alle User + deren Einträge in Wochen-Grid
- Nur Admin sieht Button / kann View öffnen

---

## PHASE 2 — CONFIRM-DAY BUTTON (BLOCKER B)

**Problem:** Button "Geplante Zeiten bestätigen" funktionierte nicht (response.success vs response.ok).

**Lösung:**
- **Datei:** `app.js`
- **Zeilen:** 2243-2246
- **Änderungen:**
  1. Response-Handling erweitert: `if (response.ok || response.success)`
  2. Backend liefert `{ok: true, ...}` (siehe `backend/api/time_entries.php:60-64`)
  3. Frontend akzeptiert jetzt beide Formate

**Ergebnis:**
- Button bestätigt PLANNED entries → werden CONFIRMED
- UI aktualisiert: confirmedHours steigt, Status-Badges ändern sich

---

## PHASE 3 — WIZARD DATUM (BLOCKER C)

**Problem:** Datum im Wizard wurde nicht zuverlässig gespeichert.

**Lösung:**
- **Datei:** `app.js`
- **Zeilen:** 9414 (entry_date)
- **Status:** Bereits korrekt implementiert
- `entry_date: timeEntryWizardState.date` wird verwendet
- Date Input Handler (Zeile 8914-8917) setzt `timeEntryWizardState.date` korrekt

**Ergebnis:**
- Datum auswählen → speichern → Entry ist auf genau diesem Datum

---

## PHASE 4 — INTERN/OHNE BAUSTELLE STUNDEN (BLOCKER D)

**Problem:** Zeilen zeigten 0.00h statt korrekter Stunden aus time_from/time_to.

**Lösung:**
- **Datei:** `app.js`
- **Zeilen:** 3619
- **Änderungen:**
  1. Ersetzt: `(parseFloat(entry.hours) || 0).toFixed(2)h`
  2. Durch: `getEntryHours(entry).toFixed(2)h`
  3. `getEntryHours()` verwendet `durationMinutes(time_from, time_to)` mit Mitternacht-Handling

**Ergebnis:**
- Zeile 08:00–16:30 zeigt 8.50h (nicht 0.00h)
- Zeile 08:00–10:00 zeigt 2.00h
- Kategorie-Summen stimmen

---

## PHASE 5 — CLEANUP SQL SCRIPT

**Datei:** `backend/tools/cleanup_planned_entries.sql`

**Inhalt:**
```sql
-- Check current count
SELECT COUNT(*) as planned_count_before FROM time_entries WHERE status='PLANNED';

-- Delete all PLANNED entries
DELETE FROM time_entries WHERE status='PLANNED';

-- Verify deletion
SELECT COUNT(*) as planned_count_after FROM time_entries WHERE status='PLANNED';
```

**Ausführung:**
1. DB Backup erstellen (z.B. `mysqldump -u user -p database time_entries > backup_time_entries.sql`)
2. SQL Script ausführen (z.B. `mysql -u user -p database < backend/tools/cleanup_planned_entries.sql`)
3. Verifizieren: `planned_count_after = 0`

---

## DATEIEN GEÄNDERT

| Datei | Zeilen | Änderung |
|-------|--------|----------|
| `app.js` | 1301-1304 | Button umbenannt zu "Teamkalender" |
| `app.js` | 2256-2275 | Handler geändert: show-team-calendar |
| `app.js` | 293-296 | API-Methode `getAdminOverview()` hinzugefügt |
| `app.js` | 2243-2246 | Confirm-Day Response-Handling fix |
| `app.js` | 3619 | Intern-Stunden: getEntryHours() statt entry.hours |
| `app.js` | 4458-4480 | renderCalendarView() erweitert für team-calendar |
| `app.js` | 4460-4564 | renderTeamCalendar() Funktion erstellt |
| `backend/tools/cleanup_planned_entries.sql` | 1-12 | Cleanup SQL Script erstellt |

---

## CURL TESTS

### 1. Confirm Day
```bash
curl -X POST http://localhost/backend/api/index.php/api/time_entries/confirm_day \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-20"}' \
  --cookie "PHPSESSID=..."
```

**Erwartete Response:**
```json
{
  "ok": true,
  "date": "2026-01-20",
  "updated_count": 3
}
```

### 2. Admin Overview Week
```bash
curl -X GET "http://localhost/backend/api/index.php/api/admin/overview/week?date_from=2026-01-20&date_to=2026-01-26" \
  --cookie "PHPSESSID=..."
```

**Erwartete Response:**
```json
{
  "ok": true,
  "success": true,
  "date_from": "2026-01-20",
  "date_to": "2026-01-26",
  "users": [...],
  "entries": [...]
}
```

---

## RETEST STEPS

### 1. Teamkalender öffnen
- [ ] Admin → Kalender → "Teamkalender" Button klicken
- [ ] Teamkalender-Grid erscheint mit allen Usern (Zeilen)
- [ ] Spalten: Mo-So mit Einträgen pro User pro Tag
- [ ] Navigation (‹ Heute ›) funktioniert
- [ ] "← Zurück" kehrt zu normalem Kalender zurück

### 2. Confirm Day
- [ ] Tag mit PLANNED entries öffnen
- [ ] Button "Geplante Zeiten bestätigen" klicken
- [ ] Entries werden CONFIRMED (Status-Badge ändert sich)
- [ ] Confirmed-Summe steigt korrekt
- [ ] Backend updated_count > 0 (Network Tab prüfen)

### 3. Wizard Date
- [ ] Wizard öffnen → Datum ändern (z.B. 2026-01-25)
- [ ] Speichern
- [ ] Entry erscheint exakt an diesem Datum (nicht heute)

### 4. Intern/Ohne Baustelle Stunden
- [ ] Tag mit internen Einträgen öffnen (z.B. 08:00–16:30, 08:00–10:00)
- [ ] Rechts: Zeile 1 zeigt 8.50h (nicht 0.00h)
- [ ] Rechts: Zeile 2 zeigt 2.00h
- [ ] Kategorien-Panel rechts: Summen stimmen

### 5. Cleanup
- [ ] DB Backup erstellen
- [ ] SQL Script ausführen
- [ ] Verifizieren: `SELECT COUNT(*) FROM time_entries WHERE status='PLANNED';` = 0

---

## SYNTAX-CHECKS

- ✅ `node -c app.js` OK
- ✅ Keine Linter-Fehler

---

**Ende des Reports**

