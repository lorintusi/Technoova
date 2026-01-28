# SCHEMA FINAL - Zielzustand der Datenbank

**Erstellt:** 2025-01-20  
**Status:** Finaler Zielzustand nach Konsolidierung

---

## ÜBERSICHT

Nach Ausführung von `backend/migrations/20250120_consolidate_core_schema.sql` und `backend/scripts/backfill_core_schema.php` soll die Datenbank diesen Zustand haben:

---

## TABELLEN

### assignments

**Zweck:** Planung von Zuweisungen (Worker/Team zu Location/Datum)

**Spalten:**
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `assignment_uid` VARCHAR(36) NOT NULL UNIQUE ← **NEU**
- `location_id` VARCHAR(50) NULL ← **NULLABLE** (erlaubt KRANK/BÜRO ohne Location)
- `entry_type` ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN') NULL ← **NEU**
- `worker_id` VARCHAR(50) NULL
- `team_id` VARCHAR(50) NULL
- `assignment_date` DATE NOT NULL
- `time_from` TIME NULL
- `time_to` TIME NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `deleted_at` DATETIME NULL ← **NEU (Soft Delete)**

**Indizes:**
- PRIMARY KEY: `id`
- UNIQUE: `idx_assignment_uid` auf `assignment_uid` ← **NEU**
- INDEX: `idx_worker_date` auf `(worker_id, assignment_date, deleted_at)`

**Foreign Keys:**
- `location_id` → `locations(id)` ON DELETE SET NULL
- `worker_id` → `workers(id)` ON DELETE CASCADE
- `team_id` → `teams(id)` ON DELETE CASCADE

**Business Rules (in Service erzwungen):**
- Wenn `entry_type = 'BAUSTELLE'` → `location_id` MUSS gesetzt sein
- Wenn `entry_type IN ('KRANK', 'BUERO_ALLGEMEIN')` → `location_id` darf NULL sein
- Soft Delete: Queries filtern standardmäßig `WHERE deleted_at IS NULL`

---

### time_entries

**Zweck:** Tatsächliche Zeiterfassung (Ist-Werte)

**Spalten:**
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `worker_id` VARCHAR(50) NOT NULL
- `location_id` VARCHAR(50) NULL
- `assignment_id` INT NULL ← **NEU (Verknüpfung zu Planung)**
- `entry_date` DATE NOT NULL
- `entry_type` ENUM('BAUSTELLE', 'KRANK', 'BUERO_ALLGEMEIN') NOT NULL DEFAULT 'BUERO_ALLGEMEIN'
- `category` ENUM('BUERO_ALLGEMEIN', 'ENTWICKLUNG', 'MEETING', 'KRANKHEIT', 'TRAINING', 'PAUSE') NOT NULL DEFAULT 'BUERO_ALLGEMEIN'
- `time_from` TIME NOT NULL
- `time_to` TIME NOT NULL
- `hours` DECIMAL(4,2) NOT NULL
- `notes` TEXT NULL
- `created_by` VARCHAR(50) NOT NULL
- `updated_by` VARCHAR(50) NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

**Indizes:**
- PRIMARY KEY: `id`
- INDEX: `idx_assignment_id` auf `assignment_id` ← **NEU**
- INDEX: `idx_entry_date_worker` auf `(entry_date, worker_id)` ← **NEU**
- UNIQUE: `unique_time_entry` auf `(worker_id, entry_date, time_from, time_to)`

**Foreign Keys:**
- `worker_id` → `workers(id)` ON DELETE CASCADE
- `location_id` → `locations(id)` ON DELETE SET NULL
- `assignment_id` → `assignments(id)` ON DELETE SET NULL ← **NEU**

**Business Rules:**
- `assignment_id` ist optional (kann manuell gesetzt werden)
- Wenn gesetzt: Verknüpfung zu Planung
- Validierung: 15-Minuten-Intervalle, keine Overlaps

---

### workers

**Zweck:** Mitarbeiter/Personen

**Spalten:**
- `id` VARCHAR(50) PRIMARY KEY
- `name` VARCHAR(255) NOT NULL
- `role` VARCHAR(100) NULL
- `company` VARCHAR(255) NULL
- `primary_team_id` VARCHAR(50) NULL ← **UMBENANNT** von `team_id`
- `status` VARCHAR(50) DEFAULT 'Arbeitsbereit'
- `contact_phone` VARCHAR(50) NULL
- `contact_email` VARCHAR(255) NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

**Indizes:**
- PRIMARY KEY: `id`
- INDEX: `idx_primary_team_id` auf `primary_team_id` ← **NEU**

**Foreign Keys:**
- `primary_team_id` → `teams(id)` ON DELETE SET NULL

**Business Rules:**
- `primary_team_id` ist optional (nur "Haupt-Team")
- **Single Source of Truth:** Team-Mitgliedschaft über `team_members` Tabelle
- `primary_team_id` dient nur als Convenience-Feld (muss in `team_members` existieren)

---

### team_members

**Zweck:** M:N Beziehung Teams ↔ Workers (Single Source of Truth)

**Spalten:**
- `team_id` VARCHAR(50) NOT NULL
- `worker_id` VARCHAR(50) NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Indizes:**
- PRIMARY KEY: `(team_id, worker_id)`

**Foreign Keys:**
- `team_id` → `teams(id)` ON DELETE CASCADE
- `worker_id` → `workers(id)` ON DELETE CASCADE

**Business Rules:**
- **Single Source of Truth** für Team-Mitgliedschaft
- Ein Worker kann in mehreren Teams sein (m:n)
- TeamService verwaltet diese Tabelle zentral

---

## MIGRATIONEN

### Durchgeführt:

1. **20250120_consolidate_core_schema.sql**
   - `location_id` NULLABLE gemacht
   - `entry_type` Spalte hinzugefügt
   - `assignment_uid` Spalte hinzugefügt
   - `deleted_at` Spalte hinzugefügt (Soft Delete)
   - `assignment_id` in `time_entries` hinzugefügt
   - `primary_team_id` umbenannt (falls `team_id` existierte)

2. **backfill_core_schema.php**
   - `assignment_uid` für vorhandene Einträge gesetzt
   - Unique Index auf `assignment_uid` erstellt
   - `team_members` aus `primary_team_id` gefüllt

---

## VERKNÜPFUNGEN

### Plan ↔ Ist

- `time_entries.assignment_id` → `assignments.id`
- Optional: Time Entry kann mit Assignment verknüpft sein
- Reporting: `planVsActual()` vergleicht `assignments` vs. `time_entries`

---

## SOFT DELETE

### assignments

- `deleted_at IS NULL` = aktiv
- `deleted_at IS NOT NULL` = gelöscht
- Queries filtern standardmäßig: `WHERE deleted_at IS NULL`
- Soft Delete wenn `time_entries.assignment_id` verknüpft ist
- Hard Delete möglich wenn keine Verknüpfung

---

## EINDEUTIGKEIT

### assignments

- **Unique Key:** `idx_assignment_uid` auf `assignment_uid`
- **Grund:** Ermöglicht sicheres Upsert über `assignment_uid`
- **Fallback:** `id` für alte Daten (wird beim Backfill `assignment_uid` erhalten)

---

## TEAM-ZUORDNUNG

### Single Source of Truth: `team_members`

- **Primär:** `team_members` Tabelle (m:n)
- **Sekundär:** `workers.primary_team_id` (nur Convenience, muss in `team_members` existieren)
- **Service:** `TeamService` verwaltet Team-Zuordnungen zentral

---

## BUSINESS RULES (in Services erzwungen)

### AssignmentService

- `entry_type = 'BAUSTELLE'` → `location_id` required
- `entry_type IN ('KRANK', 'BUERO_ALLGEMEIN')` → `location_id` optional

### TimeEntryService

- 15-Minuten-Intervalle für Zeiten
- Keine Overlaps pro Worker/Datum
- `assignment_id` optional (kann manuell gesetzt werden)

### TeamService

- Team-Mitgliedschaft nur über `team_members`
- `primary_team_id` optional (Convenience)

---

## QUERIES

### Standard-Filter

**Assignments:**
```sql
SELECT * FROM assignments WHERE deleted_at IS NULL
```

**Time Entries:**
```sql
SELECT * FROM time_entries WHERE 1=1  -- Kein Soft Delete
```

**Team Members:**
```sql
SELECT * FROM team_members WHERE 1=1  -- Alle aktiv (kein Soft Delete)
```

---

**ENDE SCHEMA_FINAL.md**



