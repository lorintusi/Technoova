# PHASE 3 Frontend Fixes - Status Badges, Confirm/Reject, Wochensoll

## Patch Summary

| Feature | Datei | Zeilen | Beschreibung |
|---------|-------|--------|--------------|
| Status Helper Functions | app.js | 3125-3155 | `getStatusLabel()`, `getStatusClass()`, `minutesBetween()` Helper-Funktionen |
| Status Badge Day View | app.js | 3405-3412 | Status Badge in Tagesübersicht mit Helper-Funktion |
| Status Badge Week View | app.js | 4450-4453 | Status Badge in Wochenansicht Blocks |
| Confirm/Reject Buttons | app.js | 3414-3423 | Buttons nur für Mitarbeiter, nur eigene, nur PLANNED |
| Confirm/Reject Handler | app.js | 2081-2151 | Event-Delegation Handler mit API-Calls |
| Wochensoll Berechnung | app.js | 4253-4280 | Robuste Stundenberechnung mit `minutesBetween()` |
| Wochensoll Anzeige | app.js | 4489-4506 | Summary-Bar in Week View Header |

## Neue data-action Attribute

- `data-action="confirm-time-entry"` - Bestätigen Button
- `data-action="reject-time-entry"` - Ablehnen Button
- `data-entry-id="..."` - Entry ID für Confirm/Reject

## Retest Steps

### Mitarbeiter (Nicht-Admin)
1. Login als Mitarbeiter
2. Navigiere zu Tagesansicht
3. Prüfe: PLANNED Einträge zeigen "Geplant" Badge
4. Prüfe: Buttons "Bestätigen" und "Ablehnen" sind sichtbar
5. Klick "Bestätigen" → Status wird "Bestätigt", Badge ändert sich
6. Navigiere zu Wochenansicht
7. Prüfe: Status Badges in allen Blocks sichtbar
8. Prüfe: Wochensoll-Summary zeigt Soll/Geplant/Bestätigt/Differenz

### Admin
1. Login als Admin
2. Prüfe: Keine Confirm/Reject Buttons sichtbar (auch bei PLANNED)
3. Prüfe: Status Badges sind sichtbar
4. Prüfe: Wochensoll-Summary funktioniert

### Console Checks
- Keine doppelten Event-Listener (Guards: `confirmRejectHandlersBound`)
- Keine Syntax Errors
- Keine Runtime Errors beim Rendern

