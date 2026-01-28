/**
 * Assignment Modal (Einsatz erstellen/bearbeiten)
 * Viaplano-Workflow: Einsatzort → Einsatz → Personal planen
 */

import { getState } from '../../state/index.js';

/**
 * Render assignment modal (create/edit)
 */
export function renderAssignmentModal(assignment = null) {
  const state = getState();
  const locations = state.data.locations || [];
  const isEdit = !!assignment;
  
  return `
    <div class="modal-overlay" data-close="assignment-modal">
      <div class="modal modal--wide" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Einsatz bearbeiten' : 'Neuer Einsatz'}</div>
          <button class="btn btn--ghost" id="btn-close-assignment-modal">✕</button>
        </div>
        <form id="form-assignment" data-assignment-id="${assignment?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">📍 Einsatzort & Details</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="assignment-location">Baustelle / Einsatzort *</label>
                  <select 
                    id="assignment-location" 
                    name="location_id" 
                    class="input" 
                    required
                  >
                    <option value="">-- Baustelle wählen --</option>
                    ${locations.map(loc => `
                      <option value="${loc.id}" ${assignment?.location_id === loc.id ? 'selected' : ''}>
                        ${loc.code || loc.address}
                      </option>
                    `).join('')}
                  </select>
                  ${locations.length === 0 ? `
                    <small class="field-hint" style="color: #e74c3c;">
                      Keine Baustellen vorhanden. Bitte erstellen Sie zuerst eine Baustelle unter "Verwalten" → "🏗️ Baustellen".
                    </small>
                  ` : ''}
                </div>
                
                <div class="field">
                  <label for="assignment-title">Titel / Beschreibung *</label>
                  <input 
                    type="text" 
                    id="assignment-title" 
                    name="title" 
                    class="input" 
                    placeholder="z.B. Geländermontage, Stahlbau, etc." 
                    value="${assignment?.title || ''}" 
                    required 
                  />
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📅 Zeitraum</div>
              <div class="modal-section__content">
                <div class="field-group field-group--horizontal">
                  <div class="field">
                    <label for="assignment-start-date">Startdatum *</label>
                    <input 
                      type="date" 
                      id="assignment-start-date" 
                      name="start_date" 
                      class="input" 
                      value="${assignment?.start_date || ''}" 
                      required 
                    />
                  </div>
                  <div class="field">
                    <label for="assignment-end-date">Enddatum *</label>
                    <input 
                      type="date" 
                      id="assignment-end-date" 
                      name="end_date" 
                      class="input" 
                      value="${assignment?.end_date || ''}" 
                      required 
                    />
                  </div>
                </div>
                <small class="field-hint">Der Zeitraum definiert, wann Personal und Ressourcen eingeplant werden können.</small>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📝 Notizen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="assignment-notes">Notizen / Besonderheiten</label>
                  <textarea 
                    id="assignment-notes" 
                    name="notes" 
                    class="input input--textarea" 
                    rows="3"
                    placeholder="z.B. Anzahl benötigter Mitarbeiter, spezielle Anforderungen, etc."
                  >${assignment?.notes || ''}</textarea>
                </div>
                
                <div class="field">
                  <label for="assignment-status">Status</label>
                  <select 
                    id="assignment-status" 
                    name="status" 
                    class="input"
                  >
                    <option value="Geplant" ${!assignment || assignment?.status === 'Geplant' ? 'selected' : ''}>Geplant</option>
                    <option value="In Ausführung" ${assignment?.status === 'In Ausführung' ? 'selected' : ''}>In Ausführung</option>
                    <option value="Abgeschlossen" ${assignment?.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                    <option value="Pausiert" ${assignment?.status === 'Pausiert' ? 'selected' : ''}>Pausiert</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-assignment-modal">Abbrechen</button>
            <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Einsatz erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Open assignment modal
 */
export function openAssignmentModal(assignment = null) {
  const modalRoot = document.getElementById('modal-root') || document.body;
  modalRoot.insertAdjacentHTML('beforeend', renderAssignmentModal(assignment));
}

/**
 * Close assignment modal
 */
export function closeAssignmentModal() {
  const modal = document.querySelector('[data-close="assignment-modal"]');
  if (modal) {
    modal.remove();
  }
}


