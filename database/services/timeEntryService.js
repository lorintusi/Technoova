/**
 * Time Entry Service (ESM Module)
 * Ersetzt POST /api/time_entries/confirm_day und Business Logic
 */

import * as timeEntryRepository from '../repositories/timeEntryRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { dbQuery } from '../db.js';

/**
 * Confirm day (convert all PLANNED entries to CONFIRMED for current user)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} currentUser - Current user
 * @returns {Promise<Object>} { ok: true, date, updated_count: N }
 */
export async function confirmDay(date, currentUser) {
  try {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, error: 'Invalid date format. Expected YYYY-MM-DD' };
    }
    
    // Get current user's worker_id
    const user = await userRepository.getById(currentUser.id);
    const workerId = user?.worker_id || null;
    
    // Get all PLANNED entries for this user on this date
    const filters = {
      dateFrom: date,
      dateTo: date,
      status: 'PLANNED'
    };
    
    const entries = await timeEntryRepository.getByFilters(filters, currentUser);
    
    // Filter to only entries that belong to current user
    const userEntries = entries.filter(entry => {
      if (workerId && entry.workerId === workerId) return true;
      if (entry.user_id === currentUser.id) return true;
      return false;
    });
    
    // Update each entry to CONFIRMED
    let updatedCount = 0;
    for (const entry of userEntries) {
      await timeEntryRepository.update(entry.id, {
        status: 'CONFIRMED',
        confirmed_at: new Date().toISOString(),
        confirmed_by: currentUser.id
      }, currentUser);
      updatedCount++;
    }
    
    return {
      ok: true,
      date,
      updated_count: updatedCount
    };
  } catch (error) {
    console.error('Confirm day error:', error);
    return { ok: false, error: error.message || 'Failed to confirm day' };
  }
}

/**
 * Check for overlapping time entries
 * @param {string} entryDate - Date in YYYY-MM-DD
 * @param {string} timeFrom - HH:MM
 * @param {string} timeTo - HH:MM
 * @param {string} workerId - Worker ID (optional)
 * @param {string} userId - User ID (optional, if no workerId)
 * @param {string} excludeEntryId - Entry ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if overlap exists
 */
export async function checkOverlap(entryDate, timeFrom, timeTo, workerId, userId, excludeEntryId = null) {
  // Convert times to minutes
  const [fromHour, fromMin] = timeFrom.split(':').map(Number);
  const [toHour, toMin] = timeTo.split(':').map(Number);
  const fromMinutes = fromHour * 60 + fromMin;
  let toMinutes = toHour * 60 + toMin;
  if (toMinutes <= fromMinutes) {
    toMinutes += 24 * 60; // Next day
  }
  
  // Get existing entries
  let sql, params;
  if (workerId) {
    sql = 'SELECT id, time_from, time_to FROM time_entries WHERE entry_date = ? AND worker_id = ?';
    params = [entryDate, workerId];
  } else {
    sql = 'SELECT id, time_from, time_to FROM time_entries WHERE entry_date = ? AND worker_id IS NULL AND created_by = ?';
    params = [entryDate, userId];
  }
  
  if (excludeEntryId) {
    sql += ' AND id != ?';
    params.push(excludeEntryId);
  }
  
  const existingEntries = dbQuery(sql, params);
  
  // Check for overlaps
  for (const existing of existingEntries) {
    const [eFromHour, eFromMin] = existing.time_from.split(':').map(Number);
    const [eToHour, eToMin] = existing.time_to.split(':').map(Number);
    const eFromMinutes = eFromHour * 60 + eFromMin;
    let eToMinutes = eToHour * 60 + eToMin;
    if (eToMinutes <= eFromMinutes) {
      eToMinutes += 24 * 60;
    }
    
    // Overlap if: newStart < existingEnd AND newEnd > existingStart
    if (fromMinutes < eToMinutes && toMinutes > eFromMinutes) {
      return true; // Overlap found
    }
  }
  
  return false; // No overlap
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.timeEntryService = { confirmDay, checkOverlap };
}
