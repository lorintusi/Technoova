/**
 * Vehicle Modal
 * Create/Edit vehicle form
 */

import { getState } from '../../state/index.js';

/**
 * Render vehicle modal
 * @param {object|null} vehicle - Vehicle object (null for create)
 */
export function renderVehicleModal(vehicle = null) {
  const isEdit = !!vehicle;
  
  const vehicleTypes = [
    { value: 'LKW', label: 'LKW' },
    { value: 'PKW', label: 'PKW' },
    { value: 'Kran', label: 'Kran' },
    { value: 'Bagger', label: 'Bagger' },
    { value: 'Transporter', label: 'Transporter' },
    { value: 'Sonstiges', label: 'Sonstiges' }
  ];
  
  const statusOptions = [
    { value: 'available', label: 'Verfügbar' },
    { value: 'in_use', label: 'Im Einsatz' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'unavailable', label: 'Nicht verfügbar' }
  ];
  
  return `
    <div class="modal-overlay" data-close="vehicle-modal">
      <div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}</div>
          <button class="btn btn--ghost" id="btn-close-vehicle-modal">✕</button>
        </div>
        <form id="form-vehicle" data-vehicle-id="${vehicle?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">🚗 Fahrzeug-Informationen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="vehicle-name">Name *</label>
                  <input 
                    type="text" 
                    id="vehicle-name" 
                    name="name" 
                    class="input" 
                    value="${vehicle?.name || ''}" 
                    required 
                    placeholder="z.B. LKW-01"
                  />
                </div>
                
                <div class="field">
                  <label for="vehicle-type">Typ</label>
                  <select id="vehicle-type" name="type" class="select">
                    <option value="">— Bitte wählen —</option>
                    ${vehicleTypes.map(type => `
                      <option value="${type.value}" ${vehicle?.type === type.value ? 'selected' : ''}>
                        ${type.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="field">
                  <label for="vehicle-license-plate">Kennzeichen</label>
                  <input 
                    type="text" 
                    id="vehicle-license-plate" 
                    name="licensePlate" 
                    class="input" 
                    value="${vehicle?.licensePlate || vehicle?.license_plate || ''}" 
                    placeholder="z.B. ZH-12345"
                  />
                </div>
                
                <div class="field">
                  <label for="vehicle-status">Status</label>
                  <select id="vehicle-status" name="status" class="select">
                    ${statusOptions.map(status => `
                      <option value="${status.value}" ${(vehicle?.status || 'available') === status.value ? 'selected' : ''}>
                        ${status.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="field">
                  <label for="vehicle-notes">Notizen</label>
                  <textarea 
                    id="vehicle-notes" 
                    name="notes" 
                    class="input input--textarea" 
                    rows="3"
                    placeholder="Optionale Notizen zum Fahrzeug"
                  >${vehicle?.notes || ''}</textarea>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" id="btn-cancel-vehicle-modal">Abbrechen</button>
            <button type="submit" class="btn btn--primary">
              ${isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Open vehicle modal
 * @param {object|null} vehicle - Vehicle object (null for create)
 */
export function openVehicleModal(vehicle = null) {
  const modalHost = document.getElementById('modal-host') || document.body;
  const html = renderVehicleModal(vehicle);
  modalHost.insertAdjacentHTML('beforeend', html);
  
  // Focus first input
  const firstInput = modalHost.querySelector('#vehicle-name');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close vehicle modal
 */
export function closeVehicleModal() {
  const modal = document.querySelector('[data-close="vehicle-modal"]');
  if (modal) {
    modal.remove();
  }
}


