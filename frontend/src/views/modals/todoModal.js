/**
 * Todo Modal
 * Create/Edit todo modal
 */

import { 
  getState, 
  getTodo
} from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';

/**
 * Render todo modal
 * @param {object} todo - Existing todo (for edit) or null (for create)
 * @param {string} defaultScope - Default scope ('PLAN_DAY', 'PLAN_WEEK', 'ADMIN_GLOBAL')
 * @param {string} defaultScopeId - Default scope ID (date for PLAN_DAY/PLAN_WEEK)
 */
export function renderTodoModal(todo = null, defaultScope = null, defaultScopeId = null) {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  // Determine if editing
  const isEdit = !!todo;
  
  // Determine scope
  const scope = todo?.scope || defaultScope || 'PLAN_DAY';
  const scopeId = todo?.scopeId || todo?.scope_id || defaultScopeId || null;
  
  // Scope options
  const scopeOptions = [
    { value: 'PLAN_DAY', label: 'Tages-Notiz', requiresScopeId: true },
    { value: 'PLAN_WEEK', label: 'Wochen-Notiz', requiresScopeId: true },
    { value: 'ADMIN_GLOBAL', label: 'Allgemeine Notiz (Admin)', requiresScopeId: false }
  ];
  
  // Get active date for PLAN_DAY default
  const activeDate = state.ui.activeDate || 
                     (state.ui.calendarDate ? formatDateLocal(new Date(state.ui.calendarDate)) : null) ||
                     formatDateLocal(new Date());
  
  // Determine default scopeId based on scope
  let defaultScopeIdValue = scopeId;
  if (!defaultScopeIdValue && scope === 'PLAN_DAY') {
    defaultScopeIdValue = activeDate;
  } else if (!defaultScopeIdValue && scope === 'PLAN_WEEK') {
    // Get week start (Monday)
    const date = new Date(activeDate + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    defaultScopeIdValue = formatDateLocal(monday);
  }
  
  return `
    <div class="modal-overlay" data-close>
      <div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal__header">
          <div class="modal__title">${isEdit ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}</div>
          <button class="btn btn--ghost" id="btn-close-todo-modal">✕</button>
        </div>
        <form id="form-todo" data-todo-id="${todo?.id || ''}">
          <div class="modal__body">
            <div class="modal-section">
              <div class="modal-section__title">📝 Notiz</div>
              <div class="modal-section__content">
                <div class="field">
                  <label for="todo-title">Titel *</label>
                  <input 
                    type="text" 
                    id="todo-title" 
                    name="title" 
                    class="input" 
                    value="${todo?.title || ''}"
                    placeholder="Titel der Notiz..."
                    required 
                  />
                </div>
                <div class="field">
                  <label for="todo-description">Beschreibung</label>
                  <textarea 
                    id="todo-description" 
                    name="description" 
                    class="input" 
                    rows="4"
                    placeholder="Optionale Beschreibung..."
                  >${todo?.description || ''}</textarea>
                </div>
              </div>
            </div>
            
            <div class="modal-section">
              <div class="modal-section__title">📍 Bereich</div>
              <div class="modal-section__content">
                <div class="field-row">
                  <div class="field field--half">
                    <label for="todo-scope">Bereich *</label>
                    <select id="todo-scope" name="scope" class="select" required>
                      ${scopeOptions.map(opt => `
                        <option value="${opt.value}" ${scope === opt.value ? 'selected' : ''} ${!isAdmin(currentUser) && opt.value === 'ADMIN_GLOBAL' ? 'disabled' : ''}>
                          ${opt.label}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="field field--half" id="todo-scope-id-field" style="${scope === 'ADMIN_GLOBAL' ? 'display: none;' : ''}">
                    <label for="todo-scope-id">Datum/Woche</label>
                    <input 
                      type="date" 
                      id="todo-scope-id" 
                      name="scopeId" 
                      class="input" 
                      value="${defaultScopeIdValue || ''}"
                      ${scope === 'ADMIN_GLOBAL' ? '' : 'required'}
                    />
                  </div>
                </div>
                ${todo && todo.completed ? `
                  <div class="field">
                    <label>
                      <input 
                        type="checkbox" 
                        id="todo-completed" 
                        name="completed" 
                        checked
                      />
                      Erledigt
                    </label>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" id="btn-cancel-todo">Abbrechen</button>
            <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}


