# Technoova Dispo – UX-Neudefinition

**Regel:** Topbar bleibt unverändert. Alles darunter wird neu gedacht.

---

## 1. Was der Disponent morgens als Erstes sieht

- **Kritische Information:** Heute + aktuelle Woche, wer ist wo eingeplant, wer ist frei, welche Einsätze offen.
- **Sofort erreichbar:** Heute-Datum, Wochenübersicht, „+ Einsatz“, „Personal zuweisen“, Filter Tag/Woche/Monat.
- **Niemals versteckt:** Ressourcenliste (Personal/Fahrzeuge/Geräte), aktuelle Zeitspanne, Status der Einsätze, Konflikte.

**Erste Ansicht = ein einziges Planungsboard**, kein Wechsel zwischen „Planen“ und „Verwalten“-Tabs für die tägliche Arbeit. Verwalten (Stammdaten) bleibt erreichbar, aber die **Hauptarbeit** ist das Board.

---

## 2. Informationsarchitektur

### Hauptbereiche (ein Screen unter der Topbar)

| Zone | Inhalt | Breite (logisch) |
|------|--------|-------------------|
| **Ressourcen** | Personal, Fahrzeuge, Geräte – je nach Kontext eine Liste mit Status, Verfügbarkeit, Drag-Source | ~240px |
| **Planungsboard** | Zeitachse (Tag/Woche/Monat) × Einsätze; Zellen = Zuordnung Ressource ↔ Einsatz/Datum | flex 1 |
| **Kontext** | Aktuell gewählter Einsatz oder „Nicht im Einsatz“ für gewähltes Datum; schlank | ~260px |

### Logik

- **Links:** Ressourcen sind **Erstklassige Objekte**. Jede Zeile = eine Ressource mit Status (verfügbar, eingeplant, abwesend, Konflikt). Klick = Auswahl für Kontext. Drag = Zuweisung ins Board.
- **Mitte:** **Eine** Zeitachse mit Perspektiven Tag / Woche / Monat. Kein „View-Wechsel“ – nur Zoom: gleiche Daten, andere Granularität. Zeilen = Einsätze (oder Tage im Wochenmodus); Spalten = Tage oder Stunden.
- **Rechts:** Kontext zum Selektierten: entweder Einsatz-Detail (Ort, Zeitraum, Zugewiesene) oder „Nicht im Einsatz“ (Ressourcen ohne Planung am gewählten Tag).

---

## 3. Interaktionsmodell

- **Drag & Drop:** Ressource aus links auf eine Zelle im Board = Zuweisung (Personal zu Einsatz+Datum). Entfernen = Ressource aus Zelle rausziehen oder „Entfernen“ an der Zuweisung.
- **Direktes Zuweisen:** Klick auf Zelle → Inline „Ressource zuweisen“ (Dropdown oder Mini-Liste), kein Modal.
- **Inline-Bearbeitung:** Einsatzzeile: Klick auf Titel/Ort → Inline-Edit (oder kleines Bearbeiten-Icon). Kein Modal für Standardänderungen.
- **Modals nur für:** Einsatz **anlegen** (Ort, Zeitraum, Titel), Stammdaten (Personal/Fahrzeuge/Geräte/Orte verwalten). Alles andere im Board erledigen.

**Gleiche Aktion = gleiches Verhalten:** Zuweisung ist immer „Ressource + Einsatz + Datum“, egal ob per Drag oder Klick. Entfernen ist immer „Zuweisung löschen“, egal wo.

---

## 4. Layout & Komponenten

### Raster

- **App unter Topbar:** `display: grid; grid-template-columns: 240px 1fr 260px;` (Ressourcen | Board | Kontext). Auf schmalen Viewports: Kontext als Drawer/Overlay; Ressourcen kollabierbar.
- **Board:** Eigenes Raster: Zeilen = Einsätze (oder Tage), Spalten = Zeit (Tage oder Stunden). Klare Linien, keine verspielten Schatten.

### Karten-Logik

- **Einsatzzeile:** Eine horizontale Karte pro Einsatz (Ort + Titel + Zeitraum). Darin: pro Tag (oder Stunde) eine Zelle mit zugewiesenen Ressourcen (Chips).
- **Ressourcenzeile:** Eine Zeile pro Ressource: Avatar/Icon, Name, Status-Badge, optional „heute zugewiesen zu X“.

### Typografie & Dichte

- **Überschriften:** Eine klare H1 für „Planungsboard“ oder aktuellen Zeitraum. H2 für Zonen (Ressourcen, Kontext).
- **Konsistente Abstände:** 8px-Basis (--space-1 bis --space-4). Karten: 12px Padding, 1px Border.
- **Hohe Dichte:** Keine großen Leerflächen; kompakt, aber lesbar. Sekundäre Infos dezent (kleinere Schrift, gedämpfte Farbe).

### Zustände (immer sichtbar)

| Zustand | Bedeutung | Visuell |
|---------|-----------|---------|
| **geplant** | Einsatz/Planung angelegt, nicht bestätigt | Rahmen/Badge hell (z. B. gelb/grau) |
| **bestätigt** | Bestätigt | Grüner Akzent / Check |
| **Konflikt** | Doppelbuchung oder Regelverletzung | Roter Rand / Warn-Badge |
| **leer** | Keine Zuweisung | Gestrichelte Linie oder „—“ |
| **gesperrt** | Nicht editierbar (Berechtigung/Vergangenheit) | Ausgegraut, kein Hover-Aktion |
| **in Bearbeitung** | Temporär (z. B. Drag) | Leichter Hintergrund |

Kein Zustand nur implizit: Jeder Zustand hat ein klares visuelles Token (Farbe, Icon oder Badge).

---

## 5. Produktlogik dominiert

- **Einsatz anlegen:** Immer gleicher Ablauf (Ort, Titel, Start/Ende). Nach Anlegen: Einsatz erscheint sofort im Board.
- **Zuweisung:** Immer „Ressource + Einsatz + Datum“. Doppelbuchung = Warnung/Block, gleiche Regel überall.
- **Ressourcen:** Personal/Fahrzeuge/Geräte gleich behandelt (Status, Verfügbarkeit, Zuweisung). Nur die Liste links wechselt den Inhalt (Tab oder Kontext).

Keine Sonderfälle ohne Erklärung. Wenn etwas erklärungsbedürftig ist, wird das Design angepasst.

---

## 6. Technische Umsetzung (Kurz)

- **Neue Hauptview:** `PlanungsboardView` (eine Komponente/Seite unter der Topbar). Ersetzt die bisherige Planungs-Shell für die tägliche Arbeit.
- **Zonen:** `RessourcenPanel`, `Planungsboard`, `KontextPanel`. State: `ui.boardViewMode` (day | week | month), `ui.selectedResource`, `ui.selectedSlot`, `ui.selectedDate`.
- **CSS:** Neue Klasse-Namensräume (z. B. `board`, `board-resource`, `board-slot`, `board-context`), eigene Variablen für Abstände und Zustände. Bestehende Topbar-Styles unberührt.

Diese Datei ist die Referenz für alle weiteren Implementierungsentscheidungen.
