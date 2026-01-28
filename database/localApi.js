/**
 * Local API Wrapper (ESM Module)
 * Ersetzt die Backend API Calls (api.*) durch lokale Service/Repository Aufrufe
 * Behält die gleiche API-Schnittstelle bei, damit app.js nicht geändert werden muss
 */

import { initDatabase } from './db.js';
import * as authService from './services/authService.js';
import * as timeEntryRepository from './repositories/timeEntryRepository.js';
import * as timeEntryService from './services/timeEntryService.js';
import * as userRepository from './repositories/userRepository.js';
import * as locationRepository from './repositories/locationRepository.js';
import * as adminService from './services/adminService.js';

// Wait for database to be initialized
let dbInitialized = false;

/**
 * Initialize local API (must be called after database is ready)
 */
export async function initLocalApi() {
  try {
    // Initialize database
    await initDatabase();
    dbInitialized = true;
    console.log('Local API initialized');
  } catch (error) {
    console.error('Failed to initialize local API:', error);
    throw error;
  }
}

/**
 * Local API object (replaces window.api or const api = {...})
 * Maintains same interface as backend API
 */
const localApi = {
  // =====================================================
  // AUTH ENDPOINTS
  // =====================================================
  
  async login(username, password) {
    if (!dbInitialized) await initLocalApi();
    return await authService.login(username, password);
  },
  
  async getCurrentUser() {
    if (!dbInitialized) await initLocalApi();
    return await authService.getCurrentUser();
  },
  
  async post(endpoint, body) {
    if (endpoint === 'auth' && body.action === 'logout') {
      if (!dbInitialized) await initLocalApi();
      return await authService.logout();
    }
    // Fallback for other POST endpoints
    throw new Error(`POST ${endpoint} not yet implemented in local API`);
  },
  
  // =====================================================
  // TIME ENTRIES ENDPOINTS
  // =====================================================
  
  async getTimeEntries(params = {}) {
    if (!dbInitialized) await initLocalApi();
    
    // Get current user for AuthZ
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated', data: [] };
    }
    const currentUser = currentUserResponse.user;
    
    // Build filters
    const filters = {};
    if (params.date_from) filters.dateFrom = params.date_from;
    if (params.date_to) filters.dateTo = params.date_to;
    if (params.user_id) filters.userId = params.user_id;
    if (params.worker_id) filters.workerId = params.worker_id;
    if (params.status) filters.status = params.status;
    
    try {
      const entries = await timeEntryRepository.getByFilters(filters, currentUser);
      return { success: true, data: entries };
    } catch (error) {
      console.error('Get time entries error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async createTimeEntry(entryData) {
    if (!dbInitialized) await initLocalApi();
    
    // Get current user
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    const currentUser = currentUserResponse.user;
    
    try {
      // Check for overlaps
      const hasOverlap = await timeEntryService.checkOverlap(
        entryData.entry_date || entryData.date,
        entryData.time_from || entryData.timeFrom,
        entryData.time_to || entryData.timeTo,
        entryData.worker_id || entryData.workerId,
        entryData.user_id || entryData.userId || currentUser.id
      );
      
      if (hasOverlap) {
        return {
          ok: false,
          success: false,
          error: 'OVERLAP',
          message: 'Zeit überschneidet sich für diesen Mitarbeiter'
        };
      }
      
      // Normalize entry data
      const normalizedData = {
        id: entryData.id,
        entry_date: entryData.entry_date || entryData.date,
        time_from: entryData.time_from || entryData.timeFrom,
        time_to: entryData.time_to || entryData.timeTo,
        category: entryData.category || 'BUERO_ALLGEMEIN',
        location_id: entryData.location_id || entryData.locationId || null,
        worker_id: entryData.worker_id || entryData.workerId || null,
        user_id: entryData.user_id || entryData.userId || null,
        status: entryData.status || 'PLANNED',
        notes: entryData.notes || '',
        entry_type: entryData.entry_type || entryData.entryType || 'BUERO_ALLGEMEIN',
        meta: entryData.meta || null
      };
      
      const result = await timeEntryRepository.create(normalizedData, currentUser);
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Create time entry error:', error);
      if (error.message.includes('OVERLAP') || error.message.includes('overlap')) {
        return {
          ok: false,
          success: false,
          error: 'OVERLAP',
          message: 'Zeit überschneidet sich für diesen Mitarbeiter'
        };
      }
      return { success: false, error: error.message };
    }
  },
  
  async updateTimeEntry(entryId, entryData) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    const currentUser = currentUserResponse.user;
    
    try {
      const normalizedData = {};
      if (entryData.entry_date || entryData.date) normalizedData.entry_date = entryData.entry_date || entryData.date;
      if (entryData.time_from || entryData.timeFrom) normalizedData.time_from = entryData.time_from || entryData.timeFrom;
      if (entryData.time_to || entryData.timeTo) normalizedData.time_to = entryData.time_to || entryData.timeTo;
      if (entryData.category) normalizedData.category = entryData.category;
      if (entryData.location_id || entryData.locationId) normalizedData.location_id = entryData.location_id || entryData.locationId;
      if (entryData.notes !== undefined) normalizedData.notes = entryData.notes;
      if (entryData.status) normalizedData.status = entryData.status;
      if (entryData.meta !== undefined) normalizedData.meta = entryData.meta;
      
      await timeEntryRepository.update(entryId, normalizedData, currentUser);
      return { success: true };
    } catch (error) {
      console.error('Update time entry error:', error);
      return { success: false, error: error.message };
    }
  },
  
  async deleteTimeEntry(entryId) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    const currentUser = currentUserResponse.user;
    
    try {
      await timeEntryRepository.remove(entryId, currentUser);
      return { success: true };
    } catch (error) {
      console.error('Delete time entry error:', error);
      return { success: false, error: error.message };
    }
  },
  
  async confirmDay(date) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { ok: false, error: 'Not authenticated' };
    }
    const currentUser = currentUserResponse.user;
    
    try {
      return await timeEntryService.confirmDay(date, currentUser);
    } catch (error) {
      console.error('Confirm day error:', error);
      return { ok: false, error: error.message };
    }
  },
  
  // =====================================================
  // ADMIN ENDPOINTS
  // =====================================================
  
  async getAdminOverview(params = {}) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { ok: false, error: 'Not authenticated' };
    }
    const currentUser = currentUserResponse.user;
    
    // Check admin permission
    const isAdmin = currentUser.role === 'Admin' || 
                    (currentUser.permissions && currentUser.permissions.includes('manage_users'));
    if (!isAdmin) {
      return { ok: false, error: 'Permission denied: Admin only' };
    }
    
    const dateFrom = params.date_from || params.dateFrom;
    const dateTo = params.date_to || params.dateTo;
    
    if (!dateFrom || !dateTo) {
      // Default to current week
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const defaultDateFrom = monday.toISOString().split('T')[0];
      const defaultDateTo = sunday.toISOString().split('T')[0];
      
      return await adminService.getWeekOverview(defaultDateFrom, defaultDateTo);
    }
    
    return await adminService.getWeekOverview(dateFrom, dateTo);
  },
  
  async request(endpoint, options = {}) {
    if (endpoint === 'admin/cleanup_planned' && options.method === 'POST') {
      if (!dbInitialized) await initLocalApi();
      
      const currentUserResponse = await authService.getCurrentUser();
      if (!currentUserResponse.success) {
        return { ok: false, error: 'Not authenticated' };
      }
      const currentUser = currentUserResponse.user;
      
      const isAdmin = currentUser.role === 'Admin' || 
                      (currentUser.permissions && currentUser.permissions.includes('manage_users'));
      if (!isAdmin) {
        return { ok: false, error: 'Permission denied: Admin only' };
      }
      
      return await adminService.cleanupPlanned();
    }
    
    throw new Error(`Request ${endpoint} not yet implemented in local API`);
  },
  
  // =====================================================
  // PLACEHOLDER ENDPOINTS (for compatibility)
  // =====================================================
  
  async getUsers() {
    if (!dbInitialized) await initLocalApi();
    try {
      const users = await userRepository.getAll();
      // Parse permissions JSON and map worker_id to workerId
      const normalizedUsers = users.map(user => {
        const normalized = { ...user };
        if (normalized.permissions && typeof normalized.permissions === 'string') {
          try {
            normalized.permissions = JSON.parse(normalized.permissions);
          } catch (e) {
            normalized.permissions = [];
          }
        } else if (!normalized.permissions) {
          normalized.permissions = [];
        }
        normalized.workerId = normalized.worker_id;
        normalized.firstLogin = normalized.first_login === 1;
        return normalized;
      });
      return { success: true, data: normalizedUsers };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async createUser(userData) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check admin permission
    const currentUser = currentUserResponse.user;
    const isAdmin = currentUser.role === 'Admin' || 
                    (currentUser.permissions && currentUser.permissions.includes('manage_users'));
    if (!isAdmin) {
      return { success: false, error: 'Permission denied: Admin only' };
    }
    
    try {
      // Hash password (simple hash for now - in production use bcrypt)
      const hashedPassword = userData.password; // TODO: Hash password properly
      
      const normalizedData = {
        id: userData.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: userData.username,
        name: userData.name || '',
        email: userData.email,
        password: hashedPassword,
        role: userData.role || 'Worker',
        permissions: typeof userData.permissions === 'string' 
          ? userData.permissions 
          : JSON.stringify(userData.permissions || ['Lesen', 'view_own']),
        worker_id: userData.worker_id || userData.workerId || null,
        first_login: userData.first_login !== undefined ? (userData.first_login ? 1 : 0) : 1,
        weekly_hours_target: userData.weekly_hours_target || 42.50
      };
      
      const result = await userRepository.create(normalizedData);
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async updateUser(userId, userData) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    
    try {
      const normalizedData = { ...userData };
      if (normalizedData.permissions && Array.isArray(normalizedData.permissions)) {
        normalizedData.permissions = JSON.stringify(normalizedData.permissions);
      }
      if (normalizedData.password) {
        // Hash password (simple hash for now)
        // TODO: Hash password properly with bcrypt
      }
      if (normalizedData.workerId) {
        normalizedData.worker_id = normalizedData.workerId;
      }
      if (normalizedData.firstLogin !== undefined) {
        normalizedData.first_login = normalizedData.firstLogin ? 1 : 0;
      }
      
      await userRepository.update(userId, normalizedData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async deleteUser(userId) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check admin permission
    const currentUser = currentUserResponse.user;
    const isAdmin = currentUser.role === 'Admin' || 
                    (currentUser.permissions && currentUser.permissions.includes('manage_users'));
    if (!isAdmin) {
      return { success: false, error: 'Permission denied: Admin only' };
    }
    
    try {
      await userRepository.remove(userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async getWorkers() {
    return { success: true, data: [] }; // TODO: Implement workerRepository
  },
  
  async getTeams() {
    return { success: true, data: [] }; // TODO: Implement teamRepository
  },
  
  async getLocations() {
    if (!dbInitialized) await initLocalApi();
    try {
      const locations = await locationRepository.getAll();
      return { success: true, data: locations };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  
  async createLocation(locationData) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check write permission
    const currentUser = currentUserResponse.user;
    const hasWritePermission = currentUser.role === 'Admin' || 
                               (currentUser.permissions && currentUser.permissions.includes('Schreiben'));
    if (!hasWritePermission) {
      return { success: false, error: 'Permission denied' };
    }
    
    try {
      if (!locationData.code || !locationData.address) {
        return { success: false, error: 'Code and address required' };
      }
      
      const result = await locationRepository.create(locationData);
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async updateLocation(locationId, locationData) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check write permission
    const currentUser = currentUserResponse.user;
    const hasWritePermission = currentUser.role === 'Admin' || 
                               (currentUser.permissions && currentUser.permissions.includes('Schreiben'));
    if (!hasWritePermission) {
      return { success: false, error: 'Permission denied' };
    }
    
    try {
      await locationRepository.update(locationId, locationData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async deleteLocation(locationId) {
    if (!dbInitialized) await initLocalApi();
    
    const currentUserResponse = await authService.getCurrentUser();
    if (!currentUserResponse.success) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Check write permission
    const currentUser = currentUserResponse.user;
    const hasWritePermission = currentUser.role === 'Admin' || 
                               (currentUser.permissions && currentUser.permissions.includes('Schreiben'));
    if (!hasWritePermission) {
      return { success: false, error: 'Permission denied' };
    }
    
    try {
      await locationRepository.remove(locationId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async getAssignments() {
    return { success: true, data: [] }; // TODO: Implement assignmentRepository
  },
  
  // Planning endpoints (stubs for now)
  async getWeekPlanning(workerId, week, year) {
    return { success: true, data: [] };
  },
  
  async saveWeekPlanning(data) {
    return { success: true };
  },
  
  async createPlanningEntry(entryData) {
    return { success: true, id: 'plan-' + Date.now() };
  },
  
  async updatePlanningEntry(entryId, entryData) {
    return { success: true };
  },
  
  async deletePlanningEntry(entryId) {
    return { success: true };
  }
};

// Export for ESM
export default localApi;

// Legacy compatibility: expose on window for non-ESM scripts
// DISABLED: LocalApi is incomplete (missing getVehicles, getDevices, etc.)
// Use remote API (endpoints.js) instead until localApi is fully migrated
if (false && typeof window !== 'undefined') {
  // Initialize and set window.api immediately
  (async () => {
    try {
      await initLocalApi();
      window.api = localApi;
      console.log('Local API ready and set on window.api');
    } catch (error) {
      console.error('Failed to initialize local API:', error);
      // Set anyway so app doesn't crash
      window.api = localApi;
    }
  })();
}

console.log('[LocalApi] Disabled - using remote API (endpoints.js) instead');
