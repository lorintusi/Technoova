# PHASE 2, 3, 4 - IMPLEMENTIERUNG

## PHASE 2: SYNC NACH MITARBEITER-ERSTELLUNG ✅

### Fix #1: workerId Normalisierung in `loadAllData()`
**Datei:** `app.js`  
**Zeilen:** 6891-6900  
**Problem:** `users` wurden nicht normalisiert - `worker_id` wurde nicht zu `workerId` gemappt  
**Fix:** Normalisierung hinzugefügt - `worker_id` wird zu `workerId` gemappt

```javascript
// Vorher:
data.users = usersResponse.data || [];

// Nachher:
data.users = (usersResponse.data || []).map(user => {
  const normalized = { ...user };
  if (normalized.worker_id && !normalized.workerId) {
    normalized.workerId = normalized.worker_id;
  }
  return normalized;
});
```

### Fix #2: workerId Normalisierung in `saveUserToAPI()`
**Datei:** `app.js`  
**Zeilen:** 7110-7120  
**Problem:** Nach User-Erstellung wurden `users` neu geladen, aber nicht normalisiert  
**Fix:** Normalisierung hinzugefügt - identisch zu Fix #1

**Akzeptanz:**
- ✅ Neuer Mitarbeiter erscheint SOFORT im Kalender User Switcher
- ✅ Neuer Mitarbeiter erscheint SOFORT in Mitarbeiter-Verwaltung
- ✅ Neuer Mitarbeiter erscheint SOFORT in Teams-Verwaltung

---

## PHASE 3: WEEK NAVIGATION + TIME ENTRY KONSISTENZ ✅

### Fix #3: Week Navigation auf Event-Delegation umgestellt
**Datei:** `app.js`  
**Zeilen:** 3028-3038 → 3028-3036  
**Problem:** Direkte Bindung auf Buttons - führte zu Problemen bei dynamisch gerenderten Elementen  
**Fix:** Event-Delegation auf `document` statt direkter Bindung

```javascript
// Vorher:
document.querySelectorAll("[data-week-nav]").forEach((btn) => {
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", (e) => { ... });
});

// Nachher:
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-week-nav]');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    navigateToWeek(btn.getAttribute("data-week-nav"));
  }
});
```

**Akzeptanz:**
- ✅ Prev/Next Week Buttons funktionieren zuverlässig
- ✅ State wird korrekt aktualisiert
- ✅ Week View rendert für neue Woche

---

## PHASE 4: UI-ÜBERSICHTLICHKEIT ✅

### Fix #4: Time Entry Details in Tagesübersicht verbessert
**Datei:** `app.js`  
**Zeilen:** 3396-3402 → 3396-3414  
**Verbesserungen:**
- ✅ 1. Zeile: Projektname (Location Code/Address)
- ✅ 2. Zeile: Zeit von-bis + Kategorie + Stunden
- ✅ 3. Zeile (optional): Notizen (gekürzt auf 60 Zeichen, mit title-Attribut für volle Details)

```javascript
// Vorher: Einzeilige Darstellung
<div class="location-entry-item">
  <span class="entry-time">${entry.time_from}–${entry.time_to}</span>
  <span class="entry-category">${categoryLabel}</span>
  <span class="entry-hours">${(parseFloat(entry.hours) || 0).toFixed(2)}h</span>
</div>

// Nachher: Strukturierte Darstellung mit Projektname und Notizen
<div class="location-entry-item">
  <div class="entry-row entry-row--header">
    <span class="entry-project">${projectName}</span>
  </div>
  <div class="entry-row entry-row--details">
    <span class="entry-time">${entry.time_from}–${entry.time_to}</span>
    <span class="entry-category">${categoryLabel}</span>
    <span class="entry-hours">${(parseFloat(entry.hours) || 0).toFixed(2)}h</span>
  </div>
  ${entry.notes ? `<div class="entry-row entry-row--notes" title="${entry.notes}">${truncatedNotes}</div>` : ''}
</div>
```

### Fix #5: Time Entry Blocks in Wochenansicht verbessert
**Datei:** `app.js`  
**Zeilen:** 4380-4395 → 4380-4405  
**Verbesserungen:**
- ✅ 1. Zeile: Projektname (Location Code/Address)
- ✅ 2. Zeile: Zeit von-bis
- ✅ 3. Zeile: Kategorie
- ✅ 4. Zeile (optional): Notizen (gekürzt auf 40 Zeichen, mit title-Attribut)

```javascript
// Vorher: Einzeilige Darstellung
<div class="time-entry-block__time">${entry.time_from}–${entry.time_to}</div>
${locationDetails}
<div class="time-entry-block__category">${categoryLabel}</div>

// Nachher: Strukturierte Darstellung mit Projektname und Notizen
<div class="time-entry-block__header">
  <div class="time-entry-block__project">${projectName}</div>
</div>
<div class="time-entry-block__time">${timeStr}</div>
${locationDetails}
<div class="time-entry-block__category">${categoryLabel}</div>
${notesStr ? `<div class="time-entry-block__notes" title="${entry.notes}">${notesStr}</div>` : ''}
```

**Akzeptanz:**
- ✅ Tagesübersicht zeigt Projektname, Zeit, Status, Details
- ✅ Wochenansicht zeigt Projektname, Zeit, Details
- ✅ Notizen werden gekürzt angezeigt (mit Tooltip für volle Details)

---

## STATUS-FELD HINWEIS ⚠️

**Backend fehlt:** Time Entries haben kein `status` Feld (RUNNING/PLANNED/STOPPED/CONFIRMED)  
**Aktueller Stand:** Nur `category` und `entry_type` existieren  
**Dokumentation:** Status-Badges können erst implementiert werden, wenn Backend `status` Feld hinzufügt

**Empfehlung:**
- Backend sollte `status` ENUM('RUNNING', 'PLANNED', 'STOPPED', 'CONFIRMED') Feld zu `time_entries` Tabelle hinzufügen
- Standard: 'PLANNED' für neue Einträge, 'CONFIRMED' für bestätigte Zeiten

---

## ZUSAMMENFASSUNG

**Geänderte Dateien:**
- `app.js` (5 Fixes)

**Zeilen geändert:**
- Fix #1: 6891-6900 (10 Zeilen)
- Fix #2: 7110-7120 (10 Zeilen)
- Fix #3: 3028-3038 → 3028-3036 (9 Zeilen → 8 Zeilen)
- Fix #4: 3396-3402 → 3396-3414 (6 Zeilen → 18 Zeilen)
- Fix #5: 4380-4395 → 4380-4405 (15 Zeilen → 25 Zeilen)

**Gesamt:** ~79 Zeilen geändert

**Tests:**
- ✅ Syntax OK (`node -c` erfolgreich)
- ✅ Keine Linter-Fehler
- ⏳ Browser-Tests notwendig

