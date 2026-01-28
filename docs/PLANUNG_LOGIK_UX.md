# Planungslogik & UX – Technoova Dispo

## Zentrales Planungsmodell (Viaplano)

**Führende Entität:** `assignments` (Einsätze)  
**Abhängige Entität:** `dispatch_assignments` (Planungen pro Tag)

- **Einsatz** = Baustelle + Zeitraum (start_date, end_date) + Titel, Notizen, Status
- **Planung** = Ein Mitarbeiter an einem bestimmten Tag einem Einsatz zugewiesen (+ optional Fahrzeuge, Geräte)

### Ableitung in der UI

- **Slots** werden aus Einsätzen abgeleitet: pro Einsatz und pro Tag im Zeitraum ergibt ein Slot.
- **„Nicht im Einsatz“** = Mitarbeiter mit Status „Arbeitsbereit“, die am gewählten Datum keine `dispatch_assignment` haben.
- **Konflikte:** Doppelbuchung = gleicher Mitarbeiter, gleiches Datum, anderer Einsatz → Warnung beim Einplanen.

### Regeln

1. Jeder Klick hat eine Konsequenz (keine rein dekorativen Aktionen).
2. State ist die einzige Wahrheit; UI leitet sich daraus ab.
3. Leere Bereiche haben klare Bedeutung (Empty State mit Handlungsaufforderung).
4. Nur Mitarbeiter mit Status „Arbeitsbereit“ können eingeplant werden.

## Workflows

### Einsatz anlegen

- Start: Button „+ Einsatz“ (oder „+ Einsatz“ pro Tag in der Wochenansicht öffnet „Personal einplanen“ mit Datum).
- Pflicht: Baustelle, Titel, Start-, Enddatum.
- Nach Speichern: State-Update, Liste/Slots aktualisieren, Modal schließen.

### Personal einplanen

- Start: „+ Personal einplanen“ oder „+ Einsatz“ auf einem Tag (öffnet Planning-Modal mit Datum).
- Pflicht: Einsatz, Datum, Mitarbeiter.
- Optional: Fahrzeuge, Geräte, Notizen.
- Doppelbuchung: Prüfung vor Speichern, Warnung mit Bestätigung.

### Ressourcen entfernen

- Pro Karte: Nur **Mitarbeiter**-Pill kann entfernt werden (löscht die gesamte Planungszeile).
- Fahrzeuge/Geräte-Pills sind Anzeige; Änderung über Bearbeiten der Planung.

## Empty States

- **Keine Einsätze:** „Keine Einsätze – zuerst Einsatz anlegen“
- **Tag ohne Planung:** „Keine Planung an diesem Tag“
- **Nicht im Einsatz:** Panel zeigt nur verfügbare (Arbeitsbereit) und nicht eingeplante Mitarbeiter

## Erweiterungen (optional)

- Worker-Status „Urlaub“/„Krank“ als eigene Systemzustände und ggf. Abwesenheits-Bereich in der UI.
- Fahrzeug/Gerät aus einer Planungszeile entfernen (PUT mit angepassten vehicle_ids/device_ids).
