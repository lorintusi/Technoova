/**
 * Admin Service (ESM Module)
 * Ersetzt GET /api/admin/overview/week
 */

import { dbQuery, dbExec } from '../db.js';
import * as timeEntryRepository from '../repositories/timeEntryRepository.js';

/**
 * Get week overview for admin (all users and their entries)
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} { ok: true, users: [...], entries: [...] }
 */
export async function getWeekOverview(dateFrom, dateTo) {
  try {
    // Get all users (including those without worker_id)
    const usersSql = `
      SELECT u.id, u.name, u.weekly_hours_target, u.worker_id, w.name as worker_name
      FROM users u
      LEFT JOIN workers w ON u.worker_id = w.id
      ORDER BY u.name
    `;
    const users = dbQuery(usersSql);
    
    // Get all time entries for date range
    const entries = await timeEntryRepository.getByFilters({
      dateFrom,
      dateTo
    }, { role: 'Admin' }); // Pass admin user to bypass AuthZ filter
    
    // Process entries: map user_id (owner)
    const processedEntries = entries.map(entry => {
      // user_id is already set by repository
      return {
        ...entry,
        user_id: entry.user_id,
        user_name: null, // Will be set below
        initials: null
      };
    });
    
    // Add user_name and initials to entries
    for (const entry of processedEntries) {
      if (entry.user_id) {
        const user = users.find(u => u.id === entry.user_id);
        if (user) {
          entry.user_name = user.name;
          // Generate initials (first letter of each word)
          const nameParts = user.name.split(' ');
          entry.initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
        }
      }
    }
    
    // Add initials to users
    const usersWithInitials = users.map(user => {
      const nameParts = user.name.split(' ');
      const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
      return {
        ...user,
        initials
      };
    });
    
    return {
      ok: true,
      users: usersWithInitials,
      entries: processedEntries
    };
  } catch (error) {
    console.error('Get week overview error:', error);
    return { ok: false, error: error.message || 'Failed to get week overview' };
  }
}

/**
 * Cleanup all PLANNED entries (admin only)
 * @returns {Promise<Object>} { ok: true, deleted_count: N }
 */
export async function cleanupPlanned() {
  try {
    const result = dbExec('DELETE FROM time_entries WHERE status = ?', ['PLANNED']);
    return {
      ok: true,
      deleted_count: result.changes || 0
    };
  } catch (error) {
    console.error('Cleanup planned error:', error);
    return { ok: false, error: error.message || 'Failed to cleanup planned entries' };
  }
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.adminService = { getWeekOverview, cleanupPlanned };
}
