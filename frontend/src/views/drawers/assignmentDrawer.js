/**
 * Assignment Create/Edit Drawer
 */

import { getState } from '../../state/index.js';
import { getLocationById } from '../../state/selectors.js';

export function renderAssignmentDrawer(assignment = null) {
  const state = getState();
  const locations = state.data.locations || [];
  const isEdit = !!assignment;
  
  const title = isEdit ? 'Einsatz bearbeiten' : 'Einsatz erstellen';
  const submitText = isEdit ? 'Speichern' : 'Erstellen';
  
  // Pre-fill values if editing
  const values = {
    title: assignment?.title || '',
    location_id: assignment?.location_id || assignment?.locationId || '',
    start_date: assignment?.start_date || assignment?.startDate || '',
    end_date: assignment?.end_date || assignment?.endDate || '',
    all_day: assignment?.all_day !== undefined ? assignment.all_day : (assignment?.allDay !== undefined ? assignment.allDay : true),
    start_time: assignment?.start_time || assignment?.startTime || '08:00',
    end_time: assignment?.end_time || assignment?.endTime || '17:00',
    recurring: assignment?.recurring || false,
    notes: assignment?.notes || '',
    status: assignment?.status || 'Geplant'
  };
  
  const locationsOptions = locations
    .map(loc => {
      const label = loc.name || loc.code || loc.address || loc.referenz || `#${loc.id}`;
      const selected = loc.id == values.location_id ? 'selected' : '';
      return `<option value="${loc.id}" ${selected}>${label}</option>`;
    })
    .join('');
  
  return `
    <div class="drawer__header">
      <h2 class="drawer__title">${title}</h2>
      <button type="button" class="drawer__close" data-action="close-drawer">×</button>
    </div>
    <div class="drawer__body">
      <form class="drawer__form" id="assignment-form">
        <input type="hidden" name="id" value="${assignment?.id || ''}">
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Einsatzort</label>
          <select class="drawer__form-select" name="location_id" required>
            <option value="">-- Einsatzort wählen --</option>
            ${locationsOptions}
          </select>
          <div class="drawer__form-help">Der Einsatzort ist Pflicht für die Planung</div>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Titel</label>
          <input type="text" class="drawer__form-input" name="title" placeholder="z.B. Geländermontage" value="${values.title}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Startdatum</label>
          <input type="date" class="drawer__form-input" name="start_date" value="${values.start_date}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Enddatum</label>
          <input type="date" class="drawer__form-input" name="end_date" value="${values.end_date}" required />
        </div>
        
        <div class="drawer__form-group">
          <div class="drawer__form-toggle">
            <div class="drawer__toggle-switch ${values.all_day ? 'drawer__toggle-switch--active' : ''}" data-toggle="all_day">
              <input type="checkbox" name="all_day" style="display: none;" ${values.all_day ? 'checked' : ''} />
            </div>
            <label class="drawer__toggle-label">Ganztägig</label>
          </div>
        </div>
        
        <div id="time-fields" style="${values.all_day ? 'display: none;' : ''}">
          <div class="drawer__form-group">
            <label class="drawer__form-label">Startzeit</label>
            <input type="time" class="drawer__form-input" name="start_time" value="${values.start_time}" />
          </div>
          
          <div class="drawer__form-group">
            <label class="drawer__form-label">Endzeit</label>
            <input type="time" class="drawer__form-input" name="end_time" value="${values.end_time}" />
          </div>
        </div>
        
        <div class="drawer__form-group">
          <div class="drawer__form-toggle">
            <div class="drawer__toggle-switch ${values.recurring ? 'drawer__toggle-switch--active' : ''}" data-toggle="recurring">
              <input type="checkbox" name="recurring" style="display: none;" ${values.recurring ? 'checked' : ''} />
            </div>
            <label class="drawer__toggle-label">Wiederkehrend</label>
          </div>
          <div class="drawer__form-help">Automatisch für mehrere Wochen planen</div>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Status</label>
          <select class="drawer__form-select" name="status">
            <option value="Geplant" ${values.status === 'Geplant' ? 'selected' : ''}>Geplant</option>
            <option value="In Ausführung" ${values.status === 'In Ausführung' ? 'selected' : ''}>In Ausführung</option>
            <option value="Abgeschlossen" ${values.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
            <option value="Storniert" ${values.status === 'Storniert' ? 'selected' : ''}>Storniert</option>
          </select>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Beschreibung</label>
          <textarea class="drawer__form-textarea" name="notes" placeholder="Optional: Notizen zum Einsatz">${values.notes}</textarea>
        </div>
      </form>
    </div>
    <div class="drawer__footer">
      <button type="button" class="drawer__btn drawer__btn--secondary" data-action="close-drawer">Abbrechen</button>
      <button type="submit" class="drawer__btn drawer__btn--primary" data-action="save-assignment">${submitText}</button>
    </div>
  `;
}

