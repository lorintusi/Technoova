/**
 * Planning Entry Modal
 * Create/Edit planning entry modal
 */

import { 
  getState, 
  getActiveDate, 
  getSelectedPlanningWorkerId, 
  getActiveWorkerId, 
  getActiveUserId,
  getMedicalCertificateByPlanningEntryId
} from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { getPlanningSource, getCreatedByRole } from '../../utils/permissions.js';

/**
 * Render planning entry modal
 * @param {object} entry - Existing entry (for edit) or null (for create)
 * @param {string} defaultDate - Default date (YYYY-MM-DD)
 * @param {string|number} defaultWorkerId - Default worker ID
 */
export function renderPlanningEntryModal(entry = null, defaultDate = null, defaultWorkerId = null) {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  // Determine worker ID
  const workerId = defaultWorkerId || 
                   getSelectedPlanningWorkerId() || 
                   getActiveWorkerId() || 
                   getActiveUserId();
  
  // Determine date
  const date = entry?.date || defaultDate || getActiveDate() || formatDateLocal(new Date());
  
  // Determine if editing
  const isEdit = !!entry;
  
  // Get locations
  const locations = state.data.locations || [];
  
  // Categories according to business rules
  const categories = [
    { value: 'PROJEKT', label: 'Projekt', requiresProject: true },
    { value: 'SCHULUNG', label: 'Schulung', requiresProject: false },
    { value: 'BUERO', label: 'Büro (Allgemein)', requiresProject: false },
    { value: 'TRAINING', label: 'Training', requiresProject: false },
    { value: 'KRANK', label: 'Krank', requiresProject: false, requiresMedicalCertificate: true },
    { value: 'MEETING', label: 'Meeting', requiresProject: false }
  ];
  
  // Determine selected category requirements
  const selectedCategory = entry?.category || '';
  const categoryObj = categories.find(c => c.value === selectedCategory);
  const requiresProject = categoryObj?.requiresProject || false;
  const requiresMedicalCertificate = categoryObj?.requiresMedicalCertificate || false;
  
  // Check if existing certificate exists
  const existingCertificate = entry?.id ? getMedicalCertificateByPlanningEntryId(entry.id) : null;
  
  // Get worker name for display
  const worker = state.data.workers.find(w => w.id === workerId);
  const workerName = worker?.name || 'Unbekannt';
  
  return `
    <div class="modal-overlay" data-close>
      <div class="modal modal--wide" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Planung bearbeiten' : 'Planungsblock hinzufügen'}</div>
          <button class="btn btn--ghost" id="btn-close-planning-modal">✕</button>
        </div>
        <form id="form-planning-entry" data-planning-entry-id="${entry?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">👤 Mitarbeiter</div>
              <div class="modal-section__content">
                <div class="field">
                  <label>Planen für:</label>
                  <div class="input input--readonly">${workerName}</div>
                  <input type="hidden" name="workerId" value="${workerId}" />
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📅 Datum & Zeit</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="planning-date">Datum *</label>
                    <input 
                      type="date" 
                      id="planning-date" 
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
                        id="planning-all-day" 
                        name="allDay" 
                        ${entry?.allDay ? 'checked' : ''}
                      />
                      Ganztägig
                    </label>
                  </div>
                </div>
                
                <div class="field-row" id="planning-time-row" style="${entry?.allDay ? 'display: none;' : ''}">
                  <div class="field field--half">
                    <label for="planning-start-time">Von *</label>
                    <input 
                      type="time" 
                      id="planning-start-time" 
                      name="startTime" 
                      class="input" 
                      value="${entry?.startTime || entry?.time_from || '08:00'}" 
                      required 
                    />
                  </div>
                  <div class="field field--half">
                    <label for="planning-end-time">Bis *</label>
                    <input 
                      type="time" 
                      id="planning-end-time" 
                      name="endTime" 
                      class="input" 
                      value="${entry?.endTime || entry?.time_to || '17:00'}" 
                      required 
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📍 Kategorie & Projekt</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="planning-category">Kategorie *</label>
                  <select id="planning-category" name="category" class="input" required>
                    <option value="">-- Bitte wählen --</option>
                    ${categories.map(cat => `
                      <option value="${cat.value}" ${entry?.category === cat.value ? 'selected' : ''}>
                        ${cat.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="field" id="planning-project-field" style="${requiresProject ? '' : 'display: none;'}">
                  <label for="planning-location">Baustelle/Projekt *</label>
                  <select id="planning-location" name="locationId" class="input" ${requiresProject ? 'required' : ''}>
                    <option value="">-- Bitte wählen --</option>
                    ${locations.map(loc => `
                      <option value="${loc.id}" ${entry?.locationId === loc.id ? 'selected' : ''}>
                        ${loc.code || loc.address || loc.name || 'Unbekannt'}
                      </option>
                    `).join('')}
                  </select>
                  ${locations.length === 0 ? `
                    <small class="field-hint field-hint--error">
                      Keine Baustellen vorhanden. Bitte zuerst eine Baustelle in der Verwaltung anlegen.
                    </small>
                  ` : ''}
                </div>
                
                <div class="field" id="planning-medical-certificate-field" style="${requiresMedicalCertificate ? '' : 'display: none;'}">
                  <label for="planning-medical-certificate">Arztzeugnis *</label>
                  ${existingCertificate ? `
                    <div class="medical-certificate-preview">
                      <span class="medical-certificate-status">✓ Arztzeugnis vorhanden: ${existingCertificate.filenameOriginal || 'Datei'}</span>
                      <a href="${existingCertificate.downloadUrl || '#'}" 
                         class="btn-link" 
                         data-action="view-medical-certificate" 
                         data-certificate-id="${existingCertificate.id}"
                         target="_blank">Anzeigen</a>
                    </div>
                    <div class="field-hint">Neues Arztzeugnis hochladen (ersetzt vorhandenes):</div>
                  ` : ''}
                  <input 
                    type="file" 
                    id="planning-medical-certificate" 
                    name="medicalCertificate" 
                    class="input" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    ${requiresMedicalCertificate && !existingCertificate ? 'required' : ''}
                  />
                  <small class="field-hint">PDF oder Bild (JPG/PNG) hochladen (max. 10MB)</small>
                </div>
                
                <div class="field">
                  <label for="planning-note">Notiz (optional)</label>
                  <textarea 
                    id="planning-note" 
                    name="note" 
                    class="input input--textarea" 
                    rows="3"
                    placeholder="Zusätzliche Informationen..."
                  >${entry?.note || ''}</textarea>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-planning-modal">Abbrechen</button>
            <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Hinzufügen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}


