/**
 * Workers Service
 * Business logic for workers (Mitarbeiter)
 */

import { api } from '../api/endpoints.js';
import { setWorkers, upsertWorker, removeWorker as removeWorkerAction } from '../state/actions.js';

/**
 * Load all workers
 * @returns {Promise<Array>} Workers array
 */
export async function loadWorkers() {
  try {
    const response = await api.getWorkers();
    const workers = response.data || response || [];
    setWorkers(workers);
    return workers;
  } catch (error) {
    console.error('[WorkersService] Load failed:', error);
    throw error;
  }
}

/**
 * Create worker
 * @param {object} workerData - Worker data
 * @returns {Promise<object>} Created worker
 */
export async function createWorker(workerData) {
  try {
    const response = await api.createWorker(workerData);
    const worker = response.data || response;
    upsertWorker(worker);
    return worker;
  } catch (error) {
    console.error('[WorkersService] Create failed:', error);
    throw error;
  }
}

/**
 * Update worker
 * @param {string} id - Worker ID
 * @param {object} workerData - Worker data
 * @returns {Promise<object>} Updated worker
 */
export async function updateWorker(id, workerData) {
  try {
    const response = await api.updateWorker(id, workerData);
    const worker = response.data || response;
    upsertWorker(worker);
    return worker;
  } catch (error) {
    console.error('[WorkersService] Update failed:', error);
    throw error;
  }
}

/**
 * Delete worker
 * @param {string} id - Worker ID
 * @returns {Promise<void>}
 */
export async function removeWorker(id) {
  try {
    await api.deleteWorker(id);
    removeWorkerAction(id);
  } catch (error) {
    console.error('[WorkersService] Delete failed:', error);
    throw error;
  }
}

