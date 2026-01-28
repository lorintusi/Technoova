/**
 * Location Management View
 * CRUD interface for Baustellen/Projekte
 */

import { getState } from '../../state/index.js';
import { showLoadingState, showEmpty, showError } from '../../utils/loadingStates.js';

/**
 * Render location management view
 */
export function renderLocationManagementView() {
  const state = getState();
  const locations = state.data.locations || [];
  
  return `
    <div class="location-management">
      <div class="location-management__header">
        <div>
          <h2>Baustellenverwaltung</h2>
          <p>Projekte und Baustellen verwalten, die für die Planung verwendet werden.</p>
        </div>
        <div class="location-management__actions">
          <button class="btn btn--primary" id="btn-add-location">
            <span class="btn-icon">+</span>
            <span class="btn-text">Baustelle hinzufügen</span>
          </button>
        </div>
      </div>
      
      ${locations.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">🏗️</div>
          <div class="empty-state__title">Keine Baustellen vorhanden</div>
          <div class="empty-state__message">Erstellen Sie Ihre erste Baustelle, um mit der Planung zu beginnen.</div>
          <button class="btn btn--primary" id="btn-add-location-empty">Baustelle hinzufügen</button>
        </div>
      ` : `
        <div class="location-list" id="location-list-container">
          ${locations.map(location => renderLocationCard(location)).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Render location card
 */
function renderLocationCard(location) {
  const code = location.code || 'Kein Code';
  const address = location.address || 'Keine Adresse';
  const description = location.description || '';
  const resources = location.resourcesRequired || location.resources_required || [];
  const resourcesDisplay = Array.isArray(resources) ? resources.join(', ') : '';
  
  return `
    <div class="location-card" data-location-id="${location.id}">
      <div class="location-card__header">
        <div class="location-card__title">
          <h3>${code}</h3>
          <span class="location-card__address">${address}</span>
        </div>
        <div class="location-card__actions">
          <button class="btn-icon" data-action="edit-location" data-location-id="${location.id}" title="Bearbeiten">✏️</button>
          <button class="btn-icon" data-action="delete-location" data-location-id="${location.id}" title="Löschen">🗑️</button>
        </div>
      </div>
      ${description ? `
        <div class="location-card__description">${description}</div>
      ` : ''}
      ${resourcesDisplay ? `
        <div class="location-card__resources">
          <strong>Ressourcen:</strong> ${resourcesDisplay}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render location modal (create/edit)
 */
export function renderLocationModal(location = null) {
  const isEdit = !!location;
  const resources = location?.resourcesRequired || location?.resources_required || [];
  const resourcesStr = Array.isArray(resources) ? resources.join(', ') : '';
  
  return `
    <div class="modal-overlay" data-close="location-modal">
      <div class="modal modal--wide" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Baustelle bearbeiten' : 'Neue Baustelle'}</div>
          <button class="btn btn--ghost" id="btn-close-location-modal">✕</button>
        </div>
        <form id="form-location" data-location-id="${location?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">📋 Baustellen-Informationen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="location-code">Projektcode / Name *</label>
                  <input 
                    type="text" 
                    id="location-code" 
                    name="code" 
                    class="input" 
                    placeholder="z.B. PROJ-2024-001" 
                    value="${location?.code || ''}" 
                    required 
                  />
                </div>
                <div class="field">
                  <label for="location-address">Adresse *</label>
                  <input 
                    type="text" 
                    id="location-address" 
                    name="address" 
                    class="input" 
                    placeholder="Strasse Nr, PLZ Ort" 
                    value="${location?.address || ''}" 
                    required 
                  />
                </div>
                <div class="field">
                  <label for="location-description">Beschreibung / Notiz</label>
                  <textarea 
                    id="location-description" 
                    name="description" 
                    class="input input--textarea" 
                    rows="3"
                    placeholder="Zusätzliche Informationen zur Baustelle..."
                  >${location?.description || ''}</textarea>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">🔧 Ressourcen</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="location-resources">Ressourcen (kommagetrennt)</label>
                  <input 
                    type="text" 
                    id="location-resources" 
                    name="resources" 
                    class="input" 
                    placeholder="z.B. LKW, Schweissgerät, Kran" 
                    value="${resourcesStr}" 
                  />
                  <small class="field-hint">Geben Sie Ressourcen durch Komma getrennt ein (z.B. LKW, Schweissgerät, Kran)</small>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-location-modal">Abbrechen</button>
            <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

