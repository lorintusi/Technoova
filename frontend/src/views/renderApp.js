/**
 * Main render orchestrator
 * Coordinates rendering of all views
 */

import { getState } from '../state/index.js';
import { renderLogin } from './auth/loginView.js';
import { renderTopbar } from './topbar.js';
import { renderFooter } from './footer.js';
import { renderBoardView } from './board/boardView.js';

// Export render functions for legacy bridge
window.renderTopbar = renderTopbar;
window.renderFooter = renderFooter;
window.renderBoardView = renderBoardView;

// Import modal renders (these return empty string if not open)
// These are available via legacy bridge from old app.js (will be migrated later)
function getModalRenders() {
  return {
    renderTimeEntryModal: window.renderTimeEntryModal || (() => ''),
    renderTimeEntryWizard: window.renderTimeEntryWizard || (() => ''),
    renderEmployeeCalendarModal: window.renderEmployeeCalendarModal || (() => '')
  };
}

/**
 * Main render function
 * Renders the entire app based on current state
 */
export function renderApp() {
  const app = document.getElementById("app");
  if (!app) {
    console.error("App root element not found");
    return;
  }
  
  const state = getState();
  
  // Check if user is authenticated
  if (!state.ui.isAuthenticated) {
    renderLogin();
    return;
  }

  const { renderTimeEntryModal: renderModal, renderTimeEntryWizard: renderWizard, renderEmployeeCalendarModal: renderEmpCal } = getModalRenders();

  app.innerHTML = `
  <div class="app-shell">
      ${renderTopbar()}
      ${renderBoardView()}
      ${renderModal()}
      ${renderWizard()}
      ${renderEmpCal()}
      ${renderFooter()}
    </div>
  `;

  // Global handlers are bound via event delegation in bootstrap.js
  // No need to bind here
}


// Export for legacy bridge
window.renderApp = renderApp;

