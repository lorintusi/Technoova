/**
 * Time Entry Repository (ESM Module)
 * Ersetzt GET/POST/PUT/DELETE /api/time_entries
 */

import { dbQuery, dbExec } from '../db.js';

/**
 * Get time entries with filters
 * @param {Object} filters - { dateFrom, dateTo, userId, workerId, status }
 * @param {Object} currentUser - Current user for AuthZ
 * @returns {Promise<Array>} Array of time entry objects
 */
export async function getByFilters(filters = {}, currentUser) {
  let sql = `
    SELECT te.*,
           l.code as location_code,
           l.address as location_address,
           w.name as worker_name,
           u1.name as planned_by_name,
           u2.name as confirmed_by_name
    FROM time_entries te
    LEFT JOIN workers w ON te.worker_id = w.id
    LEFT JOIN locations l ON te.location_id = l.id
    LEFT JOIN users u1 ON te.planned_by = u1.id
    LEFT JOIN users u2 ON te.confirmed_by = u2.id
    WHERE 1=1
  `;
  
  const params = [];
  const conditions = [];
  
  // AuthZ: Admin can see all, Worker only own
  const isAdmin = currentUser?.role === 'Admin' || 
                  (currentUser?.permissions && 
                   (typeof currentUser.permissions === 'string' 
                     ? JSON.parse(currentUser.permissions) 
                     : currentUser.permissions).includes('manage_users'));
  
  if (!isAdmin && currentUser) {
    // Worker: only own entries
    const workerId = currentUser.worker_id || currentUser.workerId;
    if (workerId) {
      conditions.push('te.worker_id = ?');
      params.push(workerId);
    } else {
      conditions.push('te.created_by = ?');
      params.push(currentUser.id);
    }
  } else if (filters.userId) {
    // Admin filtering by user_id
    const userStmt = dbQuery('SELECT worker_id FROM users WHERE id = ?', [filters.userId]);
    if (userStmt.length > 0 && userStmt[0].worker_id) {
      conditions.push('te.worker_id = ?');
      params.push(userStmt[0].worker_id);
    } else {
      conditions.push('te.created_by = ?');
      params.push(filters.userId);
    }
  }
  
  if (filters.workerId) {
    conditions.push('te.worker_id = ?');
    params.push(filters.workerId);
  }
  
  if (filters.status) {
    conditions.push('te.status = ?');
    params.push(filters.status);
  }
  
  if (filters.dateFrom) {
    conditions.push('te.entry_date >= ?');
    params.push(filters.dateFrom);
  }
  
  if (filters.dateTo) {
    conditions.push('te.entry_date <= ?');
    params.push(filters.dateTo);
  }
  
  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY te.entry_date DESC, te.time_from ASC';
  
  const entries = dbQuery(sql, params);
  
  // Normalize field names for frontend compatibility
  return entries.map(entry => {
    // Determine user_id (owner)
    let userId = null;
    if (entry.worker_id) {
      const userStmt = dbQuery('SELECT id FROM users WHERE worker_id = ? LIMIT 1', [entry.worker_id]);
      userId = userStmt.length > 0 ? userStmt[0].id : null;
    } else {
      userId = entry.created_by;
    }
    
    return {
      id: entry.id,
      user_id: userId,
      date: entry.entry_date,
      time_from: entry.time_from,
      time_to: entry.time_to,
      project_id: entry.location_id,
      project_name: entry.location_address || entry.location_code || null,
      category: entry.category || 'BUERO_ALLGEMEIN',
      status: entry.status || 'PLANNED',
      notes: entry.notes || '',
      meta: entry.meta ? (typeof entry.meta === 'string' ? JSON.parse(entry.meta) : entry.meta) : null,
      // Legacy compatibility
      workerId: entry.worker_id,
      locationId: entry.location_id,
      entryDate: entry.entry_date,
      timeFrom: entry.time_from,
      timeTo: entry.time_to,
      plannedBy: entry.planned_by,
      confirmedBy: entry.confirmed_by,
      confirmedAt: entry.confirmed_at,
      hours: entry.hours
    };
  });
}

/**
 * Get time entry by ID
 * @param {string} entryId - Time entry ID
 * @returns {Promise<Object|null>} Time entry object or null
 */
export async function getById(entryId) {
  const sql = 'SELECT * FROM time_entries WHERE id = ?';
  const results = dbQuery(sql, [entryId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Create time entry
 * @param {Object} entryData - Time entry data
 * @param {Object} currentUser - Current user
 * @returns {Promise<Object>} { success: true, id: entryId }
 */
export async function create(entryData, currentUser) {
  const {
    id, entry_date, time_from, time_to, category = 'BUERO_ALLGEMEIN',
    location_id = null, worker_id = null, user_id = null,
    status = 'PLANNED', notes = '', entry_type = 'BUERO_ALLGEMEIN',
    meta = null
  } = entryData;
  
  // Calculate hours
  const hours = calculateHours(time_from, time_to);
  
  // Determine worker_id and planned_by
  let finalWorkerId = worker_id;
  let plannedBy = null;
  
  const isAdmin = currentUser?.role === 'Admin' || 
                  (currentUser?.permissions && 
                   (typeof currentUser.permissions === 'string' 
                     ? JSON.parse(currentUser.permissions) 
                     : currentUser.permissions).includes('manage_users'));
  
  if (user_id && !finalWorkerId) {
    const userStmt = dbQuery('SELECT worker_id FROM users WHERE id = ?', [user_id]);
    if (userStmt.length > 0 && userStmt[0].worker_id) {
      finalWorkerId = userStmt[0].worker_id;
    }
  }
  
  if (!finalWorkerId) {
    finalWorkerId = currentUser?.worker_id || currentUser?.workerId || null;
  }
  
  if (isAdmin) {
    plannedBy = currentUser.id;
  }
  
  const entryId = id || `time-entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const metaJson = meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null;
  
  const sql = `
    INSERT INTO time_entries (
      id, worker_id, location_id, entry_date, entry_type, category,
      time_from, time_to, hours, notes, status, planned_by,
      created_by, updated_by, meta, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  try {
    dbExec(sql, [
      entryId, finalWorkerId, location_id, entry_date, entry_type, category,
      time_from, time_to, hours, notes, status, plannedBy,
      currentUser.id, currentUser.id, metaJson
    ]);
    return { success: true, id: entryId };
  } catch (error) {
    throw error;
  }
}

/**
 * Update time entry
 * @param {string} entryId - Time entry ID
 * @param {Object} entryData - Time entry data to update
 * @param {Object} currentUser - Current user
 * @returns {Promise<Object>} { success: true }
 */
export async function update(entryId, entryData, currentUser) {
  const updates = [];
  const params = [];
  
  if (entryData.entry_date !== undefined) {
    updates.push('entry_date = ?');
    params.push(entryData.entry_date);
  }
  if (entryData.time_from !== undefined) {
    updates.push('time_from = ?');
    params.push(entryData.time_from);
  }
  if (entryData.time_to !== undefined) {
    updates.push('time_to = ?');
    params.push(entryData.time_to);
  }
  if (entryData.category !== undefined) {
    updates.push('category = ?');
    params.push(entryData.category);
  }
  if (entryData.location_id !== undefined) {
    updates.push('location_id = ?');
    params.push(entryData.location_id);
  }
  if (entryData.notes !== undefined) {
    updates.push('notes = ?');
    params.push(entryData.notes);
  }
  if (entryData.meta !== undefined) {
    updates.push('meta = ?');
    params.push(typeof entryData.meta === 'string' ? entryData.meta : JSON.stringify(entryData.meta));
  }
  
  // Recalculate hours if time changed
  if (entryData.time_from !== undefined || entryData.time_to !== undefined) {
    const existing = await getById(entryId);
    if (existing) {
      const newTimeFrom = entryData.time_from || existing.time_from;
      const newTimeTo = entryData.time_to || existing.time_to;
      const newHours = calculateHours(newTimeFrom, newTimeTo);
      updates.push('hours = ?');
      params.push(newHours);
    }
  }
  
  // Only admin can change status manually
  const isAdmin = currentUser?.role === 'Admin' || 
                  (currentUser?.permissions && 
                   (typeof currentUser.permissions === 'string' 
                     ? JSON.parse(currentUser.permissions) 
                     : currentUser.permissions).includes('manage_users'));
  if (entryData.status !== undefined && isAdmin) {
    updates.push('status = ?');
    params.push(entryData.status);
  }
  
  updates.push('updated_by = ?');
  params.push(currentUser.id);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(entryId);
  
  const sql = `UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`;
  
  try {
    dbExec(sql, params);
    return { success: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete time entry
 * @param {string} entryId - Time entry ID
 * @param {Object} currentUser - Current user (must be admin)
 * @returns {Promise<Object>} { success: true }
 */
export async function remove(entryId, currentUser) {
  // Only admin can delete
  const isAdmin = currentUser?.role === 'Admin' || 
                  (currentUser?.permissions && 
                   (typeof currentUser.permissions === 'string' 
                     ? JSON.parse(currentUser.permissions) 
                     : currentUser.permissions).includes('manage_users'));
  
  if (!isAdmin) {
    throw new Error('Permission denied: Only admin can delete entries');
  }
  
  const sql = 'DELETE FROM time_entries WHERE id = ?';
  dbExec(sql, [entryId]);
  return { success: true };
}

/**
 * Calculate hours from time_from/time_to (handles midnight crossover)
 * @param {string} timeFrom - HH:MM format
 * @param {string} timeTo - HH:MM format
 * @returns {number} Hours (decimal)
 */
function calculateHours(timeFrom, timeTo) {
  const [fromHour, fromMin] = timeFrom.split(':').map(Number);
  const [toHour, toMin] = timeTo.split(':').map(Number);
  
  const fromMinutes = fromHour * 60 + fromMin;
  let toMinutes = toHour * 60 + toMin;
  
  if (toMinutes <= fromMinutes) {
    toMinutes += 24 * 60; // Next day
  }
  
  return Math.round(((toMinutes - fromMinutes) / 60) * 100) / 100;
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.timeEntryRepository = { getByFilters, getById, create, update, remove };
}
