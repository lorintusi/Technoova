/**
 * Location Repository (ESM Module)
 * Ersetzt GET/POST/PUT/DELETE /api/locations
 */

import { dbQuery, dbExec } from '../db.js';

/**
 * Get all locations
 * @returns {Promise<Array>} Array of location objects
 */
export async function getAll() {
  const sql = 'SELECT * FROM locations ORDER BY code';
  const locations = dbQuery(sql);
  
  // Parse JSON fields and add crew (empty for now, assignments not yet implemented)
  return locations.map(loc => {
    const result = { ...loc };
    // Parse tags JSON
    if (result.tags && typeof result.tags === 'string') {
      try {
        result.tags = JSON.parse(result.tags);
      } catch (e) {
        result.tags = [];
      }
    } else if (!result.tags) {
      result.tags = [];
    }
    
    // Parse resourcesRequired JSON
    if (result.resources_required && typeof result.resources_required === 'string') {
      try {
        result.resourcesRequired = JSON.parse(result.resources_required);
      } catch (e) {
        result.resourcesRequired = [];
      }
    } else if (result.resources_required) {
      result.resourcesRequired = result.resources_required;
    } else {
      result.resourcesRequired = [];
    }
    
    // Map schedule fields
    result.schedule = {
      status: result.schedule_status || 'Geplant',
      start: result.schedule_start || null,
      end: result.schedule_end || null,
      deadline: result.schedule_deadline || null,
      progress: result.schedule_progress || 0
    };
    
    // Map plan file
    result.planFile = result.plan_file || null;
    result.planFileName = result.plan_file_name || null;
    
    // Add crew (empty array for now - assignments not yet implemented)
    result.crew = [];
    
    return result;
  });
}

/**
 * Get location by ID
 * @param {string} locationId - Location ID
 * @returns {Promise<Object|null>} Location object or null
 */
export async function getById(locationId) {
  const sql = 'SELECT * FROM locations WHERE id = ?';
  const results = dbQuery(sql, [locationId]);
  if (results.length === 0) return null;
  
  const loc = results[0];
  // Parse JSON fields
  if (loc.tags && typeof loc.tags === 'string') {
    try {
      loc.tags = JSON.parse(loc.tags);
    } catch (e) {
      loc.tags = [];
    }
  } else if (!loc.tags) {
    loc.tags = [];
  }
  
  // Parse resourcesRequired JSON
  if (loc.resources_required && typeof loc.resources_required === 'string') {
    try {
      loc.resourcesRequired = JSON.parse(loc.resources_required);
    } catch (e) {
      loc.resourcesRequired = [];
    }
  } else if (loc.resources_required) {
    loc.resourcesRequired = loc.resources_required;
  } else {
    loc.resourcesRequired = [];
  }
  
  loc.schedule = {
    status: loc.schedule_status || 'Geplant',
    start: loc.schedule_start || null,
    end: loc.schedule_end || null,
    deadline: loc.schedule_deadline || null,
    progress: loc.schedule_progress || 0
  };
  
  loc.planFile = loc.plan_file || null;
  loc.planFileName = loc.plan_file_name || null;
  
  // Add crew (empty array for now - assignments not yet implemented)
  loc.crew = [];
  
  return loc;
}

/**
 * Create location
 * @param {Object} locationData - Location data
 * @returns {Promise<Object>} { success: true, id: locationId }
 */
export async function create(locationData) {
  const {
    id, code, address, description = null, tags = [],
    resourcesRequired = [], schedule = {}, planFile = null, planFileName = null
  } = locationData;
  
  const locationId = id || `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const sql = `
    INSERT INTO locations (
      id, code, address, description, tags, resources_required, schedule_status,
      schedule_start, schedule_end, schedule_deadline, schedule_progress,
      plan_file, plan_file_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  try {
    dbExec(sql, [
      locationId,
      code,
      address,
      description,
      JSON.stringify(tags),
      JSON.stringify(resourcesRequired),
      schedule.status || 'Geplant',
      schedule.start || null,
      schedule.end || null,
      schedule.deadline || null,
      schedule.progress || 0,
      planFile,
      planFileName
    ]);
    return { success: true, id: locationId };
  } catch (error) {
    throw error;
  }
}

/**
 * Update location
 * @param {string} locationId - Location ID
 * @param {Object} locationData - Location data to update
 * @returns {Promise<Object>} { success: true }
 */
export async function update(locationId, locationData) {
  const updates = [];
  const params = [];
  
  if (locationData.code !== undefined) {
    updates.push('code = ?');
    params.push(locationData.code);
  }
  if (locationData.address !== undefined) {
    updates.push('address = ?');
    params.push(locationData.address);
  }
  if (locationData.description !== undefined) {
    updates.push('description = ?');
    params.push(locationData.description);
  }
  if (locationData.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(locationData.tags));
  }
  if (locationData.resourcesRequired !== undefined) {
    updates.push('resources_required = ?');
    params.push(JSON.stringify(locationData.resourcesRequired));
  }
  if (locationData.schedule !== undefined) {
    const schedule = locationData.schedule;
    if (schedule.status !== undefined) {
      updates.push('schedule_status = ?');
      params.push(schedule.status);
    }
    if (schedule.start !== undefined) {
      updates.push('schedule_start = ?');
      params.push(schedule.start);
    }
    if (schedule.end !== undefined) {
      updates.push('schedule_end = ?');
      params.push(schedule.end);
    }
    if (schedule.deadline !== undefined) {
      updates.push('schedule_deadline = ?');
      params.push(schedule.deadline);
    }
    if (schedule.progress !== undefined) {
      updates.push('schedule_progress = ?');
      params.push(schedule.progress);
    }
  }
  if (locationData.planFile !== undefined) {
    updates.push('plan_file = ?');
    params.push(locationData.planFile);
  }
  if (locationData.planFileName !== undefined) {
    updates.push('plan_file_name = ?');
    params.push(locationData.planFileName);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(locationId);
  
  const sql = `UPDATE locations SET ${updates.join(', ')} WHERE id = ?`;
  
  try {
    dbExec(sql, params);
    return { success: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete location
 * @param {string} locationId - Location ID
 * @returns {Promise<Object>} { success: true }
 */
export async function remove(locationId) {
  const sql = 'DELETE FROM locations WHERE id = ?';
  dbExec(sql, [locationId]);
  return { success: true };
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.locationRepository = { getAll, getById, create, update, remove };
}
