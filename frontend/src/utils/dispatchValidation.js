/**
 * Dispatch Validation Utilities
 * Validates dispatch items for overlaps and conflicts
 * 
 * CRITICAL: Multiple dispatch items per day per worker are STANDARD
 * Overlaps must be prevented, but non-overlapping items are allowed
 */

/**
 * Check if two time ranges overlap
 * @param {string} start1 - Start time (HH:MM)
 * @param {string} end1 - End time (HH:MM)
 * @param {string} start2 - Start time (HH:MM)
 * @param {string} end2 - End time (HH:MM)
 * @returns {boolean} True if ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) {
    return false; // Can't overlap if times are missing
  }
  
  // Convert to minutes since midnight
  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  
  const start1Min = parseTime(start1);
  const end1Min = parseTime(end1);
  const start2Min = parseTime(start2);
  const end2Min = parseTime(end2);
  
  // Handle midnight crossover
  const end1Final = end1Min < start1Min ? end1Min + 24 * 60 : end1Min;
  const end2Final = end2Min < start2Min ? end2Min + 24 * 60 : end2Min;
  
  // Check overlap: start1 < end2 && start2 < end1
  return start1Min < end2Final && start2Min < end1Final;
}

/**
 * Validate dispatch item for overlaps with existing items for a worker
 * @param {object} dispatchItem - Dispatch item to validate
 * @param {Array} existingItems - Existing dispatch items for the same worker and date
 * @param {string|number} excludeItemId - Item ID to exclude from check (for updates)
 * @returns {{ok: boolean, message?: string, conflictingItem?: object}}
 */
export function validateDispatchOverlap(dispatchItem, existingItems = [], excludeItemId = null) {
  if (!dispatchItem) {
    return { ok: false, message: 'Dispatch item fehlt' };
  }
  
  const itemDate = dispatchItem.date;
  const itemStartTime = dispatchItem.startTime || dispatchItem.start_time;
  const itemEndTime = dispatchItem.endTime || dispatchItem.end_time;
  const itemAllDay = dispatchItem.allDay || dispatchItem.all_day;
  
  // All-day items overlap with everything on that day
  if (itemAllDay) {
    // Check if there are any other all-day items
    const otherAllDay = existingItems.find(item => {
      if (excludeItemId && String(item.id) === String(excludeItemId)) return false;
      return (item.allDay || item.all_day) && item.date === itemDate;
    });
    
    if (otherAllDay) {
      return {
        ok: false,
        message: `Ganztägiger Einsatz überschneidet sich mit "${otherAllDay.title || 'Einsatz'}"`,
        conflictingItem: otherAllDay
      };
    }
    
    // Check if there are any timed items on the same day
    const timedItems = existingItems.filter(item => {
      if (excludeItemId && String(item.id) === String(excludeItemId)) return false;
      return !(item.allDay || item.all_day) && item.date === itemDate;
    });
    
    if (timedItems.length > 0) {
      return {
        ok: false,
        message: `Ganztägiger Einsatz überschneidet sich mit zeitlich begrenzten Einsätzen`,
        conflictingItem: timedItems[0]
      };
    }
    
    return { ok: true };
  }
  
  // Timed items: check time overlap
  if (!itemStartTime || !itemEndTime) {
    return { ok: false, message: 'Zeitangaben fehlen für zeitlich begrenzten Einsatz' };
  }
  
  // Check overlap with each existing item
  for (const existing of existingItems) {
    if (excludeItemId && String(existing.id) === String(excludeItemId)) {
      continue;
    }
    
    if (existing.date !== itemDate) {
      continue; // Different day, no overlap
    }
    
    // All-day existing item overlaps with everything
    if (existing.allDay || existing.all_day) {
      return {
        ok: false,
        message: `Einsatz überschneidet sich mit ganztägigem Einsatz "${existing.title || 'Einsatz'}"`,
        conflictingItem: existing
      };
    }
    
    // Both are timed - check time overlap
    const existingStartTime = existing.startTime || existing.start_time;
    const existingEndTime = existing.endTime || existing.end_time;
    
    if (existingStartTime && existingEndTime) {
      if (timeRangesOverlap(itemStartTime, itemEndTime, existingStartTime, existingEndTime)) {
        return {
          ok: false,
          message: `Zeitüberschneidung mit Einsatz "${existing.title || existing.locationId || 'Einsatz'}" (${existingStartTime} - ${existingEndTime})`,
          conflictingItem: existing
        };
      }
    }
  }
  
  return { ok: true };
}

/**
 * Validate dispatch assignment for overlaps
 * @param {string|number} workerId - Worker ID (can be null for time-only check)
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {boolean} allDay - All day flag
 * @param {Array} existingDispatchItems - Existing dispatch items for this worker
 * @param {string|number} excludeItemId - Item ID to exclude (for updates)
 * @returns {{ok: boolean, message?: string, conflictingItem?: object}}
 */
export function validateDispatchAssignmentOverlap(workerId, date, startTime, endTime, allDay, existingDispatchItems = [], excludeItemId = null) {
  // If workerId is null, just check time overlap with all items
  if (!workerId) {
    const mockItem = { date, startTime, endTime, allDay };
    return validateDispatchOverlap(mockItem, existingDispatchItems, excludeItemId);
  }
  
  // Filter items for this worker and date
  const itemsForWorkerAndDate = existingDispatchItems.filter(item => {
    if (item.date !== date) return false;
    
    // Check if worker is assigned to this item
    // Note: This function should be called with items already filtered by worker
    // If not, we need to import getDispatchAssignments
    return true; // Assume items are already filtered
  });
  
  // Create a mock dispatch item for validation
  const mockItem = {
    date,
    startTime,
    endTime,
    allDay
  };
  
  return validateDispatchOverlap(mockItem, itemsForWorkerAndDate, excludeItemId);
}

/**
 * Get conflicting dispatch items for a worker on a date
 * @param {string|number} workerId - Worker ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {boolean} allDay - All day flag
 * @param {Function} getDispatchItems - Function to get dispatch items
 * @param {Function} getDispatchAssignments - Function to get assignments
 * @returns {Array} Array of conflicting dispatch items
 */
export async function getConflictingDispatchItems(workerId, date, startTime, endTime, allDay, getDispatchItems, getDispatchAssignments) {
  // Get all dispatch items for this date
  const itemsForDate = getDispatchItems(date, date);
  
  // Filter items where worker is assigned
  const itemsForWorker = itemsForDate.filter(item => {
    const assignments = getDispatchAssignments(item.id);
    return assignments.some(a => 
      (a.resourceType || a.resource_type) === 'WORKER' &&
      String(a.resourceId || a.resource_id) === String(workerId)
    );
  });
  
  // Validate overlap
  const validation = validateDispatchAssignmentOverlap(workerId, date, startTime, endTime, allDay, itemsForWorker);
  
  if (!validation.ok && validation.conflictingItem) {
    return [validation.conflictingItem];
  }
  
  return [];
}

