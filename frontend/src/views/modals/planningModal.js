/**
 * Planning Modal (Personal & Ressourcen einplanen)
 * Viaplano-Workflow: Personal für Einsatz an bestimmten Tagen einplanen
 */

import { getState } from '../../state/index.js';

/**
 * Render planning modal (Personal & Ressourcen einplanen)
 * @param {object} options - { assignment_id, date, dispatch_assignment (für Edit) }
 */
export function renderPlanningModal(options = {}) {
  const state = getState();
  const assignments = state.data.assignments || [];
  // Nur verfügbare Mitarbeiter (Arbeitsbereit) für Planung anzeigen
  const workers = (state.data.workers || []).filter(
    (w) => (w.status || '').toLowerCase() === 'arbeitsbereit'
  );
  const vehicles = state.data.vehicles || [];
  const devices = state.data.devices || [];
  
  const isEdit = !!options.dispatch_assignment;
  const dispatchAssignment = options.dispatch_assignment;
  
  // Pre-select values
  const selectedAssignmentId = dispatchAssignment?.assignment_id || options.assignment_id || '';
  const selectedWorkerId = dispatchAssignment?.worker_id || '';
  const selectedDate = dispatchAssignment?.date || options.date || '';
  const selectedVehicleIds = dispatchAssignment?.vehicle_ids || [];
  const selectedDeviceIds = dispatchAssignment?.device_ids || [];
  const notes = dispatchAssignment?.notes || '';
  
  return `
    <div class="modal-overlay" data-close="planning-modal">
      <div class="modal modal--wide" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Planung bearbeiten' : 'Personal & Ressourcen einplanen'}</div>
          <button class="btn btn--ghost" id="btn-close-planning-modal">✕</button>
        </div>
        <form id="form-planning" data-dispatch-assignment-id="${dispatchAssignment?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">📍 Einsatz & Datum</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="planning-assignment">Einsatz *</label>
                  <select 
                    id="planning-assignment" 
                    name="assignment_id" 
                    class="input" 
                    required
                    ${isEdit ? 'disabled' : ''}
                  >
                    <option value="">-- Einsatz wählen --</option>
                    ${assignments.map(assignment => {
                      const location = state.data.locations.find(l => l.id === assignment.location_id);
                      const locationName = location ? (location.code || location.address) : 'Unbekannt';
                      return `
                        <option value="${assignment.id}" ${selectedAssignmentId == assignment.id ? 'selected' : ''}>
                          ${assignment.title} (${locationName})
                        </option>
                      `;
                    }).join('')}
                  </select>
                  ${assignments.length === 0 ? `
                    <small class="field-hint" style="color: #e74c3c;">
                      Keine Einsätze vorhanden. Bitte erstellen Sie zuerst einen Einsatz.
                    </small>
                  ` : ''}
                </div>
                
                <div class="field">
                  <label for="planning-date">Datum *</label>
                  <input 
                    type="date" 
                    id="planning-date" 
                    name="date" 
                    class="input" 
                    value="${selectedDate}" 
                    required 
                    ${isEdit ? 'disabled' : ''}
                  />
                  <small class="field-hint">Für mehrere Tage: Modal mehrfach öffnen oder Bulk-Funktion nutzen (unten).</small>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">👤 Personal</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="planning-worker">Mitarbeiter *</label>
                  <select 
                    id="planning-worker" 
                    name="worker_id" 
                    class="input" 
                    required
                  >
                    <option value="">-- Mitarbeiter wählen --</option>
                    ${workers.map(worker => `
                      <option value="${worker.id}" ${selectedWorkerId == worker.id ? 'selected' : ''}>
                        ${worker.name} (${worker.role || 'Mitarbeiter'})
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🚗 Fahrzeuge (optional)</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Fahrzeuge auswählen</label>
                  <div class="checkbox-list">
                    ${vehicles.length === 0 ? `
                      <p class="empty-state-text">Keine Fahrzeuge vorhanden</p>
                    ` : vehicles.map(vehicle => `
                      <label class="checkbox-item">
                        <input 
                          type="checkbox" 
                          name="vehicle_ids" 
                          value="${vehicle.id}"
                          ${selectedVehicleIds.includes(vehicle.id) ? 'checked' : ''}
                        />
                        <span>${vehicle.name || vehicle.license_plate || `Fahrzeug ${vehicle.id}`}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🔧 Geräte (optional)</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Geräte auswählen</label>
                  <div class="checkbox-list">
                    ${devices.length === 0 ? `
                      <p class="empty-state-text">Keine Geräte vorhanden</p>
                    ` : devices.map(device => `
                      <label class="checkbox-item">
                        <input 
                          type="checkbox" 
                          name="device_ids" 
                          value="${device.id}"
                          ${selectedDeviceIds.includes(device.id) ? 'checked' : ''}
                        />
                        <span>${device.name || `Gerät ${device.id}`}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📝 Notizen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="planning-notes">Notizen für diesen Tag</label>
                  <textarea 
                    id="planning-notes" 
                    name="notes" 
                    class="input input--textarea" 
                    rows="2"
                    placeholder="z.B. Startzeit, besondere Hinweise, etc."
                  >${notes}</textarea>
                </div>
              </div>
            </div>
            
            ${!isEdit ? `
              <div class="modal-section modal-section--highlight">
                <div class="modal-section__title">📅 Mehrere Tage (Bulk)</div>
                <div class="modal-section__content">
                  <div class="field">
                    <label>
                      <input type="checkbox" id="planning-bulk-mode" />
                      <span>Für mehrere aufeinanderfolgende Tage einplanen</span>
                    </label>
                  </div>
                  <div id="planning-bulk-fields" style="display: none;">
                    <div class="field">
                      <label for="planning-end-date">Enddatum</label>
                      <input 
                        type="date" 
                        id="planning-end-date" 
                        name="end_date" 
                        class="input" 
                      />
                      <small class="field-hint">Planung wird für alle Tage von Startdatum bis Enddatum erstellt.</small>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-planning-modal">Abbrechen</button>
            <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Einplanen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Open planning modal
 */
export function openPlanningModal(options = {}) {
  const modalRoot = document.getElementById('modal-root') || document.body;
  modalRoot.insertAdjacentHTML('beforeend', renderPlanningModal(options));
  
  // Setup bulk mode toggle
  const bulkCheckbox = document.getElementById('planning-bulk-mode');
  const bulkFields = document.getElementById('planning-bulk-fields');
  if (bulkCheckbox && bulkFields) {
    bulkCheckbox.addEventListener('change', (e) => {
      bulkFields.style.display = e.target.checked ? 'block' : 'none';
    });
  }
}

/**
 * Close planning modal
 */
export function closePlanningModal() {
  const modal = document.querySelector('[data-close="planning-modal"]');
  if (modal) {
    modal.remove();
  }
}


