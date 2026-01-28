/**
 * Device Modal
 * Create/Edit device form
 */

import { getState } from '../../state/index.js';

/**
 * Render device modal
 * @param {object|null} device - Device object (null for create)
 */
export function renderDeviceModal(device = null) {
  const isEdit = !!device;
  
  const deviceTypes = [
    { value: 'Bagger', label: 'Bagger' },
    { value: 'Kran', label: 'Kran' },
    { value: 'Kompressor', label: 'Kompressor' },
    { value: 'Schweißgerät', label: 'Schweißgerät' },
    { value: 'Generator', label: 'Generator' },
    { value: 'Sonstiges', label: 'Sonstiges' }
  ];
  
  const statusOptions = [
    { value: 'available', label: 'Verfügbar' },
    { value: 'in_use', label: 'Im Einsatz' },
    { value: 'maintenance', label: 'Wartung' },
    { value: 'unavailable', label: 'Nicht verfügbar' }
  ];
  
  return `
    <div class="modal-overlay" data-close="device-modal">
      <div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Gerät bearbeiten' : 'Neues Gerät'}</div>
          <button class="btn btn--ghost" id="btn-close-device-modal">✕</button>
        </div>
        <form id="form-device" data-device-id="${device?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">🔧 Geräte-Informationen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="device-name">Name *</label>
                  <input 
                    type="text" 
                    id="device-name" 
                    name="name" 
                    class="input" 
                    value="${device?.name || ''}" 
                    required 
                    placeholder="z.B. Bagger-01"
                  />
                </div>
                
                <div class="field">
                  <label for="device-type">Typ</label>
                  <select id="device-type" name="type" class="select">
                    <option value="">— Bitte wählen —</option>
                    ${deviceTypes.map(type => `
                      <option value="${type.value}" ${device?.type === type.value ? 'selected' : ''}>
                        ${type.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="field">
                  <label for="device-serial-number">Seriennummer</label>
                  <input 
                    type="text" 
                    id="device-serial-number" 
                    name="serialNumber" 
                    class="input" 
                    value="${device?.serialNumber || device?.serial_number || ''}" 
                    placeholder="z.B. SN-12345"
                  />
                </div>
                
                <div class="field">
                  <label for="device-status">Status</label>
                  <select id="device-status" name="status" class="select">
                    ${statusOptions.map(status => `
                      <option value="${status.value}" ${(device?.status || 'available') === status.value ? 'selected' : ''}>
                        ${status.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="field">
                  <label for="device-notes">Notizen</label>
                  <textarea 
                    id="device-notes" 
                    name="notes" 
                    class="input input--textarea" 
                    rows="3"
                    placeholder="Optionale Notizen zum Gerät"
                  >${device?.notes || ''}</textarea>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" id="btn-cancel-device-modal">Abbrechen</button>
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
 * Open device modal
 * @param {object|null} device - Device object (null for create)
 */
export function openDeviceModal(device = null) {
  const modalHost = document.getElementById('modal-host') || document.body;
  const html = renderDeviceModal(device);
  modalHost.insertAdjacentHTML('beforeend', html);
  
  // Focus first input
  const firstInput = modalHost.querySelector('#device-name');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close device modal
 */
export function closeDeviceModal() {
  const modal = document.querySelector('[data-close="device-modal"]');
  if (modal) {
    modal.remove();
  }
}


