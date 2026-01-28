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
          <button class="active" data-mode="plan">Planen</button>
        </div>
      </div>
      <div class="topbar__actions">
        <div class="quick-admin" id="quick-admin-menu">
          <button class="quick-admin__trigger" id="quick-admin-trigger" title="Schnellzugriff">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Erstellen</span>
          </button>
          <div class="quick-admin__menu" id="quick-admin-dropdown" style="display: none;">
            <button class="quick-admin__item" data-action="create-assignment">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>Einsatz erstellen</span>
            </button>
            <button class="quick-admin__item" data-action="create-location">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>Einsatzort erstellen</span>
            </button>
            <button class="quick-admin__item" data-action="create-worker">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Personal hinzufügen</span>
            </button>
            <button class="quick-admin__item" data-action="create-vehicle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 17H4C3.44772 17 3 16.5523 3 16V13L5 6H19L21 13V16C21 16.5523 20.5523 17 20 17H19M5 17C5 18.1046 5.89543 19 7 19C8.10457 19 9 18.1046 9 17M5 17C5 15.8954 5.89543 15 7 15C8.10457 15 9 15.8954 9 17M19 17C19 18.1046 18.1046 19 17 19C15.8954 19 15 18.1046 15 17M19 17C19 15.8954 18.1046 15 17 15C15.8954 15 15 15.8954 15 17M9 17H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Fahrzeug hinzufügen</span>
            </button>
            <button class="quick-admin__item" data-action="create-device">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Gerät hinzufügen</span>
            </button>
          </div>
        </div>
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

