/**
 * User Management Modal
 * Create/Edit user modal
 */

import { getState } from '../../state/index.js';
import { openModal, closeModal } from './modalHost.js';

const MODAL_ID = 'user-modal';

/**
 * Render user modal
 * @param {object} user - Existing user (for edit) or null (for create)
 */
export function renderUserModal(user = null) {
  const state = getState();
  const isEdit = !!user;
  
  // Roles
  const roles = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Dispatcher', label: 'Dispatcher' },
    { value: 'Worker', label: 'Worker' },
    { value: 'Viewer', label: 'Viewer' }
  ];
  
  // Permissions
  const availablePermissions = [
    'Lesen',
    'Schreiben',
    'Verwalten',
    'manage_users',
    'plan',
    'view_all',
    'view_own'
  ];
  
  const userPermissions = user?.permissions || [];
  
  const html = `
    <div class="modal-overlay" id="${MODAL_ID}" onclick="if(event.target === this) window.closeUserModal && window.closeUserModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${isEdit ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen'}</h2>
          <button class="modal-close" data-close="user-modal">&times;</button>
        </div>
        <form id="form-user" data-user-id="${user?.id || ''}">
          <div class="modal-body">
            <div class="form-group">
              <label for="user-name">Name *</label>
              <input type="text" id="user-name" name="name" value="${user?.name || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="user-username">Benutzername *</label>
              <input type="text" id="user-username" name="username" value="${user?.username || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="user-email">E-Mail *</label>
              <input type="email" id="user-email" name="email" value="${user?.email || ''}" required>
            </div>
            
            ${!isEdit ? `
            <div class="form-group">
              <label for="user-password">Passwort *</label>
              <input type="password" id="user-password" name="password" required>
            </div>
            ` : ''}
            
            <div class="form-group">
              <label for="user-role">Rolle *</label>
              <select id="user-role" name="role" required>
                ${roles.map(r => `
                  <option value="${r.value}" ${user?.role === r.value ? 'selected' : ''}>${r.label}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label>Berechtigungen</label>
              <div class="permissions-checklist">
                ${availablePermissions.map(perm => `
                  <label class="checkbox-label">
                    <input type="checkbox" name="permissions" value="${perm}" 
                           ${userPermissions.includes(perm) ? 'checked' : ''}>
                    <span>${perm}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="form-group">
              <label for="user-worker-id">Worker ID (optional)</label>
              <input type="text" id="user-worker-id" name="worker_id" value="${user?.worker_id || user?.workerId || ''}">
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-secondary" data-close="user-modal">Abbrechen</button>
            <button type="submit" class="btn-primary">${isEdit ? 'Speichern' : 'Erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  openModal(MODAL_ID, html);
}

/**
 * Open create user modal
 */
export function openCreateUserModal() {
  renderUserModal(null);
}

/**
 * Open edit user modal
 */
export function openEditUserModal(userId) {
  const state = getState();
  const user = state.data.users?.find(u => u.id === userId);
  if (user) {
    renderUserModal(user);
  }
}

/**
 * Close user modal
 */
export function closeUserModal() {
  closeModal(MODAL_ID);
}

// Export for inline onclick handler
if (typeof window !== 'undefined') {
  window.closeUserModal = closeUserModal;
}

