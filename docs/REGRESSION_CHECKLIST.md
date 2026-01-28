# Regression Checklist - Quick 12-Step Test

**Ziel:** Schnelle Überprüfung aller Kernfunktionen nach Code-Änderungen.

## Setup
- [ ] **Step 0:** Run `node scripts/check-duplicates.mjs` - sollte ✅ "No duplicate exports found" zeigen
- [ ] **Step 0b:** Run `node scripts/check-rbac.mjs` - sollte ✅ "All checks passed" zeigen
- [ ] Backend läuft (PHP Server auf Port 8080)
- [ ] Datenbank migriert (inkl. todos Tabelle)
- [ ] Als Admin eingeloggt (username: `admin`, password: `010203`)

## 1. Boot & Login
- [ ] App lädt ohne Console Errors
- [ ] Login funktioniert
- [ ] Navigation sichtbar

## 2. Locations CRUD
- [ ] Verwaltung → Baustellenverwaltung öffnet
- [ ] Neue Baustelle erstellen (Code, Adresse, Ressourcen)
- [ ] Baustelle bearbeiten
- [ ] Baustelle löschen

## 3. Planning - Projekt
- [ ] Kalender → Woche
- [ ] Planungsblock hinzufügen: Kategorie PROJEKT
- [ ] Baustelle auswählen (Pflichtfeld)
- [ ] Block speichern → sichtbar in Week View
- [ ] Projekt-Details (Code, Adresse, Ressourcen) werden angezeigt

## 4. Self-Planning (Worker)
- [ ] Als Worker einloggen
- [ ] Eigene Planung erstellen (Kategorie SCHULUNG)
- [ ] Block speichern → sichtbar
- [ ] Worker kann nur für sich selbst planen (keine anderen Worker auswählbar)

## 5. Confirm Day (Idempotent)
- [ ] Als Worker: Tag mit PLANNED Einträgen bestätigen
- [ ] Time Entries werden erstellt
- [ ] Planning Entries Status → CONFIRMED
- [ ] Zweites Mal bestätigen → keine Duplikate
- [ ] Nach Reload: Status bleibt CONFIRMED, keine neuen Time Entries

## 6. KRANK Upload
- [ ] Als Admin: Planungsblock KRANK erstellen
- [ ] Ohne Datei speichern → Validation Error
- [ ] Mit PDF speichern → Erfolg
- [ ] Badge "🏥✓" sichtbar in Week/Day View

## 7. Certificate Replace
- [ ] KRANK Eintrag bearbeiten
- [ ] Neues PDF hochladen
- [ ] Speichern → Altes Certificate gelöscht, neues gespeichert
- [ ] Nur ein Certificate für diesen Planning Entry

## 8. Certificate Download
- [ ] Verwaltung → Arztzeugnisse
- [ ] Download Button klicken
- [ ] Datei wird heruntergeladen
- [ ] Datei ist gültiges PDF/Bild

## 9. Certificate Delete (Admin)
- [ ] Verwaltung → Arztzeugnisse
- [ ] Delete Button klicken
- [ ] Confirm Dialog erscheint
- [ ] Löschen → Certificate verschwindet aus Liste
- [ ] Datei gelöscht (nicht mehr downloadbar)

## 10. Unconfirmed Overview (Admin)
- [ ] Als Admin: Mehrere Worker mit PLANNED Einträgen
- [ ] Kalender → Unbestätigt-Übersicht sichtbar
- [ ] Liste zeigt Worker mit unbestätigten Tagen
- [ ] "Öffnen" Button → öffnet Day View für Worker/Datum

## 11. Overlap Prevention
- [ ] Worker X für Datum Y: Block 08:00-12:00 planen
- [ ] Gleicher Worker/Datum: Block 10:00-14:00 versuchen
- [ ] Toast Error: "Konflikt: Zeitplanung überschneidet sich..."
- [ ] Block wird NICHT gespeichert
- [ ] Ganztägig kollidiert mit jedem anderen Block

## 12. Team Calendar
- [ ] Kalender → Teamkalender Button
- [ ] Teamkalender öffnet
- [ ] Alle Worker sichtbar
- [ ] Planungsblöcke werden angezeigt

## 13. Dispatch Items (Phase 7-10)
- [ ] Week View zeigt Dispatch Cards statt Planning Blocks
- [ ] "+ Einsatz" Button erstellt neuen Dispatch Item
- [ ] Dispatch Card zeigt Location, Category, Status, Note
- [ ] Dispatch Card zeigt zugewiesene Ressourcen (Personal/Fahrzeuge/Geräte)
- [ ] Day View zeigt Dispatch Cards
- [ ] "Tag bestätigen" erstellt Time Entries idempotent
- [ ] Meta-Tracking: Time Entries haben `meta.sourceDispatchItemId`

## 14. Drag & Drop Assignments (Phase 8)
- [ ] Resource Sidebar zeigt draggable Resources
- [ ] Drag von Resource Pill zu Dispatch Card funktioniert
- [ ] Drop Zone zeigt visuelles Feedback (hover state)
- [ ] Assignment wird erstellt nach Drop
- [ ] Duplikate werden verhindert (Toast: "bereits zugewiesen")
- [ ] Invalid Drop (falscher Resource Type) zeigt Error

## 15. Unassigned Panel (Phase 9)
- [ ] Right Panel zeigt "Nicht im Einsatz" für aktives Datum
- [ ] Tabs für Personal/Fahrzeuge/Geräte funktionieren
- [ ] Unassigned Resources sind draggable
- [ ] Panel aktualisiert sich nach Assignment
- [ ] Search Filter funktioniert

## 16. Todos/Notizen (Phase 11)
- [ ] Planning Header: "Notizen" Button öffnet Modal
- [ ] Todo Modal: Create/Edit mit Scope-Auswahl
- [ ] Scopes: PLAN_DAY, PLAN_WEEK, ADMIN_GLOBAL funktionieren
- [ ] Management Tab "TODOs" zeigt ADMIN_GLOBAL Todos
- [ ] Toggle Completed funktioniert
- [ ] Delete Todo funktioniert
- [ ] Todos persistieren nach Reload

## Quick Validation
- [ ] Keine Console Errors während Tests
- [ ] Alle Toasts zeigen korrekte Meldungen
- [ ] Loading States funktionieren (Buttons disabled während Requests)
- [ ] Error Handling: 401/403 → "Keine Berechtigung", 5xx → "Serverfehler"

## Zeitaufwand
- **Erwartet:** 10-15 Minuten für alle 12 Steps
- **Bei Fehlern:** Detaillierte Tests in `docs/SMOKE_TESTS.md`

