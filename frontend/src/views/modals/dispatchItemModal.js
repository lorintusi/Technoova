/**
 * Dispatch Item Modal
 * Create/Edit dispatch item modal
 */

import { 
  getState, 
  getActiveDate,
  getDispatchItem,
  getDispatchAssignments
} from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';

/**
 * Render dispatch item modal
 * @param {object} item - Existing item (for edit) or null (for create)
 * @param {string} defaultDate - Default date (YYYY-MM-DD)
 */
export function renderDispatchItemModal(item = null, defaultDate = null) {
  const state = getState();
  const currentUser = state.data.currentUser;
  const canEdit = isAdmin(currentUser);
  
  if (!canEdit) {
    return '';
  }
  
  // Determine date
  const date = item?.date || defaultDate || getActiveDate() || formatDateLocal(new Date());
  
  // Determine if editing
  const isEdit = !!item;
  
  // Get locations
  const locations = state.data.locations || [];
  
  // Get workers, vehicles, devices
  const workers = state.data.workers || [];
  const vehicles = state.data.vehicles || [];
  const devices = state.data.devices || [];
  
  // Get existing assignments if editing
  const existingAssignments = item ? getDispatchAssignments(item.id) : [];
  const assignedWorkers = existingAssignments.filter(a => (a.resourceType || a.resource_type) === 'WORKER').map(a => a.resourceId || a.resource_id);
  const assignedVehicles = existingAssignments.filter(a => (a.resourceType || a.resource_type) === 'VEHICLE').map(a => a.resourceId || a.resource_id);
  const assignedDevices = existingAssignments.filter(a => (a.resourceType || a.resource_type) === 'DEVICE').map(a => a.resourceId || a.resource_id);
  
  // Categories
  const categories = [
    { value: 'PROJEKT', label: 'Projekt' },
    { value: 'SCHULUNG', label: 'Schulung' },
    { value: 'BUERO', label: 'Büro' },
    { value: 'TRAINING', label: 'Training' },
    { value: 'KRANK', label: 'Krank' },
    { value: 'MEETING', label: 'Meeting' }
  ];
  
  // Status options
  const statusOptions = [
    { value: 'PLANNED', label: 'Geplant' },
    { value: 'CONFIRMED', label: 'Bestätigt' },
    { value: 'CANCELLED', label: 'Abgesagt' }
  ];
  
  return `
    <div class="modal-overlay" data-close>
      <div class="modal modal--wide" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Einsatz bearbeiten' : 'Einsatz hinzufügen'}</div>
          <button class="btn btn--ghost" id="btn-close-dispatch-modal">✕</button>
        </div>
        <form id="form-dispatch-item" data-dispatch-item-id="${item?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">📍 Ort & Kategorie</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="dispatch-location">Baustelle *</label>
                    <select id="dispatch-location" name="locationId" class="select" required>
                      <option value="">-- Bitte wählen --</option>
                      ${locations.map(loc => `
                        <option value="${loc.id}" ${item && (item.locationId || item.location_id) === loc.id ? 'selected' : ''}>
                          ${loc.code || loc.title || loc.address || 'Unbekannt'}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="field field--half">
                    <label for="dispatch-category">Kategorie *</label>
                    <select id="dispatch-category" name="category" class="select" required>
                      ${categories.map(cat => `
                        <option value="${cat.value}" ${item && item.category === cat.value ? 'selected' : ''}>
                          ${cat.label}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📅 Datum & Zeit</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="dispatch-date">Datum *</label>
                    <input 
                      type="date" 
                      id="dispatch-date" 
                      name="date" 
                      class="input" 
                      value="${date}" 
                      required 
                    />
                  </div>
                  <div class="field field--half">
                    <label>
                      <input 
                        type="checkbox" 
                        id="dispatch-all-day" 
                        name="allDay" 
                        ${item && (item.allDay || item.all_day) ? 'checked' : ''}
                      />
                      Ganztägig
                    </label>
                  </div>
                </div>
                <div class="field-row" id="dispatch-time-row" style="${item && (item.allDay || item.all_day) ? 'display: none;' : ''}">
                  <div class="field field--half">
                    <label for="dispatch-start-time">Startzeit</label>
                    <input 
                      type="time" 
                      id="dispatch-start-time" 
                      name="startTime" 
                      class="input" 
                      value="${item?.startTime || item?.start_time || '08:00'}"
                    />
                  </div>
                  <div class="field field--half">
                    <label for="dispatch-end-time">Endzeit</label>
                    <input 
                      type="time" 
                      id="dispatch-end-time" 
                      name="endTime" 
                      class="input" 
                      value="${item?.endTime || item?.end_time || '17:00'}"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">👥 Ressourcen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Personal</label>
                  <select id="dispatch-workers" name="workers" class="select" multiple size="5">
                    ${workers.map(worker => `
                      <option value="${worker.id}" ${assignedWorkers.includes(worker.id) ? 'selected' : ''}>
                        ${worker.name}
                      </option>
                    `).join('')}
                  </select>
                  <small>Mehrfachauswahl möglich (Strg/Cmd + Klick)</small>
                </div>
                
                <div class="field">
                  <label>Fahrzeuge</label>
                  <select id="dispatch-vehicles" name="vehicles" class="select" multiple size="3">
                    ${vehicles.map(vehicle => `
                      <option value="${vehicle.id}" ${assignedVehicles.includes(vehicle.id) ? 'selected' : ''}>
                        ${vehicle.name || vehicle.licensePlate || vehicle.id}
                      </option>
                    `).join('')}
                  </select>
                  <small>Mehrfachauswahl möglich (Strg/Cmd + Klick)</small>
                </div>
                
                <div class="field">
                  <label>Geräte</label>
                  <select id="dispatch-devices" name="devices" class="select" multiple size="3">
                    ${devices.map(device => `
                      <option value="${device.id}" ${assignedDevices.includes(device.id) ? 'selected' : ''}>
                        ${device.name || device.serialNumber || device.id}
                      </option>
                    `).join('')}
                  </select>
                  <small>Mehrfachauswahl möglich (Strg/Cmd + Klick)</small>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📝 Weitere Informationen</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="dispatch-status">Status</label>
                    <select id="dispatch-status" name="status" class="select">
                      ${statusOptions.map(opt => `
                        <option value="${opt.value}" ${item && item.status === opt.value ? 'selected' : ''}>
                          ${opt.label}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label for="dispatch-note">Notiz</label>
                  <textarea 
                    id="dispatch-note" 
                    name="note" 
                    class="input" 
                    rows="3"
                    placeholder="Optionale Notiz zum Einsatz..."
                  >${item?.note || ''}</textarea>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            ${isEdit ? `
              <button type="button" class="btn btn--danger" id="btn-delete-dispatch" data-dispatch-item-id="${item.id}">Löschen</button>
            ` : ''}
            <button type="button" class="btn btn--ghost" id="btn-cancel-dispatch">Abbrechen</button>
            <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

