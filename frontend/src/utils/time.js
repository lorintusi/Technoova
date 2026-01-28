/**
 * Time calculation utilities (Single Source of Truth)
 * All time calculations use these functions to ensure consistency
 */

/**
 * Parse HH:MM time string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight (0-1439)
 */
export function parseHHMMToMinutes(timeStr) {
  if (!timeStr) return 0;
  try {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  } catch (e) {
    console.warn('Invalid time format:', timeStr);
    return 0;
  }
}

/**
 * Calculate duration in minutes between two times, handling midnight crossover
 * @param {string} timeFrom - Start time in HH:MM format
 * @param {string} timeTo - End time in HH:MM format
 * @returns {number} Duration in minutes (handles overnight shifts)
 */
export function durationMinutes(timeFrom, timeTo) {
  if (!timeFrom || !timeTo) return 0;
  const fromMinutes = parseHHMMToMinutes(timeFrom);
  const toMinutes = parseHHMMToMinutes(timeTo);
  
  if (toMinutes <= fromMinutes) {
    // Overnight shift: add 24 hours
    return (24 * 60 - fromMinutes) + toMinutes;
  }
  return toMinutes - fromMinutes;
}

/**
 * Calculate hours from time_from/time_to, handling midnight crossover
 * @param {string} timeFrom - Start time in HH:MM format
 * @param {string} timeTo - End time in HH:MM format
 * @returns {number} Hours (decimal, e.g. 2.5 for 2h30m)
 */
export function calculateHoursFromTimes(timeFrom, timeTo) {
  const minutes = durationMinutes(timeFrom, timeTo);
  return minutes / 60;
}

/**
 * Calculate entry minutes from time_from/time_to (SINGLE SOURCE OF TRUTH)
 * @param {object} entry - Time entry with time_from and time_to
 * @returns {number} Minutes
 */
export function entryMinutes(entry) {
  if (!entry.time_from || !entry.time_to) return 0;
  return durationMinutes(entry.time_from, entry.time_to);
}

/**
 * Calculate entry hours from time_from/time_to (SINGLE SOURCE OF TRUTH)
 * @param {object} entry - Time entry with time_from and time_to
 * @returns {number} Hours (decimal)
 */
export function entryHours(entry) {
  return entryMinutes(entry) / 60;
}

/**
 * Get hours for a time entry (uses time_from/time_to if available, else entry.hours)
 * @param {object} entry - Time entry object
 * @returns {number} Hours (decimal)
 */
export function getEntryHours(entry) {
  // Alias auf entryHours, damit es keine zweite Berechnungslogik gibt
  return entryHours(entry);
}

/**
 * Group entries by category and calculate totals
 * @param {Array} entries - Array of time entries
 * @returns {Object} {category: totalHours}
 */
export function groupByCategory(entries) {
  const grouped = {};
  entries.forEach(entry => {
    const category = entry.category || 'BUERO_ALLGEMEIN';
    if (!grouped[category]) {
      grouped[category] = 0;
    }
    grouped[category] += entryHours(entry);
  });
  return grouped;
}

/**
 * Calculate duration between two times (deprecated alias, use durationMinutes)
 * @param {string} timeFrom - Start time in HH:MM format
 * @param {string} timeTo - End time in HH:MM format
 * @returns {number} Duration in minutes
 */
export function minutesBetween(timeFrom, timeTo) {
  return durationMinutes(timeFrom, timeTo);
}

/**
 * Calculate duration (deprecated alias, use durationMinutes)
 * @param {string} timeFrom - Start time in HH:MM format
 * @param {string} timeTo - End time in HH:MM format
 * @returns {number} Duration in minutes
 */
export function calculateDuration(timeFrom, timeTo) {
  return durationMinutes(timeFrom, timeTo);
}

