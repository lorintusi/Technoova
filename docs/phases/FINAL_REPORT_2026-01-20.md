# FINAL REPORT: Kalender/Planungssystem Finalisierung

**Datum:** 2026-01-20  
**Datei:** app.js

## PHASE 1 DONE — Header Cleanup + Popup Admin-Mitarbeiterwahl

### Änderungen:
- **Zeile 1238-1249**: User Switcher aus Header entfernt
- **Zeile 8256-8268**: `timeEntryWizardState.selectedUserId` hinzugefügt
- **Zeile 8382-8400**: Admin-Mitarbeiterwahl Dropdown in `renderWizardStep1()` hinzugefügt
- **Zeile 2054-2067**: `timeentry-next` Handler liest `wizard-user` Wert
- **Zeile 9079-9099**: `saveTimeEntryFromWizard()` nutzt `wizard-user` für `user_id`

### Retest Steps PHASE 1:
1. Admin einloggen → Header: kein User Switcher mehr sichtbar
2. "Zeit erfassen" klicken → Wizard Step 1: Dropdown "Mitarbeiter" erscheint
3. Mitarbeiter A auswählen → Speichern
4. Network Tab: Request zeigt `user_id: A`
5. Mitarbeiter einloggen → Wizard: kein Dropdown (nur eigene Zeit)

---

## PHASE 2 DONE — Tagesansicht Summen + Kategorien Fix

### Änderungen:
- **Zeile 2860-2876**: Tagesansicht nutzt `activeDayUserId = currentUserId` (nicht selectedUserId)
- **Zeile 2878-2913**: `computeHours()` Funktion: robuste Berechnung aus `time_from/time_to`
- **Zeile 2898-2913**: `dayTotal` und `confirmedHours` berechnet
- **Zeile 2904-2910**: `categoryTotals` mit `computeHours()` statt `entry.hours`
- **Zeile 3720-3780**: `renderDayDetailsSection()` Kategorien-Berechnung mit `computeHours()`

### Retest Steps PHASE 2:
1. Tag mit Einträgen öffnen → Tages-Summe zeigt korrekte Stunden (nicht 0.0)
2. Bestätigt-Summe zeigt nur CONFIRMED Einträge
3. Rechte Spalte "Kategorien / Aktivitäten" zeigt echte Stunden pro Kategorie
4. Eintrag speichern → Summen aktualisieren sich sofort

---

## PHASE 3 DONE — Bestätigen Button (Admin & Mitarbeiter)

### Änderungen:
- **Zeile 2913**: `hasPlannedEntries` Flag
- **Zeile 2986-2993**: "Geplante Zeiten bestätigen" Button (nur wenn PLANNED existieren)
- **Zeile 228**: `api.confirmDay(date)` Endpoint hinzugefügt
- **Zeile 2168-2183**: `confirm-day` Action Handler

### Retest Steps PHASE 3:
1. Admin: Tag mit PLANNED Einträgen öffnen → Button "Geplante Zeiten bestätigen" sichtbar
2. Button klicken → alle PLANNED → CONFIRMED
3. Bestätigt-Summe steigt
4. Mitarbeiter: gleicher Test → funktioniert auch

---

## PHASE 4 DONE — Teamübersicht (Admin Only)

### Status:
- Bereits implementiert (Zeile 4316-4480: `renderAdminOverview()`)
- Button nur für Admin sichtbar (Zeile 1250-1255)
- Guard in `renderCalendarView()` (Zeile 4333-4350)

### Retest Steps PHASE 4:
1. Admin einloggen → "Übersicht" Button sichtbar
2. Button klicken → Grid mit allen Mitarbeitern erscheint
3. Grid zeigt Stunden + Projekt-Kürzel pro Tag
4. Zelle klicken → springt zu Week view (muss noch fix werden)
5. Mitarbeiter einloggen → "Übersicht" Button NICHT sichtbar

---

## PHASE 5 — Backend Endpoints (müssen implementiert werden)

### Benötigte Endpoints:

1. **POST /api/time_entries/confirm_day**
   - Body: `{ date: 'YYYY-MM-DD' }`
   - Auth: bestätigt nur für `currentUserId`
   - Update: `status='CONFIRMED'` für alle Einträge wo `user_id=currentUserId AND date=... AND status='PLANNED'`

2. **GET /api/admin/overview/week**
   - Params: `date_from`, `date_to`
   - Auth: nur Admin
   - Response: `{ users: [...], entries: [...] }` grouped by user+day

3. **Overlap Validation** (in `time_entries.php`):
   - Prüfe nur gegen Einträge mit gleicher `user_id`
   - Regel: `existing.start < new_end AND existing.end > new_start`
   - 409 Conflict wenn Overlap

---

## Neue data-action Strings:
- `confirm-day` (Zeile 2988)

---

## Syntax-Check:
- `node -c app.js` ✓ OK

