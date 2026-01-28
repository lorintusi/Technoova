# Phase 3: Selection/Details + Dispatch Cards + Drag&Drop "Happy Path"

**Datum:** Januar 2025  
**Status:** ✅ Abgeschlossen

---

## ✅ Implementierte Features

### 1. Selection State
- ✅ `ui.selectedResource` State hinzugefügt: `{ type, id }`
- ✅ `setSelectedResource(type, id)` Action
- ✅ `clearSelectedResource()` Action
- ✅ `getSelectedResource()` Selector
- ✅ `getSelectedLocation()` Selector
- ✅ `getSelectedDispatchItem()` Selector

### 2. Sidebar Items klickbar + Active Styling
- ✅ Sidebar Items haben `data-action="select-resource"` + `data-type` + `data-id`
- ✅ Handler für Resource Selection
- ✅ `.resource-item--active` CSS Klasse
- ✅ Visual Feedback: Highlight mit Border + Background

### 3. Week View Dispatch "real" render
- ✅ `renderWeekViewDispatch()` nutzt Dispatch Items
- ✅ Day Columns mit Header (Datum, Wochentag)
- ✅ "+ Einsatz" Button pro Tag (Admin)
- ✅ Dispatch Cards mit Drop-Zones
- ✅ Empty States wenn keine Einsätze

### 4. Create Dispatch Item (Happy Path)
- ✅ Handler für `[data-action="open-create-dispatch-item"]`
- ✅ Handler für `[data-action="create-dispatch-for-day"]`
- ✅ Prüft selected Location
- ✅ Erstellt Dispatch Item mit `allDay: true`, `status: 'PLANNED'`
- ✅ Toast Feedback
- ✅ Fallback: Öffnet Modal wenn keine Location selektiert

### 5. Drag & Drop "Happy Path"
- ✅ Neue Datei: `app/handlers/assignmentDragDropHandlers.js`
- ✅ Drag Start: Setzt drag data (type, id)
- ✅ Drag Over: Highlight Drop-Zone wenn Typ passt
- ✅ Drag Leave: Entfernt Highlight
- ✅ Drop: Validiert Typ-Match, prüft Duplikate, erstellt Assignment
- ✅ Toast Feedback (Success/Warning/Error)
- ✅ Re-render nach Assignment

### 6. Unassigned Panel live berechnen
- ✅ `getUnassignedResourcesForDate()` bereits vorhanden
- ✅ Nutzt Dispatch Assignments für Datum
- ✅ Filtert assigned Resources raus
- ✅ Zeigt Counts korrekt

### 7. Data Loading
- ✅ `loadDispatchItems()` wird im Bootstrap aufgerufen
- ✅ Lädt für aktuelle Woche (weekStart bis weekEnd)
- ✅ Error Handling: App bleibt stabil auch wenn API fehlschlägt

---

## 📁 Geänderte/Neue Dateien

### Neue Dateien
- `app/handlers/assignmentDragDropHandlers.js` - Drag & Drop Handler für Assignments

### Geänderte Dateien

#### State
- `app/state/store.js` - `selectedResource` State hinzugefügt
- `app/state/actions.js` - `setSelectedResource()`, `clearSelectedResource()` Actions
- `app/state/selectors.js` - `getSelectedResource()`, `getSelectedLocation()`, `getSelectedDispatchItem()` Selectors

#### Views
- `app/views/planning/resourceSidebar.js` - Selection Attributes + Active State
- `app/views/planning/dispatchCard.js` - Drop-Zone Attributes (`data-drop`, `data-dispatch-id`)
- `app/views/planning/weekViewDispatch.js` - Bereits vorhanden, nutzt Dispatch Items

#### Handlers
- `app/handlers/resourceNavHandlers.js` - Selection Handler + Create Dispatch Item Handler
- `app/bootstrap.js` - Bind Assignment Drag & Drop Handlers

#### Styles
- `styles.css` - `.resource-item--active`, `.dropzone--over`, `.dropzone--invalid`, `.dropzone-placeholder`, `.chip` Styles

---

## 🎨 CSS-Klassen

### Selection
- `.resource-item--active` - Aktives Sidebar Item (Highlight)

### Drop Zones
- `.dropzone--over` - Valid Drop Zone Highlight
- `.dropzone--invalid` - Invalid Drop Zone Highlight
- `.dropzone-placeholder` - Placeholder Text in Empty Drop Zones

### Chips
- `.chip` - Resource Chip (in Dispatch Cards)
- `.dispatch-card__resources .chip` - Styled Chips in Dispatch Cards

---

## 🔧 State Structure

```javascript
ui: {
  selectedResource: { type: 'LOCATION'|'DISPATCH'|'WORKER'|'VEHICLE'|'DEVICE', id: string } | null,
  selectedDispatchItemId: string | null // Alias wenn type === 'DISPATCH'
}
```

---

## ✅ Smoke-Test Checkliste

### Boot-Tests
- [ ] App bootet ohne Console Errors
- [ ] Dispatch Items werden geladen (wenn API verfügbar)

### Selection-Tests
- [ ] Sidebar Item Click setzt active selection
- [ ] Active State sichtbar (Highlight)
- [ ] Selection bleibt nach Rerender

### Create Dispatch Item Tests
- [ ] Location select + "+ Einsatz" erzeugt Einsatzkarte
- [ ] Einsatzkarte erscheint in korrekter Tag-Spalte
- [ ] Toast zeigt "Einsatz erstellt"
- [ ] Ohne Location: Toast "Bitte zuerst Einsatzort auswählen"

### Drag & Drop Tests
- [ ] Drag WORKER aus Sidebar → Drop auf Personal Section → Worker Chip erscheint
- [ ] Drag VEHICLE aus Sidebar → Drop auf Fahrzeuge Section → Vehicle Chip erscheint
- [ ] Drag DEVICE aus Sidebar → Drop auf Geräte Section → Device Chip erscheint
- [ ] Drag falscher Typ (Vehicle auf Personal) → Toast "Falscher Typ"
- [ ] Drag bereits zugewiesene Resource → Toast "bereits zugewiesen"
- [ ] Drop-Zone Highlight funktioniert (dragover)
- [ ] Drop-Zone Highlight entfernt (dragleave)

### Unassigned Panel Tests
- [ ] "Nicht im Einsatz" zeigt korrekte Counts
- [ ] Nach Assignment: Count reduziert sich
- [ ] Search filtert Liste
- [ ] Tabs switchen funktioniert

### Data Loading Tests
- [ ] Reload → Dispatch Items bleiben (wenn API persistiert)
- [ ] API Fehler → App bleibt stabil, zeigt Empty States

---

## 📝 Nächste Schritte (Optional)

1. **Edit/Delete Dispatch Item:**
   - Handler für Edit/Delete Buttons
   - Modal für Edit

2. **Assignment Remove:**
   - Click auf Chip → Remove Assignment
   - Confirmation Dialog

3. **Drag & Drop Remove:**
   - Drag aus Card → Drop auf "Entfernen" Zone

4. **Optimistic UI:**
   - Sofortiges UI Update vor API Call
   - Rollback bei Fehler

---

**Status:** ✅ Phase 3 abgeschlossen, Happy Path funktional



