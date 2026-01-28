/**
 * Management shell view
 * User and team management interface
 */

import { getState } from '../../state/index.js';
import { canManageUsers } from '../../utils/permissions.js';
import { renderLocationManagementView } from './locationManagementView.js';
import { renderMedicalCertificatesView } from './medicalCertificatesView.js';
import { renderVehicleManagementView } from './vehicleManagementView.js';
import { renderDeviceManagementView } from './deviceManagementView.js';
import { renderTodoManagementView } from './todoManagementView.js';

/**
 * Render role summary (simplified, will be migrated later)
 */
function renderRoleSummary() {
  const state = getState();
  const users = state.data.users || [];
  
  const roleCounts = {
    Admin: users.filter(u => u.role === 'Admin').length,
    Dispatcher: users.filter(u => u.role === 'Dispatcher').length,
    Worker: users.filter(u => u.role === 'Worker').length,
    Viewer: users.filter(u => u.role === 'Viewer').length
  };
  
  return `
    <div class="role-summary">
      <div class="role-summary__item">
        <span class="role-summary__label">Admin</span>
        <span class="role-summary__count">${roleCounts.Admin}</span>
      </div>
      <div class="role-summary__item">
        <span class="role-summary__label">Dispatcher</span>
        <span class="role-summary__count">${roleCounts.Dispatcher}</span>
      </div>
      <div class="role-summary__item">
        <span class="role-summary__label">Worker</span>
        <span class="role-summary__count">${roleCounts.Worker}</span>
      </div>
      <div class="role-summary__item">
        <span class="role-summary__label">Viewer</span>
        <span class="role-summary__count">${roleCounts.Viewer}</span>
      </div>
    </div>
  `;
}

/**
 * Render user row (simplified, will be migrated later)
 */
function renderUserRow(user) {
  // Import formatLastLogin dynamically
  let formatLastLogin = window.formatLastLogin || ((lastLogin) => lastLogin || 'Nie');
  
  return `
    <tr data-user-id="${user.id}" style="cursor: pointer;">
      <td>${user.name || '—'}</td>
      <td><span class="role-badge role-badge--${user.role?.toLowerCase() || 'worker'}">${user.role || 'Worker'}</span></td>
      <td>${(user.permissions || []).join(', ') || 'Keine'}</td>
      <td>${formatLastLogin(user.lastLogin)}</td>
    </tr>
  `;
}

/**
 * Render management shell
 */
export function renderManagementShell() {
  const state = getState();
  
  if (!state.data.currentUser) return "";
  
  // Only admin can access management
  if (!canManageUsers()) {
    return `
      <main class="management">
        <section class="management__panel">
          <h2>Keine Berechtigung</h2>
          <p>Nur Administratoren können auf die Verwaltung zugreifen.</p>
        </section>
      </main>
    `;
  }

  // Get active tab from state or default to 'users'
  const activeTab = state.ui.managementTab || 'users';
  
  // Render active tab content
  let tabContent = '';
  switch (activeTab) {
    case 'locations':
      tabContent = renderLocationManagementView();
      break;
    case 'medical':
      tabContent = renderMedicalCertificatesView();
      break;
    case 'vehicles':
      tabContent = renderVehicleManagementView();
      break;
    case 'devices':
      tabContent = renderDeviceManagementView();
      break;
    case 'todos':
      tabContent = renderTodoManagementView();
      break;
    case 'users':
    default:
      tabContent = `
        <div class="management__panel-header">
          <div>
            <h2>Benutzerverwaltung</h2>
            <p>Rollen vergeben, Berechtigungen anpassen und Accounts verwalten.</p>
          </div>
          <div class="management__actions">
            <button class="add-button" id="btn-add-worker">+ Personal hinzufügen</button>
          </div>
        </div>
        <div class="management__summary">
          ${renderRoleSummary()}
        </div>
        <table class="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rolle</th>
              <th>Berechtigungen</th>
              <th>Letzter Login</th>
            </tr>
          </thead>
          <tbody>
            ${(state.data.users || []).map(user => renderUserRow(user)).join("")}
          </tbody>
        </table>
      `;
      break;
  }

  return `
    <main class="management">
      <section class="management__panel">
        <div class="management__tabs">
          <button class="management__tab ${activeTab === 'users' ? 'active' : ''}" data-tab="users">
            👥 Benutzer
          </button>
          <button class="management__tab ${activeTab === 'locations' ? 'active' : ''}" data-tab="locations">
            🏗️ Baustellen
          </button>
          <button class="management__tab ${activeTab === 'vehicles' ? 'active' : ''}" data-tab="vehicles">
            🚗 Fahrzeuge
          </button>
          <button class="management__tab ${activeTab === 'devices' ? 'active' : ''}" data-tab="devices">
            🔧 Geräte
          </button>
          <button class="management__tab ${activeTab === 'medical' ? 'active' : ''}" data-tab="medical">
            🏥 Arztzeugnisse
          </button>
          <button class="management__tab ${activeTab === 'todos' ? 'active' : ''}" data-tab="todos">
            📝 TODOs
          </button>
        </div>
        <div class="management__tab-content">
          ${tabContent}
        </div>
      </section>
    </main>
  `;
}

