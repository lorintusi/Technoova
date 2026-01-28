/**
 * User Repository (ESM Module)
 * Ersetzt GET/POST/PUT/DELETE /api/users
 */

import { dbQuery, dbExec } from '../db.js';

/**
 * Get all users
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAll() {
  const sql = 'SELECT * FROM users ORDER BY name';
  return dbQuery(sql);
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getById(userId) {
  const sql = 'SELECT * FROM users WHERE id = ?';
  const results = dbQuery(sql, [userId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User object or null
 */
export async function getByUsername(username) {
  const sql = 'SELECT * FROM users WHERE username = ?';
  const results = dbQuery(sql, [username]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Create user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} { success: true, id: userId }
 */
export async function create(userData) {
  const {
    id, username, name, email, password, role = 'Worker',
    permissions = '[]', worker_id = null, first_login = 1,
    weekly_hours_target = 42.50
  } = userData;
  
  const sql = `
    INSERT INTO users (
      id, username, name, email, password, role, permissions,
      worker_id, first_login, weekly_hours_target, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  
  try {
    dbExec(sql, [
      id, username, name, email, password, role, permissions,
      worker_id, first_login ? 1 : 0, weekly_hours_target
    ]);
    return { success: true, id };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} { success: true }
 */
export async function update(userId, userData) {
  const updates = [];
  const params = [];
  
  if (userData.name !== undefined) {
    updates.push('name = ?');
    params.push(userData.name);
  }
  if (userData.email !== undefined) {
    updates.push('email = ?');
    params.push(userData.email);
  }
  if (userData.password !== undefined) {
    updates.push('password = ?');
    params.push(userData.password);
  }
  if (userData.role !== undefined) {
    updates.push('role = ?');
    params.push(userData.role);
  }
  if (userData.permissions !== undefined) {
    updates.push('permissions = ?');
    params.push(typeof userData.permissions === 'string' 
      ? userData.permissions 
      : JSON.stringify(userData.permissions));
  }
  if (userData.worker_id !== undefined) {
    updates.push('worker_id = ?');
    params.push(userData.worker_id);
  }
  if (userData.first_login !== undefined) {
    updates.push('first_login = ?');
    params.push(userData.first_login ? 1 : 0);
  }
  if (userData.last_login !== undefined) {
    updates.push('last_login = ?');
    params.push(userData.last_login);
  }
  if (userData.weekly_hours_target !== undefined) {
    updates.push('weekly_hours_target = ?');
    params.push(userData.weekly_hours_target);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);
  
  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  
  try {
    dbExec(sql, params);
    return { success: true };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { success: true }
 */
export async function remove(userId) {
  const sql = 'DELETE FROM users WHERE id = ?';
  dbExec(sql, [userId]);
  return { success: true };
}

// Legacy compatibility: expose on window for non-ESM scripts
if (typeof window !== 'undefined') {
  window.userRepository = { getAll, getById, getByUsername, create, update, remove };
}
