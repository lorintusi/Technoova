/**
 * Login view
 * Handles login rendering and form submission
 */

import { getState, setState } from '../../state/index.js';
import { api } from '../../api/endpoints.js';
import { on } from '../../handlers/events.js';
import { renderApp } from '../renderApp.js';

/**
 * Render login view
 */
export function renderLogin() {
  const app = document.getElementById("app");
  if (!app) return;
  
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <!-- Logo Section -->
        <div class="login-header">
          <div class="login-logo">
            <div class="brand__logo brand__logo--login">
              <div class="brand__logo-icon brand__logo-icon--login">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
              </div>
              <div class="brand__logo-text brand__logo-text--login">technova</div>
            </div>
          </div>
          <h1 class="login-title">Willkommen zurück</h1>
          <p class="login-subtitle">Melde dich an, um fortzufahren</p>
        </div>
        
        <!-- Login Form Section -->
        <form id="login-form" class="login-form">
          <div class="form-group">
            <label for="username" class="form-label">Benutzername</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              class="form-input" 
              placeholder="Benutzername eingeben" 
              required 
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label for="password" class="form-label">Passwort</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              class="form-input" 
              placeholder="Passwort eingeben" 
              required 
              autocomplete="current-password"
            />
          </div>
          <div id="login-error" class="login-error" style="display: none;"></div>
          <button type="submit" class="login-button">
            <span>Anmelden</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
      
      <!-- Footer -->
      <footer class="app-footer app-footer--login">
        <div class="app-footer__content">
          <span class="app-footer__text">Powered by</span>
          <div class="app-footer__brand">
            <div class="app-footer__logo">techloom</div>
            <div class="app-footer__tagline">Vernetzen | Optimieren | Wachsen!</div>
          </div>
        </div>
      </footer>
    </div>
  `;
  
  // Bind login handlers using event delegation
  bindLoginHandlers();
}

/**
 * Bind login form handlers
 * Uses event delegation to avoid duplicate bindings
 */
function bindLoginHandlers() {
  // Use event delegation for form submit
  on('submit', '#login-form', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (!username || !password) {
      if (errorDiv) {
        errorDiv.textContent = 'Bitte Benutzername und Passwort eingeben';
        errorDiv.style.display = 'block';
      }
      return;
    }
    
    // Disable form while logging in
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Anmelden...';
    }
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
    
    try {
      const result = await loginWithAPI(username, password);
      
      if (!result.success) {
        if (errorDiv) {
          errorDiv.textContent = result.error || 'Login fehlgeschlagen';
          errorDiv.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Anmelden</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        return;
      }
      
      // Login successful - re-render app
      renderApp();
    } catch (error) {
      console.error('Login error:', error);
      if (errorDiv) {
        errorDiv.textContent = error.message || 'Login fehlgeschlagen';
        errorDiv.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Anmelden</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      }
    }
  });
}

/**
 * Login with API
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
async function loginWithAPI(username, password) {
  try {
    const response = await api.login(username, password);
    if (response.success && response.user) {
      console.log('[Login] Login successful, received user:', response.user.username);
      
      // Verify session by calling GET /me
      let sessionUser;
      try {
        const meResponse = await api.getCurrentUser();
        if (meResponse.success && meResponse.user) {
          sessionUser = meResponse.user;
          console.log('[Login] Session verified via GET /me:', sessionUser.username);
        } else {
          console.warn('[Login] GET /me failed after login, using login response user');
          sessionUser = response.user;
        }
      } catch (meError) {
        console.warn('[Login] GET /me error after login, using login response user:', meError.message);
        sessionUser = response.user;
      }
      
      // Normalize user data
      const user = { ...sessionUser };
      if (!user.workerId && user.worker_id) {
        user.workerId = user.worker_id;
      }
      
      // Update state
      setState({
        data: {
          ...getState().data,
          currentUser: user
        },
        ui: {
          ...getState().ui,
          isAuthenticated: true,
          currentUserId: user.id
        }
      });
      
      console.log('[Login] State updated, loading data...');
      
      // Load all data after successful login
      await loadAllData();
      
      console.log('[Login] Data loaded successfully');
      
      return { success: true, user };
    } else {
      return { success: false, error: response.error || 'Login failed' };
    }
  } catch (error) {
    console.error('[Login] Login error:', error);
    
    let errorMessage = error.message || 'Login failed';
    if (error.message === 'Failed to fetch' || error.name === 'NetworkError' || error.name === 'TypeError') {
      errorMessage = 'Verbindung zum Server fehlgeschlagen. Bitte überprüfen Sie, ob der Server läuft.';
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Load all data from API
 * Uses bootstrap's loadAllData function
 */
async function loadAllData() {
  // Use bootstrap's loadAllData if available
  if (window.loadAllData && typeof window.loadAllData === 'function') {
    return window.loadAllData();
  }
  
  // Fallback: load directly
  try {
    const { api } = await import('../../api/endpoints.js');
    const { setState, getState } = await import('../../state/index.js');
    
    // Load all data in parallel
    const [usersResponse, workersResponse, teamsResponse, locationsResponse, assignmentsResponse, timeEntriesResponse] = await Promise.all([
      api.getUsers().catch(() => ({ success: false, data: [] })),
      api.getWorkers().catch(() => ({ success: false, data: [] })),
      api.getTeams().catch(() => ({ success: false, data: [] })),
      api.getLocations().catch(() => ({ success: false, data: [] })),
      api.getAssignments().catch(() => ({ success: false, data: [] })),
      api.getTimeEntries().catch(() => ({ success: false, data: [] }))
    ]);
    
    const currentState = getState();
    
    // Update state with loaded data
    setState({
      data: {
        ...currentState.data,
        users: (usersResponse.success ? (usersResponse.data || []) : []).map(user => {
          const normalized = { ...user };
          if (normalized.worker_id && !normalized.workerId) {
            normalized.workerId = normalized.worker_id;
          }
          return normalized;
        }),
        workers: (workersResponse.success ? (workersResponse.data || []) : []).map(worker => {
          const normalized = { ...worker };
          if (!normalized.contact) normalized.contact = {};
          if (worker.contact_phone && !normalized.contact.phone) normalized.contact.phone = worker.contact_phone;
          if (worker.contact_email && !normalized.contact.email) normalized.contact.email = worker.contact_email;
          if (!normalized.availability) normalized.availability = [];
          return normalized;
        }),
        teams: teamsResponse.success ? (teamsResponse.data || []) : [],
        locations: locationsResponse.success ? (locationsResponse.data || []) : [],
        assignments: assignmentsResponse.success ? (assignmentsResponse.data || []) : [],
        timeEntries: timeEntriesResponse.success ? (timeEntriesResponse.data || []) : []
      }
    });
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Export for legacy bridge
window.renderLogin = renderLogin;

