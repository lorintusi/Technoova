/**
 * Permission utilities
 * Centralized permission checks for planning and management
 * 
 * RBAC: Only two roles - ADMIN and WORKER
 */

import { getState, getActiveUser, getActiveWorkerId, getActiveUserId } from '../state/index.js';

/**
 * Check if user is admin
 * @param {object} user - User object (optional, uses current user if not provided)
 * @returns {boolean} True if admin
 */
export function isAdmin(user = null) {
  const currentUser = user || getActiveUser();
  if (!currentUser) return false;
  return currentUser.role === 'Admin' || 
         (currentUser.permissions && (
           currentUser.permissions.includes('manage_users') ||
           currentUser.permissions.includes('view_all') ||
           currentUser.permissions.includes('Verwalten')
         ));
}

/**
 * Check if user is worker
 * @param {object} user - User object (optional, uses current user if not provided)
 * @returns {boolean} True if worker (not admin)
 */
export function isWorker(user = null) {
  const currentUser = user || getActiveUser();
  if (!currentUser) return false;
  return !isAdmin(currentUser);
}

/**
 * Legacy compatibility: Check if user is admin or manager
 * @deprecated Use isAdmin() instead
 * @param {object} user - User object
 * @returns {boolean} True if admin/manager
 */
export function isAdminOrManager(user) {
  return isAdmin(user);
}

/**
 * Check if user can view team calendar
 * @param {object} user - User object (optional, uses current user if not provided)
 * @returns {boolean} True if can view team calendar (Admin only)
 */
export function canViewTeamCalendar(user = null) {
  return isAdmin(user);
}

/**
 * Check if user can plan for a specific worker
 * @param {object} user - User object (optional)
 * @param {string|number} workerId - Worker ID to plan for
 * @returns {boolean} True if can plan for this worker
 */
export function canPlanFor(user = null, workerId) {
  const currentUser = user || getActiveUser();
  if (!currentUser) return false;
  
  // Admin can plan for anyone
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Worker can only plan for themselves
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  return workerId === activeWorkerId || workerId === activeUserId;
}

/**
 * Legacy compatibility: Check if user can plan for a specific worker
 * @deprecated Use canPlanFor() instead
 * @param {object} user - User object (optional)
 * @param {string|number} workerId - Worker ID to plan for
 * @returns {boolean} True if can plan for this worker
 */
export function canPlanForWorker(user = null, workerId) {
  return canPlanFor(user, workerId);
}

/**
 * Check if user can edit a planning entry
 * @param {object} user - User object (optional)
 * @param {object} entry - Planning entry
 * @returns {boolean} True if can edit
 */
export function canEditPlanningEntry(user = null, entry) {
  const currentUser = user || getActiveUser();
  if (!currentUser || !entry) return false;
  
  // Admin can edit any entry
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Worker can only edit their own entries
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  return entry.workerId === activeWorkerId || 
         entry.workerId === activeUserId ||
         entry.createdByUserId === activeUserId;
}

/**
 * Check if user can delete a planning entry
 * @param {object} user - User object (optional)
 * @param {object} entry - Planning entry
 * @returns {boolean} True if can delete
 */
export function canDeletePlanningEntry(user = null, entry) {
  const currentUser = user || getActiveUser();
  if (!currentUser || !entry) return false;
  
  // Cannot delete confirmed entries (only admin can, but we restrict for safety)
  if (entry.status === 'CONFIRMED' && !isAdmin(currentUser)) {
    return false;
  }
  
  // Admin can delete any entry
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Worker can only delete their own entries
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  return entry.workerId === activeWorkerId || 
         entry.workerId === activeUserId ||
         entry.createdByUserId === activeUserId;
}

/**
 * Get planning source for current user
 * @param {object} user - User object (optional)
 * @returns {string} "ADMIN_PLAN" | "SELF_PLAN"
 */
export function getPlanningSource(user = null) {
  return isAdmin(user) ? 'ADMIN_PLAN' : 'SELF_PLAN';
}

/**
 * Get created by role for current user
 * @param {object} user - User object (optional)
 * @returns {string} "ADMIN" | "WORKER"
 */
export function getCreatedByRole(user = null) {
  return isAdmin(user) ? 'ADMIN' : 'WORKER';
}

/**
 * Check if user can view medical certificates
 * @param {object} user - User object (optional)
 * @returns {boolean} True if can view
 */
export function canViewMedicalCertificates(user = null) {
  const currentUser = user || getActiveUser();
  if (!currentUser) return false;
  // Everyone can view (but filtered by worker_id)
  return true;
}

/**
 * Check if user can download a medical certificate
 * @param {object} user - User object (optional)
 * @param {object} certificate - Medical certificate
 * @returns {boolean} True if can download
 */
export function canDownloadMedicalCertificate(user = null, certificate) {
  const currentUser = user || getActiveUser();
  if (!currentUser || !certificate) return false;
  
  // Admin can download all
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Worker can only download their own
  const activeWorkerId = getActiveWorkerId();
  return certificate.workerId === activeWorkerId;
}

/**
 * Check if user can delete a medical certificate
 * @param {object} user - User object (optional)
 * @param {object} certificate - Medical certificate
 * @returns {boolean} True if can delete
 */
export function canDeleteMedicalCertificate(user = null, certificate) {
  const currentUser = user || getActiveUser();
  if (!currentUser || !certificate) return false;
  
  // Only admin can delete
  return isAdmin(currentUser);
}

/**
 * Check if user can manage users
 * @param {object} user - User object (optional)
 * @returns {boolean} True if can manage users (Admin only)
 */
export function canManageUsers(user = null) {
  return isAdmin(user);
}

/**
 * Check if user can manage locations
 * @param {object} user - User object (optional)
 * @returns {boolean} True if can manage locations (Admin only)
 */
export function canManageLocations(user = null) {
  return isAdmin(user);
}

/**
 * Check if user can upload medical certificate for a worker
 * @param {object} user - User object (optional)
 * @param {string|number} workerId - Worker ID
 * @returns {boolean} True if can upload
 */
export function canUploadMedicalCert(user = null, workerId) {
  const currentUser = user || getActiveUser();
  if (!currentUser) return false;
  
  // Admin can upload for anyone
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Worker can only upload for themselves
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  return workerId === activeWorkerId || workerId === activeUserId;
}

/**
 * Check if user can confirm a day for a worker
 * @param {object} user - User object (optional)
 * @param {string|number} workerId - Worker ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {boolean} True if can confirm
 */
export function canConfirmDay(user = null, workerId, date) {
  const currentUser = user || getActiveUser();
  if (!currentUser) return false;
  
  // Admin can confirm for anyone
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Worker can only confirm their own days
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  return workerId === activeWorkerId || workerId === activeUserId;
}


