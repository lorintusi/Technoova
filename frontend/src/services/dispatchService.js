/**
 * Dispatch Service
 * High-level service for dispatch items and assignments
 */

import { api } from '../api/endpoints.js';
import { 
  setDispatchItems, 
  upsertDispatchItem, 
  removeDispatchItem,
  setDispatchAssignments,
  upsertDispatchAssignments as upsertDispatchAssignmentsState,
  removeDispatchAssignment as removeDispatchAssignmentState
} from '../state/index.js';

/**
 * Normalize dispatch item (snake_case → camelCase)
 */
function normalizeDispatchItem(item) {
  if (!item) return null;
  
  const normalized = { ...item };
  
  // Normalize fields
  if (normalized.location_id && !normalized.locationId) {
    normalized.locationId = normalized.location_id;
  }
  if (normalized.start_time && !normalized.startTime) {
    normalized.startTime = normalized.start_time;
  }
  if (normalized.end_time && !normalized.endTime) {
    normalized.endTime = normalized.end_time;
  }
  if (normalized.all_day !== undefined && normalized.allDay === undefined) {
    normalized.allDay = Boolean(normalized.all_day);
  }
  if (normalized.created_by_user_id && !normalized.createdByUserId) {
    normalized.createdByUserId = normalized.created_by_user_id;
  }
  
  // Normalize assignments if present
  if (normalized.assignments && Array.isArray(normalized.assignments)) {
    normalized.assignments = normalized.assignments.map(normalizeDispatchAssignment);
  }
  
  return normalized;
}

/**
 * Normalize dispatch assignment (snake_case → camelCase)
 */
function normalizeDispatchAssignment(assignment) {
  if (!assignment) return null;
  
  const normalized = { ...assignment };
  
  if (normalized.dispatch_item_id && !normalized.dispatchItemId) {
    normalized.dispatchItemId = normalized.dispatch_item_id;
  }
  if (normalized.resource_type && !normalized.resourceType) {
    normalized.resourceType = normalized.resource_type;
  }
  if (normalized.resource_id && !normalized.resourceId) {
    normalized.resourceId = normalized.resource_id;
  }
  
  return normalized;
}

/**
 * Load dispatch items
 * @param {object} params - Query parameters (dateFrom, dateTo, status, locationId)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function loadDispatchItems(params = {}) {
  try {
    const queryParams = {};
    
    if (params.dateFrom) queryParams.date_from = params.dateFrom;
    if (params.dateTo) queryParams.date_to = params.dateTo;
    if (params.status) queryParams.status = params.status;
    if (params.locationId) queryParams.location_id = params.locationId;
    
    const response = await api.getDispatchItems(queryParams);
    
    if (response.success && response.data) {
      const normalized = response.data.map(normalizeDispatchItem);
      setDispatchItems(normalized);
      
      // Also update assignments in state
      const allAssignments = [];
      normalized.forEach(item => {
        if (item.assignments && Array.isArray(item.assignments)) {
          allAssignments.push(...item.assignments);
        }
      });
      if (allAssignments.length > 0) {
        upsertDispatchAssignmentsState(allAssignments);
      }
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to load dispatch items' };
  } catch (error) {
    console.error('Error loading dispatch items:', error);
    return { success: false, error: error.message || 'Failed to load dispatch items' };
  }
}

/**
 * Create dispatch item
 * @param {object} data - Dispatch item data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createDispatchItem(data) {
  try {
    const response = await api.createDispatchItem(data);
    
    if (response.success && response.data) {
      const normalized = normalizeDispatchItem(response.data);
      upsertDispatchItem(normalized);
      
      // Update assignments if present
      if (normalized.assignments && Array.isArray(normalized.assignments)) {
        upsertDispatchAssignmentsState(normalized.assignments);
      }
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to create dispatch item' };
  } catch (error) {
    console.error('Error creating dispatch item:', error);
    return { success: false, error: error.message || 'Failed to create dispatch item' };
  }
}

/**
 * Update dispatch item
 * @param {string|number} id - Dispatch item ID
 * @param {object} data - Updated dispatch item data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateDispatchItem(id, data) {
  try {
    const response = await api.updateDispatchItem(id, data);
    
    if (response.success && response.data) {
      const normalized = normalizeDispatchItem(response.data);
      upsertDispatchItem(normalized);
      
      // Update assignments if present
      if (normalized.assignments && Array.isArray(normalized.assignments)) {
        upsertDispatchAssignmentsState(normalized.assignments);
      }
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to update dispatch item' };
  } catch (error) {
    console.error('Error updating dispatch item:', error);
    return { success: false, error: error.message || 'Failed to update dispatch item' };
  }
}

/**
 * Delete dispatch item
 * @param {string|number} id - Dispatch item ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDispatchItem(id) {
  try {
    const response = await api.deleteDispatchItem(id);
    
    if (response.success) {
      removeDispatchItem(id);
      return { success: true };
    }
    
    return { success: false, error: response.error || 'Failed to delete dispatch item' };
  } catch (error) {
    console.error('Error deleting dispatch item:', error);
    return { success: false, error: error.message || 'Failed to delete dispatch item' };
  }
}

/**
 * Load dispatch assignments for a dispatch item
 * @param {string|number} dispatchItemId - Dispatch item ID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function loadDispatchAssignments(dispatchItemId) {
  try {
    const response = await api.getDispatchAssignments(dispatchItemId);
    
    if (response.success && response.data) {
      const normalized = response.data.map(normalizeDispatchAssignment);
      upsertDispatchAssignmentsState(normalized);
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to load dispatch assignments' };
  } catch (error) {
    console.error('Error loading dispatch assignments:', error);
    return { success: false, error: error.message || 'Failed to load dispatch assignments' };
  }
}

/**
 * Upsert dispatch assignments (batch)
 * @param {string|number} dispatchItemId - Dispatch item ID
 * @param {Array} assignments - Array of assignment objects
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function upsertDispatchAssignmentsBatch(dispatchItemId, assignments) {
  try {
    // Normalize assignments before sending
    const normalizedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      resourceType: assignment.resourceType || assignment.resource_type,
      resourceId: assignment.resourceId || assignment.resource_id,
      date: assignment.date
    }));
    
    const response = await api.upsertDispatchAssignments(dispatchItemId, normalizedAssignments);
    
    if (response.success && response.data) {
      const normalized = response.data.map(normalizeDispatchAssignment);
      upsertDispatchAssignmentsState(normalized);
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to upsert dispatch assignments' };
  } catch (error) {
    console.error('Error upserting dispatch assignments:', error);
    return { success: false, error: error.message || 'Failed to upsert dispatch assignments' };
  }
}

/**
 * Remove dispatch assignment
 * @param {string|number} assignmentId - Assignment ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeDispatchAssignment(assignmentId) {
  try {
    const response = await api.deleteDispatchAssignment(assignmentId);
    
    if (response.success) {
      // Remove from state
      removeDispatchAssignmentState(assignmentId);
      
      return { success: true };
    }
    
    return { success: false, error: response.error || 'Failed to remove assignment' };
  } catch (error) {
    console.error('Error removing dispatch assignment:', error);
    return { success: false, error: error.message || 'Failed to remove assignment' };
  }
}

/**
 * Confirm dispatch day - converts dispatch items to time entries (IDEMPOTENT)
 * Uses backend endpoint for idempotent processing
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string|number} workerId - Worker ID (optional, defaults to current user's worker)
 * @returns {Promise<{success: boolean, created?: number, skipped?: number, details?: Array, error?: string}>}
 */
export async function confirmDispatchDay(date, workerId = null) {
  try {
    const { api } = await import('../api/endpoints.js');
    const { getActiveUser } = await import('../state/index.js');
    const { canConfirmDay } = await import('../utils/permissions.js');
    
    // Permission check
    const currentUser = getActiveUser();
    if (!canConfirmDay(currentUser, workerId, date)) {
      return {
        success: false,
        error: 'Sie können nur für sich selbst bestätigen'
      };
    }
    
    // Call backend endpoint
    const response = await api.confirmDispatchDay(date, workerId);
    
    if (response.success) {
      // Reload time entries and dispatch items
      try {
        const { loadDispatchItems } = await import('./dispatchService.js');
        await loadDispatchItems({
          dateFrom: date,
          dateTo: date
        });
        
        // Reload time entries
        const { api } = await import('../api/endpoints.js');
        const { setTimeEntries } = await import('../state/index.js');
        const timeEntriesResponse = await api.getTimeEntries({
          date: date,
          worker_id: workerId
        });
        if (timeEntriesResponse.success && timeEntriesResponse.data) {
          setTimeEntries(timeEntriesResponse.data);
        }
      } catch (error) {
        console.error('Error reloading data after confirm:', error);
      }
      
      return {
        success: true,
        created: response.created || 0,
        skipped: response.skipped || 0,
        details: response.details || [],
        message: response.message
      };
    }
    
    return {
      success: false,
      error: response.error || 'Fehler beim Bestätigen'
    };
  } catch (error) {
    console.error('Error confirming dispatch day:', error);
    return {
      success: false,
      error: error.message || 'Unbekannter Fehler beim Bestätigen'
    };
  }
}

