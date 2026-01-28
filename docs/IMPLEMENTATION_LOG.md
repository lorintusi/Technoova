# Technova Dispo Planner – Implementation Log

**Zweck:** Tracking der Implementierung pro Phase  
**Format:** Pro Phase ein Eintrag mit Dateien, Tests, Risiken

---

## Phase 0: Vorbereitung (abgeschlossen)

### Was wurde umgesetzt
- State Barrel Export (`app/state/index.js`) erstellt
- Alle State-Imports auf `index.js` umgestellt (24 Dateien)
- Duplicate Guard Script (`scripts/check-duplicates.mjs`) erstellt
- Import Guard Script (`scripts/check-imports.mjs`) erstellt
- Dokumentation erstellt (`ARCHITECTURE.md`, `PHASE_ROADMAP.md`)

### Dateien
**Neu:**
- `app/state/index.js` - Barrel Export für State-Module
- `scripts/check-duplicates.mjs` - Prüft doppelte Exports
- `scripts/check-imports.mjs` - Prüft State-Imports
- `docs/ARCHITECTURE.md` - Architektur-Dokumentation
- `docs/PHASE_ROADMAP.md` - Phasen-Roadmap
- `docs/DEV_GUIDE.md` - Development Guide

**Geändert:**
- 24 Dateien: State-Imports auf `index.js` umgestellt
- `docs/REGRESSION_CHECKLIST.md` - Step 0 hinzugefügt

### Smoke Tests
- ✅ Boot: App startet ohne Errors
- ✅ Duplicate Check: `node scripts/check-duplicates.mjs` → ✅
- ✅ Import Check: `node scripts/check-imports.mjs` → ✅
- ✅ Medical Certificates: Badges funktionieren weiterhin

### Risiken / Next Steps
- ✅ Keine Risiken, nur Refactoring
- ⏳ Warte auf Go für Phase 1

---

## Phase 1: RBAC vereinfachen (ADMIN/WORKER) + Guards

**Status:** ⏳ Pending (wartet auf Go)

### Geplante Änderungen
- `app/utils/permissions.js` konsolidieren
- UI Guards implementieren
- Backend Permission Checks sicherstellen

### Erwartete Dateien
**Geändert:**
- `app/utils/permissions.js` - Konsolidierte Permission-Funktionen
- `app/views/planning/planningShell.js` - Teamkalender-Button nur Admin
- `app/views/planning/planningSelector.js` - Worker-Dropdown nur Admin
- `app/views/management/managementShell.js` - Tabs nur Admin
- `app/views/modals/planningEntryModal.js` - Worker-Dropdown disabled
- `backend/api/planning_entries.php` - Permission Checks
- `backend/api/medical_certificates.php` - Permission Checks
- `backend/api/time_entries.php` - Permission Checks

---

## Phase 2-12: (Wird nach Implementierung dokumentiert)

---

**Letzte Aktualisierung:** Vor Phase 1  
**Nächster Schritt:** Phase 1 starten, wenn Go gegeben wird



