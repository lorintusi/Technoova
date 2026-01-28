/**
 * Todo Service
 * High-level service for todos/notes
 */

import { api } from '../api/endpoints.js';
import { 
  setTodos, 
  upsertTodo, 
  removeTodo
} from '../state/index.js';

/**
 * Normalize todo (snake_case → camelCase)
 */
function normalizeTodo(todo) {
  if (!todo) return null;
  
  const normalized = { ...todo };
  
  // Normalize fields
  if (normalized.scope_id !== undefined && normalized.scopeId === undefined) {
    normalized.scopeId = normalized.scope_id;
  }
  if (normalized.created_by_user_id && !normalized.createdByUserId) {
    normalized.createdByUserId = normalized.created_by_user_id;
  }
  if (normalized.created_at && !normalized.createdAt) {
    normalized.createdAt = normalized.created_at;
  }
  if (normalized.updated_at && !normalized.updatedAt) {
    normalized.updatedAt = normalized.updated_at;
  }
  
  return normalized;
}

/**
 * Load todos
 * @param {object} params - Query parameters (scope, scopeId, completed)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function loadTodos(params = {}) {
  try {
    const queryParams = {};
    
    if (params.scope) queryParams.scope = params.scope;
    if (params.scopeId !== undefined) queryParams.scope_id = params.scopeId;
    if (params.completed !== undefined) queryParams.completed = params.completed ? 1 : 0;
    
    const response = await api.getTodos(queryParams);
    
    if (response.success && response.data) {
      const normalized = response.data.map(normalizeTodo);
      setTodos(normalized);
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to load todos' };
  } catch (error) {
    console.error('Error loading todos:', error);
    return { success: false, error: error.message || 'Failed to load todos' };
  }
}

/**
 * Create todo
 * @param {object} data - Todo data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createTodo(data) {
  try {
    const response = await api.createTodo(data);
    
    if (response.success && response.data) {
      const normalized = normalizeTodo(response.data);
      upsertTodo(normalized);
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to create todo' };
  } catch (error) {
    console.error('Error creating todo:', error);
    return { success: false, error: error.message || 'Failed to create todo' };
  }
}

/**
 * Update todo
 * @param {string|number} id - Todo ID
 * @param {object} data - Updated todo data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateTodo(id, data) {
  try {
    const response = await api.updateTodo(id, data);
    
    if (response.success && response.data) {
      const normalized = normalizeTodo(response.data);
      upsertTodo(normalized);
      
      return { success: true, data: normalized };
    }
    
    return { success: false, error: response.error || 'Failed to update todo' };
  } catch (error) {
    console.error('Error updating todo:', error);
    return { success: false, error: error.message || 'Failed to update todo' };
  }
}

/**
 * Toggle todo completed status
 * @param {string|number} id - Todo ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function toggleTodo(id) {
  try {
    const { getTodo } = await import('../state/index.js');
    const todo = getTodo(id);
    
    if (!todo) {
      return { success: false, error: 'Todo not found' };
    }
    
    const newCompleted = !(todo.completed || todo.completed === 1);
    return await updateTodo(id, { completed: newCompleted });
  } catch (error) {
    console.error('Error toggling todo:', error);
    return { success: false, error: error.message || 'Failed to toggle todo' };
  }
}

/**
 * Delete todo
 * @param {string|number} id - Todo ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteTodo(id) {
  try {
    const response = await api.deleteTodo(id);
    
    if (response.success) {
      removeTodo(id);
      return { success: true };
    }
    
    return { success: false, error: response.error || 'Failed to delete todo' };
  } catch (error) {
    console.error('Error deleting todo:', error);
    return { success: false, error: error.message || 'Failed to delete todo' };
  }
}


