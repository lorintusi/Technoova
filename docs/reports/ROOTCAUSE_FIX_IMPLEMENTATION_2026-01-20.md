## Root-Cause-Fix Implementation – 2026-01-20

### 1. Übersicht

Dieses Dokument beschreibt die Implementierung der Fixes für die Top 5 Root Causes aus `REPORTS/ARCHITECTURE_AND_ROOTCAUSE_2026-01-20.md`:

- Teamkalender Owner-Mapping
- Confirm-Day (nur Self-Confirm)
- Konsolidierung der Frontend-Datenquelle
- Vereinheitlichte Stundenberechnung
- Intern-Panel (Summen) konsistent zur Sidebar

---

### 2. Änderungen nach Root Cause

#### 2.1 Root Cause #1 – Teamkalender Owner-Mapping

**Ziel:** Jeder Eintrag im Admin-Overview/Teamkalender hat einen gültigen `user_id`-Owner, der im `users`-Set existiert. Keine `unknown_*`-Gruppierung mehr.

**Änderungen:**

- **Alle User statt nur solche mit `worker_id`:**

```43:50:backend/api/admin_overview.php
// Vorher: WHERE u.worker_id IS NOT NULL
SELECT u.id, u.name, u.weekly_hours_target, u.worker_id, w.name as worker_name
FROM users u
LEFT JOIN workers w ON u.worker_id = w.id
ORDER BY u.name;
```

- **Einträge ohne gültigen Owner werden nicht mehr an das Frontend geliefert:**

```170:184:backend/api/admin_overview.php
// Flatten entries for frontend – nur Einträge mit gültigem Owner (user_id) berücksichtigen
foreach ($entries as $entry) {
    if (!isset($entry['user_id']) || !$entry['user_id']) {
        continue; // Datenintegrität: Einträge ohne Owner werden nicht im UI angezeigt
    }
    $entriesList[] = [
        'id' => $entry['id'],
        'user_id' => $entry['user_id'],
        'date' => $entry['entry_date'],
        'time_from' => $entry['time_from'],
        'time_to' => $entry['time_to'],
        'project_id' => $entry['location_id'],
        'project_code' => $entry['location_code'] ?? null,
        'project_name' => $entry['location_address'] ?? null,
        'category' => $entry['category'],
        'status' => $entry['status']
    ];
}
```

- **Teamkalender gruppiert nur nach echten `user_id` (kein `'unknown'` mehr):**

```4747:4753:app.js
// Group entries by user_id and date (SINGLE SOURCE OF TRUTH)
const entriesByUserDay = {};
entries.forEach(entry => {
  const userId = entry.user_id;
  if (!userId) {
    return; // Einträge ohne Owner landen nicht im Grid
  }
  const date = entry.date || entry.entryDate || entry.entry_date;
  ...
});
```

**Ergebnis:**  
`GET /api/admin/overview/week` liefert `users`+`entries` mit konsistenten `user_id`-Werten; der Teamkalender zeigt nur Einträge mit sauberem Owner-Mapping, keine `unknown_*`-Keys mehr.

---

#### 2.2 Root Cause #2 – Confirm-Day bestätigt falschen Benutzer

**Entscheidung:** Variante A – Confirm-Day ist immer Self-Confirm; Admin kann **nicht** fremde Zeiten bestätigen. Der Button wird nur angezeigt, wenn der angezeigte Kalender dem eingeloggten Benutzer gehört.

**Änderungen (Frontend):**

- **Bedingung für Confirm-Button ergänzt:**

```3171:3203:app.js
const activeDayUserId = getCalendarViewUserId();
...
const hasPlannedEntries = dayTimeEntries.some(entry => entry.status === 'PLANNED');
const currentUserId = data.currentUser?.id || null;
const calendarViewUserId = getCalendarViewUserId();
const canConfirmDay = !!currentUserId && currentUserId === calendarViewUserId;
```

- **Button wird nur noch angezeigt, wenn `hasPlannedEntries && canConfirmDay`:**

```3238:3249,3280:3287:app.js
${hasPlannedEntries && canConfirmDay ? `
  <div class="day-view__confirm-section">
    <button class="btn-primary btn-confirm-day" data-action="confirm-day" data-date="${dateStr}">
      ...
    </button>
  </div>
` : ''}
```

- **Backend (`handleConfirmDay`) bleibt Self-Confirm-only:**  
`backend/api/time_entries.php` L25–42 bestätigt wie zuvor nur Einträge des Session-Users (auf Basis von `users.worker_id` / `created_by`).

**Ergebnis / Verhalten:**

- Admin im fremden Kalender: kein Confirm-Day-Button sichtbar → keine “tut nichts”-Situation.
- Admin im eigenen Kalender: Confirm-Day-Button sichtbar und funktional.
- Mitarbeiter: Confirm-Day-Button sichtbar und bestätigt nur eigene PLANNED-Einträge.

---

#### 2.3 Root Cause #3 – Doppelte Datenquellen (`data.timeEntries` vs. `workflowState.cache`)

**Ziel:** Single Source of Truth im Frontend – alle Views lesen aus `data.timeEntries`, Loader zentral in `loadTimeEntries`.

**Konsolidierung:**

- **`loadDayEntries` / `loadWeekEntries` auf `loadTimeEntries` umgestellt:**

```418:448:app.js
async function loadDayEntries(date, userId = null) {
  await loadTimeEntries(date, date);
}

async function loadWeekEntries(weekStart, userId = null) {
  const monday = new Date(weekStart);
  if (isNaN(monday.getTime())) return;
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const dateFrom = weekStart;
  const dateTo = sunday.toISOString().split('T')[0];
  await loadTimeEntries(dateFrom, dateTo);
}
```

- **Alter Cache in `workflowState.cache.dayEntries/weekEntries` wird nicht mehr verwendet**  
(`grep` zeigt keine verbliebenen Zugriffe).

- **`loadTimeEntries` bleibt die einzige Funktion, die `data.timeEntries` aus dem Backend befüllt:**

```8418:8468:app.js
async function loadTimeEntries(dateFrom = null, dateTo = null) {
  const calendarViewUserId = getCalendarViewUserId();
  ...
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const response = await api.getTimeEntries(params);
  if (response.success) {
    data.timeEntries = response.data || [];
  }
}
```

- **Confirm-Day & Wizard nutzen zentral `loadTimeEntries` (über die Wrapper):**

```2451:2471:app.js
if (response.ok || response.success) {
  await loadDayEntries(dateStr);
  ...
  await loadWeekEntries(weekStartStr);
  renderApp();
}
```

```9510:9524:app.js
if (response.success) {
  workflowState.selectedDate = entryDate;
  await loadDayEntries(entryDate);
  ...
  await loadWeekEntries(weekStartStr);
  ...
  renderApp();
}
```

**Ergebnis:**  
Nach Anlage oder Bestätigung eines Eintrags werden `data.timeEntries` für den relevanten Datumsbereich zentral aktualisiert; Day/Week/Year/Month/Intern lesen alle aus dieser einen Quelle.

---

#### 2.4 Root Cause #4 – Uneinheitliche Stundenberechnung

**Ziel:** Alle Stundenberechnungen laufen über dieselben Helpers: `entryMinutes(entry)` / `entryHours(entry)`.

**Konsolidierung:**

- **`getEntryHours` zu Alias auf `entryHours` gemacht:**

```58:63:app.js
function getEntryHours(entry) {
  // Alias auf entryHours, damit es keine zweite Berechnungslogik gibt
  return entryHours(entry);
}
```

- **Year-View (`renderYearView`) von `parseFloat(entry.hours)` auf `entryHours` umgestellt:**

```2858:2863:app.js
yearEntries.forEach(entry => {
  const dateStr = entry.entry_date;
  if (!daySummaries[dateStr]) {
    daySummaries[dateStr] = { total_hours: 0, by_category: {} };
  }
  const hours = entryHours(entry);
  daySummaries[dateStr].total_hours += hours;
  daySummaries[dateStr].by_category[entry.category] =
    (daySummaries[dateStr].by_category[entry.category] || 0) + hours;
});
```

- **Month-View (`renderMonthView`) analog angepasst:**

```3007:3013:app.js
const summary = monthData.summary[dateStr];
const hours = entryHours(entry);
summary.total_hours += hours;
summary.by_category[entry.category] =
  (summary.by_category[entry.category] || 0) + hours;
summary.by_location[entry.location_id] =
  (summary.by_location[entry.location_id] || 0) + hours;
```

- **Sidebar / Day-View / Teamkalender / Intern-Panel nutzen bereits `entryHours`/`groupByCategory`:**

```3190:3199:app.js
const dayTotal = dayTimeEntries.reduce((sum, entry) => sum + entryHours(entry), 0);
const categoryTotals = groupByCategory(dayTimeEntries);
```

```2722:2734,2751:2757:app.js
const dayTotal = dayEntries.reduce((sum, entry) => sum + entryHours(entry), 0);
const dayCategoryTotals = groupByCategory(dayEntries);
const weekCategoryTotals = groupByCategory(weekEntries);
```

```4805:4811:app.js
const hours = entryHours(entry); // Teamkalender
<div class="team-calendar__entry-hours">${hours.toFixed(2)}h</div>
```

**Ergebnis:**  
Alle Views (Day, Week-Sidebar, Year, Month, Teamkalender, Intern-Panel) nutzen dieselben Zeit-Helper (`entryHours`), keine direkten `parseFloat(entry.hours)`-Zugriffe mehr.

---

#### 2.5 Root Cause #5 – Intern-Panel mischt Logiken

**Ziel:** Intern-Panel verwendet dieselben Stunden- und Kategorienlogiken wie der Rest der Day-View.

**Änderungen:**

- **Einzelne interne Einträge nutzen `getEntryHours` (alias `entryHours`):**

```3845:3861:app.js
${dayTimeEntries.map(entry => {
  ...
  return `
    <div class="intern-entry-item">
      <span class="intern-entry-time">${entry.time_from || '—'}–${entry.time_to || '—'}</span>
      <span class="intern-entry-category">${categoryLabel}</span>
      <span class="intern-entry-hours">${getEntryHours(entry).toFixed(2)}h</span>
    </div>
  `;
}).join('')}
```

- **Day-View-Summaries für Kategorien/Tagesgesamt verwenden dieselben Daten (`dayTimeEntries`) und `entryHours` / `groupByCategory` (siehe 2.4).**

- **`dayTimeEntries` stammt in beiden Fällen aus derselben Filterlogik über `data.timeEntries` (Single Source of Truth).**

**Ergebnis:**  
Das Intern-Panel zeigt für jeden Eintrag dieselben Stunden wie die Sidebar/Time-Summary, da alle auf `entryHours(entry)` und derselben `dayTimeEntries`-Menge basieren.

---

### 3. Teamkalender – Final Check

- **Owner-Mapping:** Alle entries im Teamkalender haben `user_id`, der von `admin_overview.php` geliefert und vor dem Rendern geprüft wird.
- **Hours:** Teamkalender berechnet Zeiten pro Eintrag ausschließlich über `entryHours(entry)`.
- **Zeilen-Zuordnung:** Jede Zeile entspricht einem Eintrag in `teamData.users`; Einträge ohne validen `user_id` werden serverseitig gefiltert.

---

### 4. Retest Steps (10)

1. **Admin-Overview API Check**
   - Mit gültiger Admin-Session `GET /api/admin/overview/week?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` aufrufen.
   - Prüfen: `users.length > 0`, `entries.length > 0`, alle `entries[*].user_id` sind nicht null und kommen in `users[*].id` vor.

2. **Teamkalender UI – Basis**
   - Als Admin einloggen, Teamkalender über den Button “Teamkalender” öffnen.
   - Network-Tab: `GET /api/admin/overview/week...` 200 OK; UI zeigt alle erwarteten Mitarbeiter-Zeilen mit Einträgen.

3. **Teamkalender Stundenanzeige**
   - Einen Mitarbeiter wählen, der mehrere Einträge in der Woche hat (inkl. Projekten/Intern).
   - Prüfen: Stunden in den Zellen entsprechen der Differenz aus `time_from/time_to` und sind konsistent zu Day-View und Sidebar.

4. **Confirm-Day – Admin eigener Kalender**
   - Als Admin im eigenen Kalender einen Tag mit PLANNED-Einträgen öffnen.
   - Confirm-Button sichtbar; Klick triggert `POST /api/time_entries/confirm_day`, danach sind alle PLANNED-Einträge an diesem Tag in Day-View und Week-Grid als CONFIRMED markiert.

5. **Confirm-Day – Admin fremder Kalender**
   - Als Admin über Mitarbeiter-Auswahl den Kalender eines Mitarbeiters öffnen.
   - Prüfen: Kein Confirm-Button im Day-View sichtbar; keine Confirm-Requests im Network-Tab.

6. **Confirm-Day – Mitarbeiter**
   - Als normaler Mitarbeiter einloggen, Tag mit PLANNED-Einträgen öffnen.
   - Confirm-Button sichtbar; Klick bestätigt nur eigene Einträge und aktualisiert Day-View + Week-Grid konsistent.

7. **Wizard – Datum ändern & speichern**
   - Wizard öffnen, Datum auf z.B. nächstes Wochenende setzen, Zeit 08:00–12:00, Kategorie Büro.
   - Nach Speichern erscheint der Eintrag im Day-View des gewählten Datums und gleichzeitig im Week-Grid; Year/Month-Summary zeigt die hinzugekommenen Stunden korrekt.

8. **Intern-Panel vs. Sidebar**
   - Tag mit mindestens zwei internen Einträgen (ohne `location_id`) öffnen.
   - Vergleich: Summe der Stunden im Intern-Panel (Summe aller Zeilen) = Tages-Summe (Sidebar) und Kategorie-Summen stimmen mit Sidebar-Kategorien überein.

9. **Year-View / Month-View Konsistenz**
   - Für einen Mitarbeiter einige Einträge mit unterschiedlichen Kategorien anlegen.
   - In Year-View und Month-View prüfen: Tooltips (Stunden pro Tag) und Kategorie-Indikatoren reflektieren dieselben Summen wie Day-View/Sidebar.

10. **Cleanup-Planned & Nachladen**
    - Als Admin den Wartungs-Button “Alle PLANNED Einträge löschen” ausführen.
    - Bestätigen; anschließend Day-View, Week-Grid und Teamkalender für die Woche prüfen: Es existieren keine PLANNED-Einträge mehr, alle Ansichten sind synchron (nur CONFIRMED oder keine Einträge).




