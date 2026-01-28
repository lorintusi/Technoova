# PHASE 1 - BESTANDSAUFNAHME

## BACKEND

| Feature | Ort | Status | Problem |
|---------|-----|--------|---------|
| **time_entries Schema** | `backend/migration_time_entries.sql` | ✅ Existiert | ❌ KEIN `status` Feld (PLANNED/CONFIRMED/REJECTED) |
| **time_entries Schema** | `backend/migration_time_entries.sql` | ✅ Existiert | ❌ KEIN `confirmed_at`, `confirmed_by`, `planned_by` Feld |
| **users Schema** | `backend/database.sql` | ✅ Existiert | ❌ KEIN `weekly_hours_target` Feld (Default 42.5h) |
| **time_entries API** | `backend/api/time_entries.php` | ⚠️ Muss geprüft werden | ❓ AuthZ für Admin/Mitarbeiter unklar |
| **confirm/reject API** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ `POST /api/time_entries/:id/confirm` fehlt |
| **confirm/reject API** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ `POST /api/time_entries/:id/reject` fehlt |
| **admin overview API** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ `GET /api/admin/overview/week` fehlt |

## FRONTEND

| Feature | Ort | Status | Problem |
|---------|-----|--------|---------|
| **Kalender-Header** | `renderTopbar()` Zeile 991 | ✅ Existiert | ✅ Funktioniert |
| **User Switcher** | `renderPlanningShell()` Zeile 1226-1235 | ✅ Existiert | ✅ Nur Admin sichtbar (`viewAll`) |
| **View: Day** | `renderDayView()` | ✅ Existiert | ✅ Funktioniert |
| **View: Week** | `renderWeekTimeGrid()` | ✅ Existiert | ✅ Funktioniert |
| **View: Month** | `renderMonthView()` | ✅ Existiert | ✅ Funktioniert |
| **View: Year** | `renderYearView()` | ✅ Existiert | ✅ Funktioniert |
| **View: Overview** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ Admin-Übersicht fehlt |
| **Übersicht Button** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ Button im Kalender-Header fehlt |
| **Status Badges** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ PLANNED/CONFIRMED/REJECTED Anzeige fehlt |
| **Wochensoll Anzeige** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ Soll vs Geplant vs Bestätigt fehlt |
| **Confirm/Reject Buttons** | ❌ Nicht vorhanden | ❌ Fehlt | ❌ Für Mitarbeiter fehlt |

## ROLLEN-PRÜFUNG

| Feature | Ort | Status | Problem |
|---------|-----|--------|---------|
| **Admin Check** | `data.currentUser.permissions.includes("manage_users")` | ✅ Existiert | ✅ Funktioniert |
| **User Switcher Sichtbarkeit** | `viewAll` Variable | ✅ Existiert | ✅ Nur Admin sichtbar |
| **AuthZ Guards Frontend** | ⚠️ Teilweise | ⚠️ Teilweise | ❓ Muss für Overview ergänzt werden |
| **AuthZ Guards Backend** | ❌ Unklar | ❌ Unklar | ❓ Muss in API implementiert werden |

## ZUSAMMENFASSUNG

**Backend fehlt:**
- `status` Feld in `time_entries`
- `confirmed_at`, `confirmed_by`, `planned_by` Felder
- `weekly_hours_target` in `users`
- Confirm/Reject API Endpoints
- Admin Overview API Endpoint
- AuthZ Guards in API

**Frontend fehlt:**
- Übersicht Button (Admin-only)
- Admin-Übersicht View (Wochenmatrix)
- Status Badges (PLANNED/CONFIRMED/REJECTED)
- Wochensoll Anzeige (Soll vs Geplant vs Bestätigt)
- Confirm/Reject Buttons (Mitarbeiter)

**Nächste Schritte:**
1. PHASE 2: Backend Migration + API Update
2. PHASE 3: Frontend Planung + Status + Wochensoll
3. PHASE 4: Admin-Übersicht implementieren

