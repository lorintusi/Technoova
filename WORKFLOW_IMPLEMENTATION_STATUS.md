# Viaplano-Workflow: Implementierungs-Status

## ✅ ABGESCHLOSSEN

### A) Datenmodell & API Contract
- ✅ **Entscheidung:** `assignments` = Einsätze, `dispatch_assignments` = Planungen pro Tag
- ✅ **Server:** Bulk-Endpoint `/backend/api/dispatch_assignments/bulk` implementiert
- ✅ **Server:** Query-Filter für `dispatch_assignments` (worker_id, assignment_id, date_from, date_to)
- ✅ **Frontend API:** `endpoints.js` erweitert mit CRUD für dispatch_assignments + bulk
- ✅ **Dokumentation:** `WORKFLOW_DATENMODELL.md` erstellt

### B) UI-Komponenten erstellt
- ✅ `frontend/src/views/modals/assignmentModal.js` - Einsatz erstellen/bearbeiten
- ✅ `frontend/src/views/modals/planningModal.js` - Personal & Ressourcen einplanen

---

## ⏳ VERBLEIBEND (Implementierung erforderlich)

### C) Event-Handler erstellen
**Datei:** `frontend/src/handlers/assignmentHandlers.js` (NEU)

```javascript
import { on } from './events.js';
import { api } from '../api/endpoints.js';
import { getState, setState } from '../state/index.js';
import { renderApp } from '../views/renderApp.js';
import { openAssignmentModal, closeAssignmentModal } from '../views/modals/assignmentModal.js';
import { openPlanningModal, closePlanningModal } from '../views/modals/planningModal.js';
import { showToast } from '../utils/ui.js';

export function bindAssignmentHandlers() {
  // Open create assignment modal
  on('click', '#btn-add-assignment', (e) => {
    e.preventDefault();
    openAssignmentModal();
  });
  
  // Save assignment form
  on('submit', '#form-assignment', async (e) => {
    e.preventDefault();
    const form = e.target;
    const assignmentId = form.getAttribute('data-assignment-id');
    const isEdit = !!assignmentId;
    
    const data = {
      location_id: parseInt(form.querySelector('[name="location_id"]').value),
      title: form.querySelector('[name="title"]').value.trim(),
      start_date: form.querySelector('[name="start_date"]').value,
      end_date: form.querySelector('[name="end_date"]').value,
      notes: form.querySelector('[name="notes"]').value.trim(),
      status: form.querySelector('[name="status"]').value
    };
    
    try {
      let response;
      if (isEdit) {
        response = await api.updateAssignment(assignmentId, data);
      } else {
        response = await api.createAssignment(data);
      }
      
      if (response.success) {
        // Reload assignments
        const assignmentsResponse = await api.getAssignments();
        if (assignmentsResponse.success) {
          setState({
            data: {
              ...getState().data,
              assignments: assignmentsResponse.data || []
            }
          });
        }
        
        closeAssignmentModal();
        renderApp();
        showToast(isEdit ? 'Einsatz aktualisiert' : 'Einsatz erstellt', 'success');
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      showToast(`Fehler: ${error.message}`, 'error');
    }
  });
  
  // Open planning modal
  on('click', '#btn-add-planning', (e) => {
    e.preventDefault();
    openPlanningModal();
  });
  
  // Save planning form
  on('submit', '#form-planning', async (e) => {
    e.preventDefault();
    const form = e.target;
    const dispatchAssignmentId = form.getAttribute('data-dispatch-assignment-id');
    const isEdit = !!dispatchAssignmentId;
    
    const assignmentId = parseInt(form.querySelector('[name="assignment_id"]').value);
    const date = form.querySelector('[name="date"]').value;
    const workerId = parseInt(form.querySelector('[name="worker_id"]').value);
    const vehicleIds = Array.from(form.querySelectorAll('[name="vehicle_ids"]:checked')).map(cb => parseInt(cb.value));
    const deviceIds = Array.from(form.querySelectorAll('[name="device_ids"]:checked')).map(cb => parseInt(cb.value));
    const notes = form.querySelector('[name="notes"]').value.trim();
    
    // Check for bulk mode
    const bulkMode = form.querySelector('#planning-bulk-mode')?.checked;
    const endDate = form.querySelector('[name="end_date"]')?.value;
    
    try {
      // Check for double booking
      const existingResponse = await api.getDispatchAssignments({ worker_id: workerId, date });
      if (existingResponse.success && existingResponse.data && existingResponse.data.length > 0) {
        const existing = existingResponse.data.find(d => d.assignment_id !== assignmentId);
        if (existing) {
          const confirmMsg = `Warnung: Mitarbeiter ist am ${date} bereits für einen anderen Einsatz eingeplant. Trotzdem fortfahren?`;
          if (!confirm(confirmMsg)) {
            return;
          }
        }
      }
      
      let response;
      if (isEdit) {
        response = await api.updateDispatchAssignment(dispatchAssignmentId, {
          vehicle_ids: vehicleIds,
          device_ids: deviceIds,
          notes
        });
      } else if (bulkMode && endDate) {
        // Bulk: Generate dates array
        const dates = generateDateRange(date, endDate);
        response = await api.createDispatchAssignmentsBulk({
          assignment_id: assignmentId,
          dates,
          worker_id: workerId,
          vehicle_ids: vehicleIds,
          device_ids: deviceIds,
          notes
        });
      } else {
        response = await api.createDispatchAssignment({
          assignment_id: assignmentId,
          date,
          worker_id: workerId,
          vehicle_ids: vehicleIds,
          device_ids: deviceIds,
          notes
        });
      }
      
      if (response.success) {
        // Reload dispatch_assignments
        const dispatchResponse = await api.getDispatchAssignments();
        if (dispatchResponse.success) {
          setState({
            data: {
              ...getState().data,
              dispatchAssignments: dispatchResponse.data || []
            }
          });
        }
        
        closePlanningModal();
        renderApp();
        showToast(isEdit ? 'Planung aktualisiert' : 'Planung erstellt', 'success');
      }
    } catch (error) {
      console.error('Error saving planning:', error);
      showToast(`Fehler: ${error.message}`, 'error');
    }
  });
  
  // Close modals
  on('click', '[data-close="assignment-modal"]', (e) => {
    if (e.target === e.currentTarget) closeAssignmentModal();
  });
  on('click', '#btn-close-assignment-modal, #btn-cancel-assignment-modal', closeAssignmentModal);
  
  on('click', '[data-close="planning-modal"]', (e) => {
    if (e.target === e.currentTarget) closePlanningModal();
  });
  on('click', '#btn-close-planning-modal, #btn-cancel-planning-modal', closePlanningModal);
}

// Helper: Generate date range
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.setDate() + 1);
  }
  
  return dates;
}
```

### D) Bootstrap Integration
**Datei:** `frontend/src/bootstrap.js`

Füge hinzu:
```javascript
import { bindAssignmentHandlers } from './handlers/assignmentHandlers.js';

// In bootstrap() function:
bindAssignmentHandlers();
```

### E) UI-Integration: Buttons hinzufügen
**Datei:** `frontend/src/views/planning/planningShell.js`

Füge Buttons hinzu:
```html
<button class="btn btn--primary" id="btn-add-assignment">
  + Einsatz
</button>
<button class="btn btn--primary" id="btn-add-planning">
  + Personal einplanen
</button>
```

### F) State erweitern
**Datei:** `frontend/src/state/store.js`

Füge hinzu:
```javascript
assignments: [],
dispatchAssignments: []
```

### G) Data Loading
**Datei:** `frontend/src/bootstrap.js` oder wo `loadAllData()` ist

Füge hinzu:
```javascript
const assignmentsResponse = await api.getAssignments();
const dispatchAssignmentsResponse = await api.getDispatchAssignments();

setState({
  data: {
    ...state.data,
    assignments: assignmentsResponse.success ? assignmentsResponse.data : [],
    dispatchAssignments: dispatchAssignmentsResponse.success ? dispatchAssignmentsResponse.data : []
  }
});
```

---

## 📝 Testplan

### Test 1: Location erstellen
1. Login als Admin
2. "Verwalten" → "🏗️ Baustellen"
3. "+ Baustelle hinzufügen"
4. Code: `TEST-LOC`, Adresse: `Teststrasse 1`
5. Speichern → ✅ Liste aktualisiert

### Test 2: Einsatz erstellen
1. "+ Einsatz" Button klicken
2. Baustelle: `TEST-LOC`, Titel: `Test-Einsatz`
3. Start: `2026-01-27`, End: `2026-01-31`
4. Speichern → ✅ Einsatz erscheint

### Test 3: Personal einplanen
1. "+ Personal einplanen" Button klicken
2. Einsatz: `Test-Einsatz`, Datum: `2026-01-27`
3. Mitarbeiter: `Ivan Majanovic`
4. Speichern → ✅ Planung erscheint im Kalender

### Test 4: Mehrere Tage (Bulk)
1. "+ Personal einplanen"
2. Bulk-Mode aktivieren
3. Start: `2026-01-28`, End: `2026-01-30`
4. Speichern → ✅ 3 Planungen erstellt

### Test 5: Doppelbuchung
1. "+ Personal einplanen"
2. Selber Mitarbeiter, selbes Datum, anderer Einsatz
3. Speichern → ⚠️ Warnung anzeigen

### Test 6: Worker-Ansicht
1. Logout, Login als `test1`
2. Nur eigene Planungen sichtbar
3. Keine Edit/Create Buttons

### Test 7: Persistenz
1. Server-Restart
2. Alle Einsätze & Planungen bleiben erhalten

---

## 🚀 Nächste Schritte

1. ✅ Erstelle `assignmentHandlers.js` mit obigem Code
2. ✅ Integriere in `bootstrap.js`
3. ✅ Füge Buttons in UI ein
4. ✅ Erweitere State & Data Loading
5. ✅ Teste manuell im Browser
6. ✅ Optional: Kalender-Ansicht verbessern (Planungen anzeigen)

**Geschätzte Zeit:** 30-60 Minuten für vollständige Integration + Tests


