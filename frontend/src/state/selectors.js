/**
 * State selectors
 * Helper functions to access state without direct coupling
 */

import { getState, getStatePath } from './store.js';

// Memoization cache for expensive selectors
const selectorCache = {
  unassignedResources: new Map(), // key: `${date}-${resourceType}`
  dispatchItems: new Map(), // key: `${dateFrom}-${dateTo}`
  dispatchItemsForWorkerDay: new Map() // key: `${date}-${workerId}`
};

// Cache invalidation: Clear cache when state changes
let lastStateHash = null;

/**
 * Get state hash for cache invalidation
 */
function getStateHash() {
  const state = getState();
  // Simple hash based on data arrays length (for quick invalidation)
  return `${state.data.dispatchItems?.length || 0}-${state.data.dispatchAssignments?.length || 0}-${state.data.workers?.length || 0}-${state.data.vehicles?.length || 0}-${state.data.devices?.length || 0}`;
}

/**
 * Check if cache is valid
 */
function isCacheValid() {
  const currentHash = getStateHash();
  if (currentHash !== lastStateHash) {
    lastStateHash = currentHash;
    // Clear caches
    selectorCache.unassignedResources.clear();
    selectorCache.dispatchItems.clear();
    selectorCache.dispatchItemsForWorkerDay.clear();
    return false;
  }
  return true;
}

/**
 * Get active user
 * @returns {object|null} Current user
 */
export function getActiveUser() {
  const state = getState();
  return state.data.currentUser;
}

/**
 * Get active worker ID
 * @returns {string|number|null} Worker ID
 */
export function getActiveWorkerId() {
  const state = getState();
  const currentUser = state.data.currentUser;
  return currentUser?.workerId || currentUser?.worker_id || null;
}

/**
 * Get active user ID
 * @returns {string|number|null} User ID
 */
export function getActiveUserId() {
  const state = getState();
  return state.ui.currentUserId || state.data.currentUser?.id || null;
}

/**
 * Get calendar view user ID (for admin viewing other users)
 * @returns {string|number|null} User ID
 */
export function getCalendarViewUserId() {
  const state = getState();
  return state.ui.calendarViewUserId || state.ui.currentUserId || state.data.currentUser?.id || null;
}

/**
 * Get default work hours
 * @returns {{workday_start: string, workday_end: string}} Work hours
 */
export function getDefaultWorkHours() {
  return {
    workday_start: '08:00',
    workday_end: '16:30'
  };
}

/**
 * Get workflow state
 * @returns {object} Workflow state
 */
export function getWorkflowState() {
  return getStatePath('workflow');
}

/**
 * Get UI state
 * @returns {object} UI state
 */
export function getUIState() {
  return getStatePath('ui');
}

/**
 * Get time entry state
 * @returns {object} Time entry state
 */
export function getTimeEntryState() {
  return getStatePath('timeEntry');
}

/**
 * Get wizard state
 * @returns {object} Wizard state
 */
export function getWizardState() {
  return getStatePath('wizard');
}

/**
 * Get week planning state
 * @returns {object} Week planning state
 */
export function getWeekPlanningState() {
  return getStatePath('weekPlanning');
}

/**
 * Get data state
 * @returns {object} Data state
 */
export function getDataState() {
  return getStatePath('data');
}

/**
 * Get planning entries for a specific date and worker
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID
 * @returns {Array} Planning entries
 */
export function getPlanningEntriesForDay(date, workerId) {
  const state = getState();
  return (state.planning.entries || []).filter(entry => 
    entry.date === date && entry.workerId === workerId
  );
}

/**
 * Get planning entries for a week
 * @param {string} weekStart - Week start date (YYYY-MM-DD, Monday)
 * @param {string|number} workerId - Worker ID (optional)
 * @returns {Array} Planning entries
 */
export function getPlanningEntriesForWeek(weekStart, workerId = null) {
  const state = getState();
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  
  return (state.planning.entries || []).filter(entry => {
    const entryDate = new Date(entry.date);
    const matchesDate = entryDate >= weekStartDate && entryDate <= weekEndDate;
    const matchesWorker = !workerId || entry.workerId === workerId;
    return matchesDate && matchesWorker;
  });
}

/**
 * Get active date (Single Source of Truth)
 * @returns {string|null} Active date (YYYY-MM-DD)
 */
export function getActiveDate() {
  return getStatePath('ui.activeDate') || getStatePath('planning.selectedDate');
}

/**
 * Get planning for worker ID (legacy compatibility)
 * @returns {string|number|null} Worker ID
 */
export function getPlanningForWorkerId() {
  return getSelectedPlanningWorkerId();
}

/**
 * Get selected planning worker ID
 * @returns {string|number|null} Worker ID
 */
export function getSelectedPlanningWorkerId() {
  return getStatePath('planning.selectedWorkerId') || getStatePath('weekPlanning.planningForWorkerId');
}

/**
 * Get planning entries for worker and week
 * @param {string} weekStart - Week start date (YYYY-MM-DD, Monday)
 * @param {string|number} workerId - Worker ID
 * @returns {Array} Planning entries
 */
export function getPlanningEntriesForWorkerWeek(weekStart, workerId) {
  return getPlanningEntriesForWeek(weekStart, workerId);
}

/**
 * Get planning entries for worker and day
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID
 * @returns {Array} Planning entries
 */
export function getPlanningEntriesForWorkerDay(date, workerId) {
  return getPlanningEntriesForDay(date, workerId);
}

/**
 * Get all planning entries
 * @returns {Array} All planning entries
 */
export function getAllPlanningEntries() {
  return getStatePath('planning.entries') || [];
}

/**
 * Get all medical certificates
 * @returns {Array} All medical certificates
 */
export function getMedicalCertificates() {
  return getStatePath('data.medicalCertificates') || [];
}

/**
 * Get medical certificate by planning entry ID
 * @param {string|number} planningEntryId - Planning entry ID
 * @returns {object|null} Medical certificate or null
 */
export function getMedicalCertificateByPlanningEntryId(planningEntryId) {
  const certificates = getMedicalCertificates();
  return certificates.find(c => c.planningEntryId === planningEntryId) || null;
}

/**
 * Get medical certificates for worker and date range
 * @param {string|number} workerId - Worker ID
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @returns {Array} Medical certificates
 */
export function getMedicalCertificatesForWorkerRange(workerId, dateFrom, dateTo) {
  const certificates = getMedicalCertificates();
  return certificates.filter(c => {
    if (c.workerId !== workerId) return false;
    if (dateFrom && c.date < dateFrom) return false;
    if (dateTo && c.date > dateTo) return false;
    return true;
  });
}

/**
 * Get vehicles (deduped by id)
 * @returns {Array} Array of vehicle objects
 */
export function getVehicles() {
  const state = getState();
  const vehicles = state.data.vehicles || [];
  // Dedupe by id
  const seen = new Set();
  return vehicles.filter(v => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

/**
 * Get devices (deduped by id)
 * @returns {Array} Array of device objects
 */
export function getDevices() {
  const state = getState();
  const devices = state.data.devices || [];
  // Dedupe by id
  const seen = new Set();
  return devices.filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

/**
 * Get available vehicles for a date (filter by status)
 * @param {string} date - Date string (YYYY-MM-DD), optional
 * @returns {Array} Array of available vehicles
 */
export function getAvailableVehicles(date = null) {
  const vehicles = getVehicles();
  return vehicles.filter(v => v.status === 'available');
}

/**
 * Get available devices for a date (filter by status)
 * @param {string} date - Date string (YYYY-MM-DD), optional
 * @returns {Array} Array of available devices
 */
export function getAvailableDevices(date = null) {
  const devices = getDevices();
  return devices.filter(d => d.status === 'available');
}

/**
 * Get dispatch items (deduped by id) - MEMOIZED
 * @param {string} dateFrom - Start date (YYYY-MM-DD), optional
 * @param {string} dateTo - End date (YYYY-MM-DD), optional
 * @returns {Array} Array of dispatch item objects
 */
export function getDispatchItems(dateFrom = null, dateTo = null) {
  // Check cache validity
  isCacheValid();
  
  // Create cache key
  const cacheKey = `${dateFrom || 'null'}-${dateTo || 'null'}`;
  
  // Check cache
  if (selectorCache.dispatchItems.has(cacheKey)) {
    return selectorCache.dispatchItems.get(cacheKey);
  }
  
  const state = getState();
  let items = state.data.dispatchItems || [];
  
  // Dedupe by id
  const seen = new Set();
  items = items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  
  // Filter by date range if provided
  if (dateFrom || dateTo) {
    items = items.filter(item => {
      const itemDate = item.date;
      if (!itemDate) return false;
      if (dateFrom && itemDate < dateFrom) return false;
      if (dateTo && itemDate > dateTo) return false;
      return true;
    });
  }
  
  // Cache result
  selectorCache.dispatchItems.set(cacheKey, items);
  
  return items;
}

/**
 * Get dispatch item by ID
 * @param {string|number} itemId - Dispatch item ID
 * @returns {object|null} Dispatch item or null
 */
export function getDispatchItem(itemId) {
  const items = getDispatchItems();
  return items.find(item => item.id === itemId) || null;
}

/**
 * Get dispatch assignments for a dispatch item
 * @param {string|number} dispatchItemId - Dispatch item ID
 * @returns {Array} Array of dispatch assignment objects
 */
export function getDispatchAssignments(dispatchItemId) {
  const state = getState();
  const assignments = state.data.dispatchAssignments || [];
  
  return assignments.filter(a => 
    a.dispatchItemId === dispatchItemId || 
    a.dispatch_item_id === dispatchItemId
  );
}

/**
 * Get assignments for a date and resource type
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} resourceType - Resource type ('WORKER', 'VEHICLE', 'DEVICE')
 * @returns {Array} Array of dispatch assignment objects
 */
export function getAssignmentsForDate(date, resourceType = null) {
  const state = getState();
  let assignments = state.data.dispatchAssignments || [];
  
  assignments = assignments.filter(a => a.date === date);
  
  if (resourceType) {
    assignments = assignments.filter(a => 
      (a.resourceType || a.resource_type) === resourceType
    );
  }
  
  return assignments;
}

/**
 * Get unassigned resources for a date and resource type - MEMOIZED
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} resourceType - Resource type ('WORKER', 'VEHICLE', 'DEVICE')
 * @returns {Array} Array of unassigned resource objects
 */
export function getUnassignedResourcesForDate(date, resourceType) {
  // Check cache validity
  isCacheValid();
  
  // Create cache key
  const cacheKey = `${date}-${resourceType}`;
  
  // Check cache
  if (selectorCache.unassignedResources.has(cacheKey)) {
    return selectorCache.unassignedResources.get(cacheKey);
  }
  
  const state = getState();
  
  // Get all resources of the specified type
  let allResources = [];
  switch (resourceType) {
    case 'WORKER':
      allResources = (state.data.workers || []).filter(w => w.status === 'Arbeitsbereit');
      break;
    case 'VEHICLE':
      allResources = getVehicles();
      break;
    case 'DEVICE':
      allResources = getDevices();
      break;
    default:
      return [];
  }
  
  // For WORKER: check dispatch assignments (multiple per day allowed, but we show if ANY assignment exists)
  if (resourceType === 'WORKER') {
    const dispatchItems = getDispatchItems(date, date);
    const assignedWorkerIds = new Set();
    
    dispatchItems.forEach(item => {
      const assignments = getDispatchAssignments(item.id);
      assignments.forEach(a => {
        if ((a.resourceType || a.resource_type) === 'WORKER') {
          assignedWorkerIds.add(String(a.resourceId || a.resource_id));
        }
      });
    });
    
    const result = allResources.filter(r => !assignedWorkerIds.has(String(r.id)));
    selectorCache.unassignedResources.set(cacheKey, result);
    return result;
  }
  
  // For VEHICLE/DEVICE: use old logic (single assignment per day)
  const assigned = getAssignmentsForDate(date, resourceType)
    .map(a => a.resourceId || a.resource_id);
  
  // Filter out assigned resources
  const result = allResources.filter(r => !assigned.includes(r.id));
  
  // Cache result
  selectorCache.unassignedResources.set(cacheKey, result);
  
  return result;
}

/**
 * Get unassigned workers for a specific time window
 * CRITICAL: Multiple dispatch items per day are STANDARD
 * A worker is "unassigned" if they have NO dispatch assignment in this time window
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM) or null for all-day check
 * @param {string} endTime - End time (HH:MM) or null for all-day check
 * @returns {Promise<Array>} Array of unassigned worker objects
 */
export async function getUnassignedWorkersForTimeWindow(date, startTime = null, endTime = null) {
  const { validateDispatchOverlap } = await import('../utils/dispatchValidation.js');
  const state = getState();
  const allWorkers = (state.data.workers || []).filter(w => w.status === 'Arbeitsbereit');
  
  // Get all dispatch items for this date
  const dispatchItems = getDispatchItems(date, date);
  
  // Get workers assigned in this time window
  const assignedWorkerIds = new Set();
  
  dispatchItems.forEach(item => {
    const itemStartTime = item.startTime || item.start_time;
    const itemEndTime = item.endTime || item.end_time;
    const itemAllDay = item.allDay || item.all_day;
    
    // Check if item overlaps with requested time window
    let overlaps = false;
    
    if (itemAllDay) {
      overlaps = true; // All-day items overlap with everything
    } else if (startTime && endTime && itemStartTime && itemEndTime) {
      // Check time overlap using validation utility
      const mockItem = { date, startTime, endTime, allDay: false };
      const validation = validateDispatchOverlap(mockItem, [item]);
      overlaps = !validation.ok; // If validation fails, they overlap
    } else if (!startTime && !endTime) {
      // No time window specified, check if worker has ANY assignment
      overlaps = true;
    }
    
    if (overlaps) {
      const assignments = getDispatchAssignments(item.id);
      assignments.forEach(a => {
        if ((a.resourceType || a.resource_type) === 'WORKER') {
          assignedWorkerIds.add(String(a.resourceId || a.resource_id));
        }
      });
    }
  });
  
  return allWorkers.filter(w => !assignedWorkerIds.has(String(w.id)));
}

/**
 * Get dispatch items for a worker and day - MEMOIZED
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID
 * @returns {Array} Array of dispatch item objects
 */
export function getDispatchItemsForWorkerDay(date, workerId) {
  // Check cache validity
  isCacheValid();
  
  // Create cache key
  const cacheKey = `${date}-${workerId}`;
  
  // Check cache
  if (selectorCache.dispatchItemsForWorkerDay.has(cacheKey)) {
    return selectorCache.dispatchItemsForWorkerDay.get(cacheKey);
  }
  
  const dispatchItems = getDispatchItems(date, date);
  
  // Filter items where worker is assigned
  const result = dispatchItems.filter(item => {
    const assignments = getDispatchAssignments(item.id);
    return assignments.some(a => 
      (a.resourceType || a.resource_type) === 'WORKER' &&
      (a.resourceId || a.resource_id) === workerId &&
      a.date === date
    );
  });
  
  // Cache result
  selectorCache.dispatchItemsForWorkerDay.set(cacheKey, result);
  
  return result;
}

/**
 * Get todos (deduped by id)
 * @param {string} scope - Scope filter ('PLAN_DAY', 'PLAN_WEEK', 'ADMIN_GLOBAL'), optional
 * @param {string} scopeId - Scope ID filter (date for PLAN_DAY/PLAN_WEEK), optional
 * @returns {Array} Array of todo objects
 */
export function getTodos(scope = null, scopeId = null) {
  const state = getState();
  let todos = state.data.todos || [];
  
  // Dedupe by id
  const seen = new Set();
  todos = todos.filter(todo => {
    if (seen.has(todo.id)) return false;
    seen.add(todo.id);
    return true;
  });
  
  // Filter by scope if provided
  if (scope) {
    todos = todos.filter(todo => todo.scope === scope);
  }
  
  // Filter by scopeId if provided
  if (scopeId !== null) {
    todos = todos.filter(todo => todo.scopeId === scopeId || todo.scope_id === scopeId);
  }
  
  return todos;
}

/**
 * Get todo by ID
 * @param {string|number} todoId - Todo ID
 * @returns {object|null} Todo or null
 */
export function getTodo(todoId) {
  const todos = getTodos();
  return todos.find(t => t.id === todoId) || null;
}

/**
 * Get resource context
 * @returns {string} Current resource context
 */
export function getResourceContext() {
  const state = getState();
  return state.ui.resourceContext || 'WORKER';
}

/**
 * Get selected resource
 * @returns {object|null} Selected resource { type, id } or null
 */
export function getSelectedResource() {
  const state = getState();
  return state.ui.selectedResource || null;
}

/**
 * Get selected location
 * @returns {object|null} Location object or null
 */
export function getSelectedLocation() {
  const state = getState();
  const selected = state.ui.selectedResource;
  if (!selected || selected.type !== 'LOCATION') return null;
  
  const locations = getLocations();
  return locations.find(loc => String(loc.id) === String(selected.id)) || null;
}

/**
 * Get selected dispatch item
 * @returns {object|null} Dispatch item object or null
 */
export function getSelectedDispatchItem() {
  const state = getState();
  const selected = state.ui.selectedResource;
  if (!selected || selected.type !== 'DISPATCH') return null;
  
  const dispatchItems = getDispatchItems();
  return dispatchItems.find(item => String(item.id) === String(selected.id)) || null;
}

/**
 * Get users (deduped by id)
 * @returns {Array} Array of user objects
 */
export function getUsers() {
  const state = getState();
  let users = state.data.users || [];
  
  // Dedupe by id
  const seen = new Set();
  users = users.filter(user => {
    if (!user || !user.id) return false;
    const id = String(user.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  
  return users;
}

/**
 * Get workers (deduped by id)
 * @returns {Array} Array of worker objects
 */
export function getWorkers() {
  const state = getState();
  let workers = state.data.workers || [];
  
  // Dedupe by id
  const seen = new Set();
  workers = workers.filter(worker => {
    if (!worker || !worker.id) return false;
    const id = String(worker.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  
  return workers;
}

/**
 * Get locations (deduped by id)
 * @returns {Array} Array of location objects
 */
export function getLocations() {
  const state = getState();
  let locations = state.data.locations || [];
  
  // Dedupe by id
  const seen = new Set();
  locations = locations.filter(loc => {
    if (seen.has(loc.id)) return false;
    seen.add(loc.id);
    return true;
  });
  
  return locations;
}

/**
 * Get day view mode
 * @returns {string} Day view mode ('timeline' | 'grid')
 */
export function getDayViewMode() {
  const state = getState();
  return state.ui.dayViewMode || 'timeline';
}

/**
 * Get filtered resources by context and query
 * @param {string} context - Resource context
 * @param {string} query - Search query
 * @returns {{items: Array, count: number}} Filtered resources and count
 */
export function getFilteredResourcesByContext(context, query = '') {
  const state = getState();
  let allItems = [];
  
  // Get all items for context
  switch (context) {
    case 'WORKER':
      allItems = getWorkers().filter(w => w.status === 'Arbeitsbereit');
      break;
    case 'VEHICLE':
      allItems = getVehicles();
      break;
    case 'DEVICE':
      allItems = getDevices();
      break;
    case 'LOCATION':
      allItems = getLocations();
      break;
    case 'DISPATCH':
      allItems = getDispatchItems();
      break;
    default:
      return { items: [], count: 0 };
  }
  
  // Filter by query if provided
  if (query && query.trim()) {
    const term = query.toLowerCase().trim();
    allItems = allItems.filter(item => {
      // Search in name/title
      if (item.name && item.name.toLowerCase().includes(term)) return true;
      if (item.title && item.title.toLowerCase().includes(term)) return true;
      
      // Search in additional fields
      if (item.licensePlate && item.licensePlate.toLowerCase().includes(term)) return true;
      if (item.serialNumber && item.serialNumber.toLowerCase().includes(term)) return true;
      if (item.code && item.code.toLowerCase().includes(term)) return true;
      if (item.address && item.address.toLowerCase().includes(term)) return true;
      if (item.role && item.role.toLowerCase().includes(term)) return true;
      if (item.note && item.note.toLowerCase().includes(term)) return true;
      if (item.category && item.category.toLowerCase().includes(term)) return true;
      
      return false;
    });
  }
  
  return {
    items: allItems,
    count: allItems.length
  };
}

