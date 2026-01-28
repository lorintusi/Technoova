/**
 * Validation utilities
 */

import { parseHHMMToMinutes } from './time.js';

/**
 * Validate time entry (check overlaps) with midnight handling
 * @param {Array} timeEntries - All time entries
 * @param {string|number} workerId - Worker ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} timeFrom - Start time (HH:MM)
 * @param {string} timeTo - End time (HH:MM)
 * @param {string|number|null} excludeEntryId - Entry ID to exclude from check
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTimeEntry(timeEntries, workerId, date, timeFrom, timeTo, excludeEntryId = null) {
  const dayEntries = (timeEntries || []).filter(entry => 
    entry.worker_id === workerId &&
    entry.entry_date === date &&
    (!excludeEntryId || entry.id !== excludeEntryId)
  );
  
  // Use centralized helper for midnight handling
  const fromMinutes = parseHHMMToMinutes(timeFrom);
  const toMinutes = parseHHMMToMinutes(timeTo);
  const toMinutesAdjusted = toMinutes <= fromMinutes ? toMinutes + (24 * 60) : toMinutes;
  
  for (const entry of dayEntries) {
    if (!entry.time_from || !entry.time_to) continue;
    
    const entryFromMinutes = parseHHMMToMinutes(entry.time_from);
    const entryToMinutes = parseHHMMToMinutes(entry.time_to);
    const entryToMinutesAdjusted = entryToMinutes <= entryFromMinutes ? entryToMinutes + (24 * 60) : entryToMinutes;
    
    // Check if times overlap (handling midnight crossover)
    // Overlap if: newStart < existingEnd AND newEnd > existingStart
    if ((fromMinutes < entryToMinutesAdjusted && toMinutesAdjusted > entryFromMinutes)) {
      return {
        valid: false,
        error: `Zeiteintrag überlappt mit bestehendem Eintrag (${entry.time_from}–${entry.time_to})`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Utility function to normalize values for comparison (null-safe string conversion)
 * @param {*} v - Value to normalize
 * @returns {string|null} Normalized value
 */
export function norm(v) {
  return v == null ? null : String(v);
}

