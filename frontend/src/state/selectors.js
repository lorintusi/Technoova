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
  // Include assignments so cache invalidates when Einsätze or Planungen change
  return `${state.data.assignments?.length || 0}-${state.data.dispatchAssignments?.length || 0}-${state.data.dispatchItems?.length || 0}-${state.data.workers?.length || 0}-${state.data.vehicles?.length || 0}-${state.data.devices?.length || 0}`;
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
 * Get dispatch assignments for a dispatch item or planning slot.
 * Supports: (1) legacy dispatch_item_id, (2) Viaplano slot id "slot-{assignmentId}-{date}".
 * @param {string|number} dispatchItemIdOrSlotId - Dispatch item ID or slot id (slot-AssignmentId-Date)
 * @returns {Array} Array of dispatch assignment objects
 */
export function getDispatchAssignments(dispatchItemIdOrSlotId) {
  const state = getState();
  const assignments = state.data.dispatchAssignments || [];
  const id = String(dispatchItemIdOrSlotId);
  if (id.startsWith('slot-')) {
    const rest = id.slice(5);
    const firstDash = rest.indexOf('-');
    if (firstDash > 0) {
      const assignmentIdPart = rest.slice(0, firstDash);
      const datePart = rest.slice(firstDash + 1);
      if (datePart.length === 10) {
        return assignments.filter(
          (a) =>
            String(a.assignment_id) === assignmentIdPart && a.date === datePart
        );
      }
    }
  }
  return assignments.filter(
    (a) =>
      a.dispatchItemId === dispatchItemIdOrSlotId ||
      a.dispatch_item_id === dispatchItemIdOrSlotId
  );
}

/**
 * Get assignments for a date and resource type.
 * Viaplano: dispatch_assignments have worker_id, vehicle_ids[], device_ids[] (no resourceType).
 * Legacy: dispatch_assignments may have resource_type + resource_id.
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} resourceType - Resource type ('WORKER', 'VEHICLE', 'DEVICE') or null for all
 * @returns {Array} Array of dispatch assignment objects
 */
export function getAssignmentsForDate(date, resourceType = null) {
  const state = getState();
  let assignments = state.data.dispatchAssignments || [];
  assignments = assignments.filter((a) => a.date === date);
  if (!resourceType) return assignments;
  if (resourceType === 'WORKER') {
    return assignments.filter((a) => a.worker_id != null);
  }
  if (resourceType === 'VEHICLE') {
    return assignments.filter((a) => {
      const ids = a.vehicle_ids;
      return Array.isArray(ids) && ids.length > 0;
    });
  }
  if (resourceType === 'DEVICE') {
    return assignments.filter((a) => {
      const ids = a.device_ids;
      return Array.isArray(ids) && ids.length > 0;
    });
  }
  return assignments.filter(
    (a) => (a.resourceType || a.resource_type) === resourceType
  );
}

// ========== Zentrales Planungsmodell (Viaplano) ==========
// Führende Entität: assignments (Einsätze). dispatch_assignments = Planungen pro Tag.
// Einsatzorte (Locations) sind erstklassige Entität: Jeder Einsatz ist genau einem Ort zugeordnet.
// Ohne Einsatzort ist keine fachlich korrekte Disposition möglich (Mitarbeiter arbeiten an einem Ort).

/**
 * Planning slots for a date range (derived from assignments).
 * One slot = one assignment on one day within [start_date, end_date].
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @returns {Array} Slots: { id, assignmentId, date, locationId, title, notes, status, start_date, end_date }
 */
export function getPlanningSlotsForDateRange(dateFrom, dateTo) {
  const state = getState();
  const assignments = state.data.assignments || [];
  const slots = [];
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  for (const a of assignments) {
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    for (let d = new Date(Math.max(from.getTime(), start.getTime())); d <= end && d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (dateStr >= dateFrom && dateStr <= dateTo) {
        const assignmentStatus = a.status || 'Geplant';
        slots.push({
          id: `slot-${a.id}-${dateStr}`,
          assignmentId: a.id,
          date: dateStr,
          locationId: a.location_id,
          title: a.title,
          notes: a.notes,
          status: assignmentStatus === 'Abgeschlossen' ? 'CONFIRMED' : 'PLANNED',
          start_date: a.start_date,
          end_date: a.end_date,
          allDay: true,
          all_day: true
        });
      }
    }
  }
  return slots;
}

/**
 * Dispatch assignments for one slot (assignment + date).
 * @param {string|number} assignmentId - Assignment ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Array} dispatch_assignments for this slot
 */
export function getDispatchAssignmentsForSlot(assignmentId, date) {
  const state = getState();
  const list = state.data.dispatchAssignments || [];
  return list.filter(
    (a) => String(a.assignment_id) === String(assignmentId) && a.date === date
  );
}

/**
 * Resource pills for a slot (for card display).
 * Viaplano: dispatch_assignments have worker_id, vehicle_ids[], device_ids[].
 * @param {string|number} assignmentId - Assignment ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Array} Pills: { resourceType, resourceId, id, dispatchAssignmentId }
 */
export function getResourcePillsForSlot(assignmentId, date) {
  const plans = getDispatchAssignmentsForSlot(assignmentId, date);
  const pills = [];
  for (const p of plans) {
    const daId = p.id;
    if (p.worker_id) {
      pills.push({
        resourceType: 'WORKER',
        resourceId: p.worker_id,
        id: daId,
        dispatchAssignmentId: daId
      });
    }
    const vIds = Array.isArray(p.vehicle_ids) ? p.vehicle_ids : [];
    for (const vid of vIds) {
      pills.push({
        resourceType: 'VEHICLE',
        resourceId: vid,
        id: `${daId}-v-${vid}`,
        dispatchAssignmentId: daId
      });
    }
    const dIds = Array.isArray(p.device_ids) ? p.device_ids : [];
    for (const did of dIds) {
      pills.push({
        resourceType: 'DEVICE',
        resourceId: did,
        id: `${daId}-d-${did}`,
        dispatchAssignmentId: daId
      });
    }
  }
  return pills;
}

/**
 * Worker IDs assigned on a date (Viaplano: from dispatch_assignments).
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Set<string>} Set of worker ID strings
 */
export function getAssignedWorkerIdsOnDate(date) {
  const state = getState();
  const list = state.data.dispatchAssignments || [];
  const set = new Set();
  list.filter((a) => a.date === date).forEach((a) => {
    if (a.worker_id) set.add(String(a.worker_id));
  });
  return set;
}

/**
 * Doppelbuchung: Hat ein Slot (assignmentId, date) mindestens einen Worker, der an diesem Tag
 * auch in einem anderen Einsatz (ggf. anderer Einsatzort) eingeplant ist? Gleiche Person, zwei Orte = Konflikt.
 * @param {string|number} assignmentId - Assignment ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {boolean}
 */
export function getSlotHasConflict(assignmentId, date) {
  const state = getState();
  const list = state.data.dispatchAssignments || [];
  const onDate = list.filter((a) => a.date === date && a.worker_id);
  const workersInThisSlot = new Set(
    onDate.filter((a) => String(a.assignment_id) === String(assignmentId)).map((a) => String(a.worker_id))
  );
  if (workersInThisSlot.size === 0) return false;
  const otherAssignments = onDate.filter((a) => String(a.assignment_id) !== String(assignmentId));
  for (const w of workersInThisSlot) {
    if (otherAssignments.some((a) => String(a.worker_id) === w)) return true;
  }
  return false;
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
  
  // For WORKER: use Viaplano model (dispatch_assignments.worker_id + date) first; fallback to dispatch_items
  if (resourceType === 'WORKER') {
    const assignedWorkerIds = getAssignedWorkerIdsOnDate(date);
    const result = allResources.filter((r) => !assignedWorkerIds.has(String(r.id)));
    selectorCache.unassignedResources.set(cacheKey, result);
    return result;
  }
  
  // For VEHICLE/DEVICE: Viaplano uses vehicle_ids[] / device_ids[] per dispatch_assignment
  const list = getAssignmentsForDate(date, resourceType);
  const assignedIds = new Set();
  list.forEach((a) => {
    if (resourceType === 'VEHICLE' && Array.isArray(a.vehicle_ids)) {
      a.vehicle_ids.forEach((id) => assignedIds.add(String(id)));
    } else if (resourceType === 'DEVICE' && Array.isArray(a.device_ids)) {
      a.device_ids.forEach((id) => assignedIds.add(String(id)));
    } else if (a.resourceId != null || a.resource_id != null) {
      assignedIds.add(String(a.resourceId || a.resource_id));
    }
  });
  const result = allResources.filter((r) => !assignedIds.has(String(r.id)));
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
 * Planning slots for one worker on one day (Viaplano).
 * Slots an diesem Tag, bei denen der Mitarbeiter eingeplant ist.
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID
 * @returns {Array} Slots mit assignmentId, date, locationId, title, status, …
 */
export function getPlanningSlotsForWorkerDay(date, workerId) {
  const slots = getPlanningSlotsForDateRange(date, date);
  return slots.filter((slot) => {
    const plans = getDispatchAssignmentsForSlot(slot.assignmentId, slot.date);
    return plans.some((p) => String(p.worker_id) === String(workerId));
  });
}

/**
 * Get dispatch items or planning slots for a worker and day - MEMOIZED
 * Viaplano: Wenn Einsätze existieren, werden Slots für diesen Worker/Tag zurückgegeben.
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID
 * @returns {Array} Array of dispatch item or slot objects
 */
export function getDispatchItemsForWorkerDay(date, workerId) {
  isCacheValid();
  const cacheKey = `${date}-${workerId}`;
  if (selectorCache.dispatchItemsForWorkerDay.has(cacheKey)) {
    return selectorCache.dispatchItemsForWorkerDay.get(cacheKey);
  }
  const state = getState();
  const hasAssignments = (state.data.assignments || []).length > 0;
  const result = hasAssignments
    ? getPlanningSlotsForWorkerDay(date, workerId)
    : getDispatchItems(date, date).filter((item) => {
        const assignments = getDispatchAssignments(item.id);
        return assignments.some(
          (a) =>
            (a.resourceType || a.resource_type) === 'WORKER' &&
            String(a.resourceId || a.resource_id) === String(workerId) &&
            a.date === date
        );
      });
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
 * Get locations (deduped by id).
 * Einsatzort-Modell: id, name, adresse (optional), code/referenz (optional), status (aktiv/inaktiv).
 * @returns {Array} Array of location objects
 */
export function getLocations() {
  const state = getState();
  let locations = state.data.locations || [];
  
  const seen = new Set();
  locations = locations.filter(loc => {
    if (seen.has(loc.id)) return false;
    seen.add(loc.id);
    return true;
  });
  
  return locations;
}

/**
 * Einsatzort nach ID. Wird für Board-Karten und Konflikt-/Filterlogik genutzt.
 * @param {string|number} locationId
 * @returns {object|null} Location oder null
 */
export function getLocationById(locationId) {
  if (locationId == null || locationId === '') return null;
  const state = getState();
  const list = state.data.locations || [];
  return list.find(loc => String(loc.id) === String(locationId)) || null;
}

/**
 * Nur aktive Einsatzorte (Status aktiv oder fehlend = aktiv).
 * @returns {Array}
 */
export function getActiveLocations() {
  return getLocations().filter(loc => {
    const s = (loc.status || '').toLowerCase();
    return s !== 'inaktiv' && s !== 'inactive';
  });
}

/**
 * Gibt es mindestens einen Einsatzort? Ohne Einsatzorte ist keine Planung möglich.
 * @returns {boolean}
 */
export function hasAnyLocations() {
  return getLocations().length > 0;
}

/**
 * Hat ein Einsatz einen gültigen Einsatzort? Ohne Einsatzort ist DropZone inaktiv.
 * @param {object} assignment - Assignment (Einsatz)
 * @returns {boolean}
 */
export function assignmentHasLocation(assignment) {
  if (!assignment) return false;
  const id = assignment.location_id ?? assignment.locationId;
  if (id == null || id === '') return false;
  return getLocationById(id) != null;
}

/**
 * Einsätze, die einem Einsatzort zugeordnet sind (optional für Filter).
 * @param {string|number} locationId
 * @returns {Array}
 */
export function getAssignmentsByLocation(locationId) {
  if (locationId == null || locationId === '') return [];
  const state = getState();
  return (state.data.assignments || []).filter(
    a => String(a.location_id ?? a.locationId) === String(locationId)
  );
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
      allItems = (state.data.assignments || []).length > 0
        ? (state.data.assignments || [])
        : getDispatchItems();
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

