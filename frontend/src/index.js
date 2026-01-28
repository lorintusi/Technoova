/**
 * Application entry point
 * This replaces the old app.js initialization
 */

import { initializeApp } from './bootstrap.js';

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(error => {
      console.error('[App] Initialization error:', error);
    });
  });
} else {
  // DOM already ready
  initializeApp().catch(error => {
    console.error('[App] Initialization error:', error);
  });
}
