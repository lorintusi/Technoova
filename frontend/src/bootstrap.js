/**
 * Bootstrap
 * Initializes the application and sets up the module system
 */

import { setupLegacyBridge } from './legacyBridge.js';
import { bind as bindEvents } from './handlers/events.js';
import { renderApp } from './views/renderApp.js';
import { getState, setState, setAuth } from './state/index.js';
import { formatDateLocal } from './utils/format.js';

// Export renderApp for global access
window.renderApp = renderApp;

// Import local API (will be used if window.api is not set)
let api;
async function initApi() {
  // Check if local API is available (browser SQLite)
  if (typeof window !== 'undefined' && window.api) {
    api = window.api;
  } else {
    // Try to import local API
    try {
      const localApiModule = await import('../../database/localApi.js');
      api = localApiModule.default || localApiModule;
      if (typeof window !== 'undefined') {
        window.api = api;
      }
    } catch (e) {
      // Fallback to remote API
      const endpointsModule = await import('./api/endpoints.js');
      api = endpointsModule.api;
    }
  }
}

/**
 * Check current session
 */
async function checkCurrentSession() {
  try {
    if (!api) await initApi();
    const response = await api.getCurrentUser();
    if (response.success && response.user) {
      const user = { ...response.user };
      if (!user.workerId && user.worker_id) {
        user.workerId = user.worker_id;
      }
      
      setAuth(true, user);
      return true;
    }
  } catch (error) {
    console.log('No active session:', error.message);
    return false;
  }
  return false;
}

/**
 * Load all data from API
 */
async function loadAllData() {
  try {
    if (!api) await initApi();
    
    // API client now returns unwrapped data directly (not {success, data})
    const [users, workers, teams, locations, assignments, dispatchAssignments, timeEntries, vehicles, devices] = await Promise.all([
      api.getUsers().catch(() => []),
      api.getWorkers().catch(() => []),
      api.getTeams().catch(() => []),
      api.getLocations().catch(() => []),
      api.getAssignments().catch(() => []),
      api.getDispatchAssignments().catch(() => []),
      api.getTimeEntries().catch(() => []),
      api.getVehicles().catch(() => []),
      api.getDevices().catch(() => [])
    ]);
    
    const currentState = getState();
    
    // Normalize locations (snake_case to camelCase)
    const normalizedLocations = (Array.isArray(locations) ? locations : []).map(location => {
      const normalized = { ...location };
      // Normalize resourcesRequired
      if (normalized.resources_required && !normalized.resourcesRequired) {
        normalized.resourcesRequired = Array.isArray(normalized.resources_required) 
          ? normalized.resources_required 
          : (typeof normalized.resources_required === 'string' ? JSON.parse(normalized.resources_required || '[]') : []);
      }
      if (!normalized.resourcesRequired) normalized.resourcesRequired = [];
      return normalized;
    });
    
    // Update state with loaded data
    setState({
      data: {
        ...currentState.data,
        users: (Array.isArray(users) ? users : []).map(user => {
          const normalized = { ...user };
          if (normalized.worker_id && !normalized.workerId) {
            normalized.workerId = normalized.worker_id;
          }
          return normalized;
        }),
        workers: (Array.isArray(workers) ? workers : []).map(worker => {
          const normalized = { ...worker };
          if (!normalized.contact) normalized.contact = {};
          if (worker.contact_phone && !normalized.contact.phone) normalized.contact.phone = worker.contact_phone;
          if (worker.contact_email && !normalized.contact.email) normalized.contact.email = worker.contact_email;
          if (!normalized.availability) normalized.availability = [];
          return normalized;
        }),
        teams: Array.isArray(teams) ? teams : [],
        locations: normalizedLocations,
        assignments: Array.isArray(assignments) ? assignments : [],
        dispatchAssignments: Array.isArray(dispatchAssignments) ? dispatchAssignments : [],
        timeEntries: Array.isArray(timeEntries) ? timeEntries : [],
        vehicles: (Array.isArray(vehicles) ? vehicles : []).map(vehicle => {
          // Normalize snake_case to camelCase
          const normalized = { ...vehicle };
          if (vehicle.license_plate && !normalized.licensePlate) {
            normalized.licensePlate = vehicle.license_plate;
          }
          return normalized;
        }),
        devices: (Array.isArray(devices) ? devices : []).map(device => {
          // Normalize snake_case to camelCase
          const normalized = { ...device };
          if (device.serial_number && !normalized.serialNumber) {
            normalized.serialNumber = device.serial_number;
          }
          return normalized;
        })
      }
    });
    
    // Load planning entries for current week (if user is logged in)
    const activeWorkerId = currentState.data.currentUser?.workerId || currentState.data.currentUser?.worker_id;
    const activeUserId = currentState.ui.currentUserId || currentState.data.currentUser?.id;
    const workerIdForPlanning = activeWorkerId || activeUserId;
    
    if (workerIdForPlanning) {
      try {
        const { loadPlanningEntries } = await import('./services/planningService.js');
        const calendarDate = currentState.ui.calendarDate || new Date();
        const weekStart = getWeekStartDate(calendarDate);
        const weekStartStr = formatDateLocal(weekStart);
        await loadPlanningEntries(weekStartStr, workerIdForPlanning);
      } catch (error) {
        console.error('Error loading planning entries:', error);
        // Don't fail the whole load - continue without planning entries
      }
    }
    
    // Load dispatch items for current week
    try {
      const { loadDispatchItems } = await import('./services/dispatchService.js');
      const calendarDate = currentState.ui.calendarDate || new Date();
      const weekStart = getWeekStartDate(calendarDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekStartStr = formatDateLocal(weekStart);
      const weekEndStr = formatDateLocal(weekEnd);
      await loadDispatchItems({ dateFrom: weekStartStr, dateTo: weekEndStr });
    } catch (error) {
      console.error('Error loading dispatch items:', error);
      // Don't fail the whole load - continue without dispatch items
    }
    
    // Load todos
    try {
      const { loadTodos } = await import('./services/todoService.js');
      await loadTodos();
    } catch (error) {
      console.error('Error loading todos:', error);
      // Don't fail the whole load - continue without todos
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

/**
 * Initialize application
 */
export async function initializeApp() {
  // Initialize API (local or remote)
  await initApi();
  
  // Initialize auth guard (401 handler)
  const { initAuthGuard } = await import('./utils/authGuard.js');
  initAuthGuard();
  
  // Initialize mobile drawer
  const { initMobileDrawer } = await import('./components/mobileDrawer.js');
  initMobileDrawer();
  
  // Setup legacy bridge first (so old code can access modules)
  setupLegacyBridge();
  
  // Bind event delegation system
  bindEvents();
  
  // Bind global handlers (view switch, etc.) - async
  await bindGlobalHandlers();
  
  console.log('[Bootstrap] Application modules initialized');
  
  // Check for active session
  const hasSession = await checkCurrentSession();
  
  if (hasSession) {
    // User is logged in, load all data
    await loadAllData();
    
    // Load planning entries for current week
    await loadPlanningEntriesForCurrentWeek();
    
    // Set default resource context based on user role
    const state = getState();
    const currentUser = state.data.currentUser;
    if (currentUser && !state.ui.resourceContext) {
      const { isAdmin } = await import('./utils/permissions.js');
      const defaultContext = isAdmin(currentUser) ? 'LOCATION' : 'DISPATCH';
      setState({
        ui: {
          ...state.ui,
          resourceContext: defaultContext
        }
      });
    }
  }
  
  // Render app (will show login if not authenticated)
  renderApp();
  
  // Export functions for legacy bridge
  window.loadAllData = loadAllData;
  window.checkCurrentSession = checkCurrentSession;
}

/**
 * Load planning entries for current week
 * Robust: handles errors gracefully
 */
async function loadPlanningEntriesForCurrentWeek() {
  try {
    const { loadPlanningEntries } = await import('./services/planningService.js');
    const { getActiveWorkerId, getActiveUserId, getState } = await import('./state/index.js');
    
    const state = getState();
    const calendarDate = state.ui.calendarDate || new Date();
    const weekStart = getWeekStartDate(calendarDate);
    const weekStartStr = formatDateLocal(weekStart);
    
    const workerId = getActiveWorkerId() || getActiveUserId();
    if (workerId) {
      const result = await loadPlanningEntries(weekStartStr, workerId);
      if (!result.success && result.error) {
        console.warn('Planning entries load warning:', result.error);
        // Don't crash - continue with empty entries
      }
    }
  } catch (error) {
    console.error('Error loading planning entries:', error);
    // Don't crash - app continues without planning entries
  }
}

/**
 * Get week start date helper
 */
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}


/**
 * Bind global event handlers using delegation
 */
async function bindGlobalHandlers() {
  const { on } = await import('./handlers/events.js');
  
  // View mode switch (plan/manage)
  on('click', '[data-mode]', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    
    const mode = btn.getAttribute('data-mode');
    if (mode === 'plan' || mode === 'manage') {
      setState({
        ui: {
          ...getState().ui,
          activeMode: mode
        }
      });
      renderApp();
    }
  });
  
  // Logout handler
  on('click', '#btn-logout', async (e) => {
    e.preventDefault();
    setState({
      data: {
        ...getState().data,
        currentUser: null
      },
      ui: {
        ...getState().ui,
        isAuthenticated: false,
        currentUserId: null
      }
    });
    renderApp();
  });
  
  // Bind planning handlers
  const { bindPlanningHandlers } = await import('./handlers/planningHandlers.js');
  bindPlanningHandlers();
  
  // Bind assignment handlers (Viaplano-Workflow)
  const { bindAssignmentHandlers } = await import('./handlers/assignmentHandlers.js');
  bindAssignmentHandlers();
  
  // Bind location handlers
  const { bindLocationHandlers } = await import('./handlers/locationHandlers.js');
  bindLocationHandlers();
  
  // Bind planning entry handlers
  const { bindPlanningEntryHandlers } = await import('./handlers/planningEntryHandlers.js');
  bindPlanningEntryHandlers();
  
  // Bind management handlers
  const { bindManagementHandlers } = await import('./handlers/managementHandlers.js');
  bindManagementHandlers();
  
  // Bind medical certificates handlers
  const { bindMedicalCertificatesHandlers } = await import('./handlers/medicalCertificatesHandlers.js');
  bindMedicalCertificatesHandlers();
  
  // Bind drag & drop handlers
  const { bindDragDropHandlers } = await import('./handlers/dragDropHandlers.js');
  bindDragDropHandlers();
  
  // Bind todo handlers
  const { bindTodoHandlers } = await import('./handlers/todoHandlers.js');
  bindTodoHandlers();
  
  // Bind resource navigation handlers
  const { bindResourceNavHandlers } = await import('./handlers/resourceNavHandlers.js');
  bindResourceNavHandlers();
  
  // Bind calendar navigation handlers
  const { bindCalendarNavHandlers } = await import('./handlers/calendarNavHandlers.js');
  bindCalendarNavHandlers();
  
  // Bind assignment drag & drop handlers
  const { bindAssignmentDragDropHandlers } = await import('./handlers/assignmentDragDropHandlers.js');
  bindAssignmentDragDropHandlers();
  
  // Bind dispatch handlers
  const { bindDispatchHandlers } = await import('./handlers/dispatchHandlers.js');
  bindDispatchHandlers();
  
  // Bind fullscreen handlers
  const { bindFullscreenHandlers } = await import('./handlers/fullscreenHandler.js');
  bindFullscreenHandlers();
  
  // Export user modal functions globally
  const { closeUserModal, openCreateUserModal, openEditUserModal } = await import('./views/modals/userModal.js');
  window.closeUserModal = closeUserModal;
  window.openCreateUserModal = openCreateUserModal;
  window.openEditUserModal = openEditUserModal;
  
  // Setup debug tools (dev only)
  const { setupDebugTools } = await import('./utils/debugTools.js');
  setupDebugTools(getState, api);
  
  console.log('[Bootstrap] Global handlers bound');
}
