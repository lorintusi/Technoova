/**
 * Unconfirmed Days Utilities
 * Helper functions for finding unconfirmed planning entries
 */

import { getState } from '../state/index.js';
import { formatDateLocal } from './format.js';

/**
 * Get unconfirmed days for a date range
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @param {string|number|null} workerId - Worker ID (null = all workers)
 * @returns {Array} Array of {workerId, workerName, dates: [], count: number}
 */
export function getUnconfirmedDaysForRange(dateFrom, dateTo, workerId = null) {
  const state = getState();
  const planningEntries = state.planning.entries || [];
  const workers = state.data.workers || [];
  
  // Filter planning entries: PLANNED status, within date range, matching workerId if provided
  const unconfirmedEntries = planningEntries.filter(entry => {
    if (entry.status !== 'PLANNED') return false;
    if (entry.date < dateFrom || entry.date > dateTo) return false;
    if (workerId && entry.workerId !== workerId) return false;
    return true;
  });
  
  // Group by worker
  const workerMap = new Map();
  
  unconfirmedEntries.forEach(entry => {
    const wId = entry.workerId;
    if (!wId) return;
    
    if (!workerMap.has(wId)) {
      const worker = workers.find(w => w.id === wId);
      workerMap.set(wId, {
        workerId: wId,
        workerName: worker?.name || 'Unbekannt',
        dates: new Set(),
        entries: []
      });
    }
    
    const workerData = workerMap.get(wId);
    workerData.dates.add(entry.date);
    workerData.entries.push(entry);
  });
  
  // Convert to array and format
  return Array.from(workerMap.values()).map(data => ({
    workerId: data.workerId,
    workerName: data.workerName,
    dates: Array.from(data.dates).sort(),
    count: data.entries.length
  })).sort((a, b) => a.workerName.localeCompare(b.workerName));
}

/**
 * Get unconfirmed days for last 7 days
 */
export function getUnconfirmedDaysLastWeek() {
  const today = new Date();
  const dateTo = formatDateLocal(today);
  const dateFrom = new Date(today);
  dateFrom.setDate(dateFrom.getDate() - 7);
  return getUnconfirmedDaysForRange(formatDateLocal(dateFrom), dateTo);
}

/**
 * Get unconfirmed days for current week
 */
export function getUnconfirmedDaysCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const weekStart = new Date(today.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  return getUnconfirmedDaysForRange(formatDateLocal(weekStart), formatDateLocal(weekEnd));
}

