## FINAL ERP FLOW IMPLEMENTATION REPORT (2026-01-20)

- **Owner eines Zeit-Eintrags:** logisch immer `user_id` (API-Ebene); DB speichert `worker_id` + `created_by`, die über Users auf `user_id` gemappt werden.
- **Stundenberechnung:** überall über zentrale JS-Helper (`parseHHMMToMinutes`, `durationMinutes`, `getEntryHours`) + PHP-Helper `calculateHours`, inkl. Mitternacht.
- **Status-Workflow:** `PLANNED → CONFIRMED/REJECTED` mit Audit-Feldern `planned_by`, `confirmed_by`, `confirmed_at`.
- **Views:** Persönlicher Kalender, Mitarbeiter-Einzelkalender (Admin), und Wochenraster (WeekTimeGrid) für Planung; Team-Grid-API vorhanden, Frontend aktuell deaktiviert.

Weitere Details siehe `ERP_AUDIT_2026-01-20.md` und `ERP_AUDIT_FIXES_2026-01-20.md`.


