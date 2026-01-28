/**
 * Planning Service
 * Handles planning entry operations and confirm flow
 */

import { api } from '../api/endpoints.js';
import { 
  getState, 
  setState, 
  getPlanningEntriesForDay, 
  getActiveWorkerId, 
  getActiveUserId, 
  getActiveUser,
  getDefaultWorkHours,
  addTimeEntry, 
  setTimeEntries,
  updatePlanningEntry as updatePlanningEntryAction, 
  setPlanningEntries
} from '../state/index.js';
import { canPlanFor } from '../utils/permissions.js';
import { formatDateLocal } from '../utils/format.js';

/**
 * Load planning entries for a week
 */
export async function loadPlanningEntries(weekStart, workerId) {
  try {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    // Calculate week number and year
    const weekNumber = getWeekNumber(weekStartDate);
    const year = weekStartDate.getFullYear();
    
    const response = await api.getWeekPlanning(workerId, weekNumber, year);
    
    if (response.success && response.data) {
      // Map API response to PlanningEntry format (normalize snake_case to camelCase)
      const entries = Array.isArray(response.data) ? response.data : [];
      const mappedEntries = entries.map(entry => {
        // Normalize field names (handle both snake_case and camelCase)
        const normalized = {
          id: entry.id,
          workerId: entry.worker_id || entry.workerId,
          date: entry.date || entry.entry_date,
          startTime: entry.start_time || entry.startTime || entry.time_from || null,
          endTime: entry.end_time || entry.endTime || entry.time_to || null,
          allDay: entry.all_day !== undefined ? Boolean(entry.all_day) : (entry.allDay !== undefined ? Boolean(entry.allDay) : false),
          locationId: entry.location_id || entry.locationId || null,
          category: entry.category,
          note: entry.note || entry.notes || '',
          status: entry.status || 'PLANNED',
          createdByUserId: entry.created_by_user_id || entry.createdByUserId,
          createdByRole: entry.created_by_role || entry.createdByRole || 'ADMIN',
          source: entry.source || (entry.created_by_role === 'WORKER' ? 'SELF_PLAN' : 'ADMIN_PLAN'),
          updatedAt: entry.updated_at || entry.updatedAt,
          timeEntryId: entry.time_entry_id || entry.timeEntryId || null,
          // Additional fields for display/validation
          locationName: entry.location_code || entry.location_address || null,
          locationCode: entry.location_code || null
        };
        return normalized;
      });
      
      setPlanningEntries(mappedEntries);
      return { success: true, entries: mappedEntries };
    }
    
    return { success: true, entries: [] };
  } catch (error) {
    console.error('Error loading planning entries:', error);
    // Return empty array instead of crashing
    return { 
      success: false, 
      error: error.message || 'Fehler beim Laden der Planung',
      entries: [] 
    };
  }
}

/**
 * Create planning entry
 */
export async function createPlanningEntry(entryData) {
  try {
    // Map to API format
    const apiData = {
      worker_id: entryData.workerId,
      date: entryData.date,
      start_time: entryData.startTime || null,
      end_time: entryData.endTime || null,
      all_day: entryData.allDay || false,
      location_id: entryData.locationId || null,
      category: entryData.category,
      note: entryData.note || '',
      status: entryData.status || 'PLANNED',
      source: entryData.source || 'ADMIN_PLAN',
      created_by_user_id: entryData.createdByUserId || null,
      created_by_role: entryData.createdByRole || 'ADMIN'
    };
    
    const response = await api.createPlanningEntry(apiData);
    
    if (response.success && response.data) {
      // Normalize response data (handle snake_case from backend)
      const responseData = response.data || response;
      const newEntry = {
        id: responseData.id || response.id,
        workerId: responseData.worker_id || responseData.workerId || entryData.workerId,
        date: responseData.date || entryData.date,
        startTime: responseData.start_time || responseData.startTime || entryData.startTime || null,
        endTime: responseData.end_time || responseData.endTime || entryData.endTime || null,
        allDay: responseData.all_day !== undefined ? Boolean(responseData.all_day) : (responseData.allDay !== undefined ? Boolean(responseData.allDay) : (entryData.allDay || false)),
        locationId: responseData.location_id || responseData.locationId || entryData.locationId || null,
        category: responseData.category || entryData.category,
        note: responseData.note || entryData.note || '',
        status: responseData.status || entryData.status || 'PLANNED',
        source: responseData.source || entryData.source || 'ADMIN_PLAN',
        createdByUserId: responseData.created_by_user_id || responseData.createdByUserId || entryData.createdByUserId || null,
        createdByRole: responseData.created_by_role || responseData.createdByRole || entryData.createdByRole || 'ADMIN',
        updatedAt: responseData.updated_at || responseData.updatedAt || new Date().toISOString(),
        timeEntryId: responseData.time_entry_id || responseData.timeEntryId || null,
        locationName: responseData.location_code || responseData.location_address || null,
        locationCode: responseData.location_code || null
      };
      
      const state = getState();
      setPlanningEntries([...state.planning.entries, newEntry]);
      
      return { success: true, entry: newEntry };
    }
    
    return { 
      success: false, 
      error: response.error || 'Fehler beim Speichern der Planung' 
    };
  } catch (error) {
    console.error('Error creating planning entry:', error);
    return { 
      success: false, 
      error: error.message || 'Unbekannter Fehler beim Speichern' 
    };
  }
}

/**
 * Update planning entry
 */
export async function updatePlanningEntryService(entryId, entryData) {
  try {
    // Map to API format
    const apiData = {
      worker_id: entryData.workerId,
      date: entryData.date,
      start_time: entryData.startTime || null,
      end_time: entryData.endTime || null,
      all_day: entryData.allDay || false,
      location_id: entryData.locationId || null,
      category: entryData.category,
      note: entryData.note || '',
      status: entryData.status || 'PLANNED'
    };
    
    const response = await api.updatePlanningEntry(entryId, apiData);
    
    if (response.success) {
      const state = getState();
      const existingEntry = state.planning.entries.find(e => e.id === entryId);
      const responseData = response.data || {};
      
      // Normalize updated entry (ensure camelCase)
      const updatedEntry = {
        id: entryId,
        workerId: entryData.workerId || existingEntry?.workerId,
        date: entryData.date || existingEntry?.date,
        startTime: entryData.startTime !== undefined ? entryData.startTime : (existingEntry?.startTime || null),
        endTime: entryData.endTime !== undefined ? entryData.endTime : (existingEntry?.endTime || null),
        allDay: entryData.allDay !== undefined ? Boolean(entryData.allDay) : (existingEntry?.allDay || false),
        locationId: entryData.locationId !== undefined ? entryData.locationId : (existingEntry?.locationId || null),
        category: entryData.category || existingEntry?.category,
        note: entryData.note !== undefined ? entryData.note : (existingEntry?.note || ''),
        status: entryData.status || existingEntry?.status || 'PLANNED',
        source: existingEntry?.source || 'ADMIN_PLAN',
        createdByUserId: existingEntry?.createdByUserId,
        createdByRole: existingEntry?.createdByRole || 'ADMIN',
        updatedAt: new Date().toISOString(),
        timeEntryId: existingEntry?.timeEntryId || null
      };
      
      const updatedEntries = state.planning.entries.map(e =>
        e.id === entryId ? updatedEntry : e
      );
      setPlanningEntries(updatedEntries);
      updatePlanningEntryAction(updatedEntry);
      
      return { success: true, entry: updatedEntry };
    }
    
    return { 
      success: false, 
      error: response.error || 'Fehler beim Aktualisieren der Planung' 
    };
  } catch (error) {
    console.error('Error updating planning entry:', error);
    return { 
      success: false, 
      error: error.message || 'Unbekannter Fehler beim Aktualisieren' 
    };
  }
}

/**
 * Delete planning entry
 */
export async function deletePlanningEntry(entryId) {
  try {
    const response = await api.deletePlanningEntry(entryId);
    
    if (response.success) {
      const state = getState();
      const updatedEntries = state.planning.entries.filter(e => e.id !== entryId);
      setPlanningEntries(updatedEntries);
      
      return { success: true };
    }
    
    return { 
      success: false, 
      error: response.error || 'Fehler beim Löschen der Planung' 
    };
  } catch (error) {
    console.error('Error deleting planning entry:', error);
    return { 
      success: false, 
      error: error.message || 'Unbekannter Fehler beim Löschen' 
    };
  }
}

/**
 * Save planning entry (legacy compatibility)
 */
export async function savePlanningEntry(entryData) {
  return createPlanningEntry(entryData);
}

/**
 * Confirm day - converts planned blocks to time entries (IDEMPOTENT)
 * Prevents duplicates using meta.sourcePlanningEntryId
 */
export async function confirmDayFromPlanning(date, workerId) {
  try {
    // Validate worker can confirm for this workerId
    const state = getState();
    const currentUser = getActiveUser();
    
    // Permission check
    if (!canPlanFor(currentUser, workerId)) {
      return { 
        success: false, 
        error: 'Sie können nur für sich selbst bestätigen' 
      };
    }
    
    // Get planned entries for this day
    const plannedEntries = getPlanningEntriesForDay(date, workerId)
      .filter(e => e.status === 'PLANNED');
    
    if (plannedEntries.length === 0) {
      return { 
        success: true, 
        message: 'Keine geplanten Blöcke für diesen Tag',
        createdEntries: [],
        confirmedCount: 0
      };
    }
    
    const workHours = getDefaultWorkHours();
    const createdTimeEntries = [];
    const confirmedEntryIds = [];
    const timeEntryMap = {};
    
    // Process each planned entry (idempotent)
    for (const plannedEntry of plannedEntries) {
      // IDEMPOTENCY CHECK: Check if already linked via timeEntryId or meta.sourcePlanningEntryId
      const state = getState();
      
      // Check 1: Planning entry already has timeEntryId
      if (plannedEntry.timeEntryId) {
        const existingTimeEntry = state.data.timeEntries.find(te => te.id === plannedEntry.timeEntryId);
        if (existingTimeEntry) {
          // Already confirmed, skip
          confirmedEntryIds.push(plannedEntry.id);
          timeEntryMap[plannedEntry.id] = plannedEntry.timeEntryId;
          continue;
        }
      }
      
      // Check 2: TimeEntry exists with meta.sourcePlanningEntryId
      const existingByMeta = state.data.timeEntries.find(te => {
        const meta = te.meta || {};
        return meta.sourcePlanningEntryId === plannedEntry.id &&
               te.entry_date === date &&
               (te.worker_id === workerId || te.user_id === workerId);
      });
      
      if (existingByMeta) {
        // Already exists, link planning entry
        confirmedEntryIds.push(plannedEntry.id);
        timeEntryMap[plannedEntry.id] = existingByMeta.id;
        continue;
      }
      
      // Check 3: TimeEntry exists with same date/location/category (fallback)
      const existingByMatch = state.data.timeEntries.find(te => 
        te.entry_date === date &&
        (te.worker_id === workerId || te.user_id === workerId) &&
        te.location_id === plannedEntry.locationId &&
        te.category === plannedEntry.category &&
        te.status === 'CONFIRMED'
      );
      
      if (existingByMatch) {
        // Likely duplicate, link it
        confirmedEntryIds.push(plannedEntry.id);
        timeEntryMap[plannedEntry.id] = existingByMatch.id;
        continue;
      }
      
      // No duplicate found - create new time entry
      let timeFrom, timeTo;
      if (plannedEntry.allDay) {
        timeFrom = workHours.workday_start;
        timeTo = workHours.workday_end;
      } else {
        timeFrom = plannedEntry.startTime || plannedEntry.time_from || workHours.workday_start;
        timeTo = plannedEntry.endTime || plannedEntry.time_to || workHours.workday_end;
      }
      
      // Create time entry with meta.sourcePlanningEntryId and audit trail
      const { getActiveUserId } = await import('../state/selectors.js');
      const confirmedByUserId = getActiveUserId();
      const confirmedAt = new Date().toISOString();
      
      const timeEntryData = {
        worker_id: workerId,
        entry_date: date,
        time_from: timeFrom,
        time_to: timeTo,
        category: plannedEntry.category,
        location_id: plannedEntry.locationId,
        notes: plannedEntry.note || '',
        status: 'CONFIRMED',
        meta: {
          sourcePlanningEntryId: plannedEntry.id,
          createdFromPlanningAt: confirmedAt,
          createdFromPlanningByUserId: confirmedByUserId
        }
      };
      
      try {
        const timeEntryResponse = await api.createTimeEntry(timeEntryData);
        
        if (timeEntryResponse.success) {
          const newTimeEntry = timeEntryResponse.data || timeEntryResponse;
          createdTimeEntries.push(newTimeEntry);
          confirmedEntryIds.push(plannedEntry.id);
          timeEntryMap[plannedEntry.id] = newTimeEntry.id || newTimeEntry.data?.id;
        } else {
          console.error('Failed to create time entry:', timeEntryResponse.error);
          // Continue with other entries
        }
      } catch (error) {
        console.error('Error creating time entry:', error);
        // Continue with other entries
      }
    }
    
    // Update planning entries status in batch
    if (confirmedEntryIds.length > 0) {
      try {
        const { markPlanningEntriesConfirmed } = await import('../state/actions.js');
        markPlanningEntriesConfirmed(confirmedEntryIds, timeEntryMap);
        
        // Persist to backend
        for (const entryId of confirmedEntryIds) {
          try {
            await api.updatePlanningEntry(entryId, {
              status: 'CONFIRMED',
              time_entry_id: timeEntryMap[entryId]
            });
          } catch (error) {
            console.error(`Error updating planning entry ${entryId}:`, error);
            // Continue
          }
        }
      } catch (error) {
        console.error('Error updating planning entries:', error);
      }
    }
    
    // Call confirmDay API if exists (optional)
    try {
      await api.confirmDay(date);
    } catch (e) {
      // Ignore if endpoint doesn't exist
      console.log('confirmDay endpoint not available, skipping');
    }
    
    // Reload data
    try {
      await reloadDayData(date, workerId);
    } catch (error) {
      console.error('Error reloading day data:', error);
      // Don't fail the whole operation
    }
    
    return { 
      success: true, 
      createdEntries: createdTimeEntries,
      confirmedCount: confirmedEntryIds.length,
      skippedCount: plannedEntries.length - confirmedEntryIds.length
    };
  } catch (error) {
    console.error('Error confirming day:', error);
    return { 
      success: false, 
      error: error.message || 'Unbekannter Fehler beim Bestätigen' 
    };
  }
}

/**
 * Update planning entry status
 */
async function updatePlanningEntryStatus(entryId, status, timeEntryId = null) {
  try {
    const state = getState();
    const entry = state.planning.entries.find(e => e.id === entryId);
    if (!entry) return;
    
    const updatedEntry = {
      ...entry,
      status,
      timeEntryId: timeEntryId || entry.timeEntryId,
      updatedAt: new Date().toISOString()
    };
    
    // Update via API
    await api.updatePlanningEntry(entryId, {
      status,
      time_entry_id: timeEntryId
    });
    
    // Update state
    const updatedEntries = state.planning.entries.map(e =>
      e.id === entryId ? updatedEntry : e
    );
    setPlanningEntries(updatedEntries);
  } catch (error) {
    console.error('Error updating planning entry status:', error);
  }
}

/**
 * Reload day data after confirm
 */
async function reloadDayData(date, workerId) {
  try {
    // Reload time entries
    const timeEntriesResponse = await api.getTimeEntries({
      worker_id: workerId,
      date: date
    });
    
    if (timeEntriesResponse.success) {
      const state = getState();
      const existingEntries = state.data.timeEntries.filter(e => 
        !(e.entry_date === date && e.worker_id === workerId)
      );
      const newEntries = timeEntriesResponse.data || [];
      setTimeEntries([...existingEntries, ...newEntries]);
    }
    
    // Reload planning entries
    const weekStart = getWeekStartDate(new Date(date));
    await loadPlanningEntries(formatDateLocal(weekStart), workerId);
  } catch (error) {
    console.error('Error reloading day data:', error);
  }
}

/**
 * Get week start date
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
 * Get week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}


