/**
 * Auth Guard
 * Handles 401 unauthorized responses globally
 */

import { getState, setAuth } from '../state/index.js';

let isRedirecting = false;

/**
 * Initialize auth guard
 * Listens for 401 events and redirects to login
 */
export function initAuthGuard() {
  // Listen for unauthorized events from API client
  window.addEventListener('auth:unauthorized', handleUnauthorized);
  
  console.log('[AuthGuard] Initialized');
}

/**
 * Handle unauthorized access
 * Clears auth state and redirects to login
 */
function handleUnauthorized(event) {
  // Don't redirect if already on login page (prevent loop)
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    console.warn('[AuthGuard] Already on login page, skipping redirect');
    return;
  }
  
  if (isRedirecting) return; // Prevent multiple redirects
  
  isRedirecting = true;
  
  console.warn('[AuthGuard] Unauthorized access detected. Details:', event?.detail);
  console.warn('[AuthGuard] Redirecting to login...');
  
  // Clear auth state
  setAuth(false, null);
  
  // Show message
  const message = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
  
  // Store message in sessionStorage for login page to display
  sessionStorage.setItem('auth_message', message);
  
  // Redirect to login
  setTimeout(() => {
    window.location.href = '/';
    isRedirecting = false;
  }, 500);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
  const state = getState();
  return state.auth.isAuthenticated;
}

/**
 * Get current user
 * @returns {object|null} Current user or null
 */
export function getCurrentUser() {
  const state = getState();
  return state.auth.currentUser;
}

/**
 * Require authentication
 * Redirects to login if not authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    console.warn('[AuthGuard] Authentication required, redirecting to login');
    window.location.href = '/';
    return false;
  }
  return true;
}

