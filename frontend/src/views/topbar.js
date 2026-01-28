/**
 * Topbar view
 */

import { getState } from '../state/index.js';
import { getCurrentDate } from '../utils/dom.js';

/**
 * Render topbar
 */
export function renderTopbar() {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  if (!currentUser) return "";
  
  const manageAllowed = currentUser.permissions && currentUser.permissions.includes("manage_users");
  
  // Debug info (only in dev, check for ?debug=1 in URL)
  const isDebugMode = window.location.search.includes('debug=1');
  const debugInfo = isDebugMode ? `
    <div style="position: fixed; top: 60px; right: 10px; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 11px; z-index: 9999; max-width: 300px; border-radius: 4px;">
      <div style="font-weight: bold; color: #ff0; margin-bottom: 5px;">🔍 DEBUG MODE</div>
      <div><strong>User:</strong> ${currentUser.username} (${currentUser.role})</div>
      <div><strong>UserID:</strong> ${currentUser.id}</div>
      <div><strong>Permissions:</strong> ${(currentUser.permissions || []).join(', ')}</div>
      <hr style="margin: 5px 0; border-color: #333;">
      <div><strong>Data Counts:</strong></div>
      <div>Users: ${(state.data.users || []).length}</div>
      <div>Workers: ${(state.data.workers || []).length}</div>
      <div>Teams: ${(state.data.teams || []).length}</div>
      <div>Locations: ${(state.data.locations || []).length}</div>
      <div>Assignments: ${(state.data.assignments || []).length}</div>
      <div>Dispatch: ${(state.data.dispatchItems || []).length}</div>
      <div>Vehicles: ${(state.data.vehicles || []).length}</div>
      <div>Devices: ${(state.data.devices || []).length}</div>
      <div>Todos: ${(state.data.todos || []).length}</div>
      <div style="margin-top: 5px; font-size: 9px; color: #888;">Add ?debug=1 to URL to toggle</div>
    </div>
  ` : '';
  
  return `
    ${debugInfo}
    <header class="topbar">
      <div class="brand">
        <div class="brand__logo">
          <div class="brand__logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
        </div>
          <div class="brand__logo-text">technova</div>
        </div>
        <div class="nav-tabs">
          <button class="${state.ui.activeMode === "plan" ? "active" : ""}" data-mode="plan">Planen</button>
          ${
            manageAllowed
              ? `<button class="${state.ui.activeMode === "manage" ? "active" : ""}" data-mode="manage">Verwalten</button>`
              : ""
          }
        </div>
      </div>
      <div class="topbar__actions">
        <button class="btn-fullscreen" id="btn-fullscreen" title="Vollbildmodus">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="topbar__date">
          ${getCurrentDate()}
        </div>
        <div class="user-chip" id="user-chip-menu">
          <div class="user-chip__avatar">
            ${currentUser.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
          </div>
          <div class="user-chip__info">
            <span class="user-chip__name">${currentUser.name}</span>
            <span class="user-chip__role">${currentUser.role}</span>
          </div>
          <svg class="user-chip__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="user-menu" id="user-menu" style="display: none;">
            <div class="user-menu__info">
              <div class="user-menu__avatar">
                ${currentUser.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
              </div>
              <div class="user-menu__details">
                <div class="user-menu__name">${currentUser.name}</div>
                <div class="user-menu__role">${currentUser.role}</div>
                ${currentUser.email ? `<div class="user-menu__email">${currentUser.email}</div>` : ""}
              </div>
            </div>
            <div class="user-menu__divider"></div>
            <button class="user-menu__item" id="btn-logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

