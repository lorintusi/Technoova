# PHASE 1 - ZEITERFASSUNG FLOW ANALYSE

## 1) KOMPLETTE ZEITERFASSUNG

| Teil | Funktion | Zeilen | Aktuelles Verhalten | Problemursache |
|------|----------|--------|---------------------|----------------|
| **Wizard öffnen** | `openTimeEntryWizard()` | 7819-7838 | Öffnet Wizard, setzt initiales Datum/Zeit | ✅ Funktioniert |
| **Formular rendern** | `renderTimeEntryWizard()` → `renderWizardStep1()` | 7930-7982 | Rendert Step 1 mit Datum/Zeit, Step 2 mit Kategorie, Step 3 mit Projekt | ✅ Funktioniert |
| **Speichern** | `saveTimeEntryFromWizard()` | 8477-8590 | Speichert Entry via `api.createTimeEntry()` | ✅ Funktioniert |
| **Start/Stop Timer** | ❌ NICHT VORHANDEN | - | KEINE Check-in/out Funktionalität | ❌ Backend fehlt - kein RUNNING state, keine start/stop API |

## 2) DATUM-FELD ANALYSE

| Aspekt | Wert | Problemursache |
|--------|------|----------------|
| **Input Type** | `<input type="date">` (Zeile 7937) | ✅ Korrekt |
| **Value Binding** | `value="${timeEntryWizardState.date}"` (Zeile 7937) | ⚠️ Wird bei jedem `renderApp()` neu gesetzt |
| **Handler** | `cloneAndReplaceElement(dateInput, (e) => { ... })` (Zeile 8248-8253) | ⚠️ `cloneAndReplaceElement()` klont Element → Input verliert Fokus/Wert bei `renderApp()` |
| **State Update** | `timeEntryWizardState.date = e.target.value; renderApp()` | ❌ `renderApp()` nach Änderung überschreibt Input |
| **Readonly/Disabled** | Nein | ✅ Nicht blockiert |

**PROBLEM:**
- Bei Datum-Änderung: Handler setzt `timeEntryWizardState.date`, dann wird `renderApp()` aufgerufen
- `renderApp()` rendert Wizard neu → Input wird mit `value="${timeEntryWizardState.date}"` neu gesetzt
- ABER: `cloneAndReplaceElement()` wird in Handler verwendet, was Element klont → Input verliert möglicherweise Fokus/Value
- **Ursache:** `renderApp()` wird nach State-Update aufgerufen, was Input neu rendert

**LÖSUNG:**
- Handler soll State aktualisieren, aber Input-Value soll nicht überschrieben werden wenn User gerade tippt
- ODER: Handler nur bei 'change' Event, nicht bei 'input'
- ODER: Input-Value nur initial setzen, dann User-Input respektieren

## 3) CHECK-IN / CHECK-OUT UI

| Aspekt | Status | Details |
|--------|--------|---------|
| **Start/Stop Buttons** | ❌ NICHT VORHANDEN | Keine UI für Check-in/out |
| **Running State** | ❌ NICHT VORHANDEN | Kein `timeEntryWizardState.isRunning` oder ähnlich |
| **Timer Display** | ❌ NICHT VORHANDEN | Keine Anzeige "Läuft seit HH:MM" |
| **API Support** | ❌ NICHT VORHANDEN | Kein `api.startTimer()` / `api.stopTimer()` |
| **Backend Support** | ❌ NICHT VORHANDEN | Kein `status='RUNNING'` Feld in Time Entries |

**PROBLEM:**
- Check-in/out Flow existiert NICHT
- Keine Start/Stop Funktionalität
- Keine RUNNING Status-Anzeige

**LÖSUNG:**
- Dokumentieren dass Backend fehlt
- UI kann erst implementiert werden wenn Backend `status` Feld hat
- Optional: Start/Stop Buttons hinzufügen mit klaren Labels, aber nur wenn Backend-Support existiert

---

## ZUSAMMENFASSUNG

**Hauptproblem #1: Datum kann nicht ausgewählt werden**
- Ursache: `renderApp()` überschreibt Input-Value nach State-Update
- Fix: Input-Value nur initial setzen, User-Input respektieren

**Hauptproblem #2: Check-in/out Flow fehlt**
- Ursache: Backend-Support fehlt komplett
- Fix: Dokumentieren, UI kann erst nach Backend-Update implementiert werden
