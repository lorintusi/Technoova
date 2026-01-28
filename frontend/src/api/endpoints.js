/**
 * Domain API endpoints
 * Provides high-level API methods matching the original API interface
 */

import * as client from './client.js';

/**
 * Create API endpoints object
 * Uses window.api if available (from localApi.js), otherwise uses backend client
 */
function createApiEndpoints() {
  // If window.api exists (from localApi.js), use it
  if (window.api && typeof window.api === 'object') {
    return window.api;
  }
  
  // Otherwise create backend API client
  return {
    // Auth endpoints
    async login(username, password) {
      return client.post('auth', { action: 'login', username, password });
    },
    
    async getCurrentUser() {
      return client.get('me');
    },
    
    // Data endpoints
    async getUsers() {
      return client.get('users');
    },
    
    async createUser(userData) {
      return client.post('users', userData);
    },
    
    async updateUser(userId, userData) {
      return client.put(`users/${userId}`, userData);
    },
    
    async deleteUser(userId) {
      return client.del(`users/${userId}`);
    },
    
    async getWorkers() {
      return client.get('workers');
    },
    
    async createWorker(workerData) {
      return client.post('workers', workerData);
    },
    
    async updateWorker(workerId, workerData) {
      return client.put(`workers/${workerId}`, workerData);
    },
    
    async deleteWorker(workerId) {
      return client.del(`workers/${workerId}`);
    },
    
    async getTeams() {
      return client.get('teams');
    },
    
    async createTeam(teamData) {
      return client.post('teams', teamData);
    },
    
    async updateTeam(teamId, teamData) {
      return client.put(`teams/${teamId}`, teamData);
    },
    
    async deleteTeam(teamId) {
      return client.del(`teams/${teamId}`);
    },
    
    async getLocations() {
      return client.get('locations');
    },
    
    async createLocation(locationData) {
      return client.post('locations', locationData);
    },
    
    async updateLocation(locationId, locationData) {
      return client.put(`locations/${locationId}`, locationData);
    },
    
    async deleteLocation(locationId) {
      return client.del(`locations/${locationId}`);
    },
    
    async getAssignments(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`assignments${queryString ? '?' + queryString : ''}`);
    },
    
    async createAssignment(assignmentData) {
      return client.post('assignments', assignmentData);
    },
    
    async updateAssignment(assignmentId, assignmentData) {
      return client.put(`assignments/${assignmentId}`, assignmentData);
    },
    
    async deleteAssignment(assignmentId) {
      return client.del(`assignments/${assignmentId}`);
    },
    
    // Week Planning endpoints
    async getWeekPlanning(workerId, week, year) {
      const params = new URLSearchParams({
        worker_id: workerId,
        week: week,
        year: year
      });
      return client.get(`week_planning?${params}`);
    },
    
    async saveWeekPlanning(weekData) {
      return client.post('week_planning', weekData);
    },
    
    // Planning Entry endpoints (for individual blocks)
    async getPlanningEntries(params = {}) {
      try {
        const queryString = new URLSearchParams(params).toString();
        return await client.get(`week_planning${queryString ? '?' + queryString : ''}`);
      } catch (error) {
        console.error('Error getting planning entries:', error);
        return { success: false, error: error.message || 'Fehler beim Laden der Planung' };
      }
    },
    
    async createPlanningEntry(entryData) {
      try {
        const response = await client.post('week_planning', entryData);
        // Check for 409 conflict
        if (response.status === 409 || (response.error && response.error.includes('Konflikt'))) {
          return { success: false, error: response.error || 'Planungskonflikt erkannt', status: 409 };
        }
        return response;
      } catch (error) {
        console.error('Error creating planning entry:', error);
        // Check if error message contains conflict
        if (error.message && error.message.includes('Konflikt')) {
          return { success: false, error: error.message, status: 409 };
        }
        return { success: false, error: error.message || 'Fehler beim Erstellen der Planung' };
      }
    },
    
    async updatePlanningEntry(entryId, entryData) {
      try {
        const response = await client.put(`week_planning/${entryId}`, entryData);
        // Check for 409 conflict
        if (response.status === 409 || (response.error && response.error.includes('Konflikt'))) {
          return { success: false, error: response.error || 'Planungskonflikt erkannt', status: 409 };
        }
        return response;
      } catch (error) {
        console.error('Error updating planning entry:', error);
        // Check if error message contains conflict
        if (error.message && error.message.includes('Konflikt')) {
          return { success: false, error: error.message, status: 409 };
        }
        return { success: false, error: error.message || 'Fehler beim Aktualisieren der Planung' };
      }
    },
    
    async deletePlanningEntry(entryId) {
      try {
        return await client.del(`week_planning/${entryId}`);
      } catch (error) {
        console.error('Error deleting planning entry:', error);
        return { success: false, error: error.message || 'Fehler beim Löschen der Planung' };
      }
    },
    
    // Time Entries endpoints
    async getTimeEntries(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`time_entries${queryString ? '?' + queryString : ''}`);
    },
    
    async createTimeEntry(entryData) {
      return client.post('time_entries', entryData);
    },
    
    async updateTimeEntry(entryId, entryData) {
      return client.put(`time_entries/${entryId}`, entryData);
    },
    
    async deleteTimeEntry(entryId) {
      return client.del(`time_entries/${entryId}`);
    },
    
    async confirmTimeEntry(entryId) {
      return this.updateTimeEntry(entryId, { status: 'CONFIRMED' });
    },
    
    async rejectTimeEntry(entryId) {
      return this.updateTimeEntry(entryId, { status: 'REJECTED' });
    },
    
    async confirmDay(date) {
      return client.post('time_entries/confirm_day', { date: date });
    },
    
    async confirmDispatchDay(date, workerId = null) {
      const data = { date };
      if (workerId) {
        data.worker_id = workerId;
      }
      return client.post('dispatch_items/confirm_day', data);
    },
    
    async getAdminOverview(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`admin/overview/week${queryString ? '?' + queryString : ''}`);
    },
    
    // Consolidated getTimeEntriesSummary - supports both date range and single date
    async getTimeEntriesSummary(workerId, dateOrDateFrom, dateTo = null, summaryType = null) {
      const params = new URLSearchParams({
        worker_id: workerId
      });
      
      // If dateTo is provided, it's a date range (dateOrDateFrom = dateFrom)
      if (dateTo) {
        params.append('summary', '1');
        params.append('date_from', dateOrDateFrom);
        params.append('date_to', dateTo);
      } else {
        // Single date mode (dateOrDateFrom = date)
        params.append('date', dateOrDateFrom);
        params.append('summary', summaryType || 'day_week');
      }
      
      return client.get(`time_entries?${params}`);
    },
    
    async getTimeEntriesMonth(workerId, year, month) {
      const params = new URLSearchParams({
        worker_id: workerId,
        year: year,
        month: month,
        summary: 'day'
      });
      return client.get(`time_entries?${params}`);
    },
    
    // Medical Certificates endpoints
    async getMedicalCertificates(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`medical_certificates${queryString ? '?' + queryString : ''}`);
    },
    
    // Vehicles endpoints
    async getVehicles(filters = {}) {
      const queryString = new URLSearchParams(filters).toString();
      return client.get(`vehicles${queryString ? '?' + queryString : ''}`);
    },
    
    async createVehicle(data) {
      return client.post('vehicles', data);
    },
    
    async updateVehicle(id, data) {
      return client.put(`vehicles/${id}`, data);
    },
    
    async deleteVehicle(id) {
      return client.del(`vehicles/${id}`);
    },
    
    // Devices endpoints
    async getDevices(filters = {}) {
      const queryString = new URLSearchParams(filters).toString();
      return client.get(`devices${queryString ? '?' + queryString : ''}`);
    },
    
    async createDevice(data) {
      return client.post('devices', data);
    },
    
    async updateDevice(id, data) {
      return client.put(`devices/${id}`, data);
    },
    
    async deleteDevice(id) {
      return client.del(`devices/${id}`);
    },
    
    async uploadMedicalCertificate(data) {
      // data: { workerId, date, planningEntryId, file, note }
      const formData = new FormData();
      formData.append('worker_id', data.workerId);
      formData.append('date', data.date);
      if (data.planningEntryId) {
        formData.append('planning_entry_id', data.planningEntryId);
      }
      formData.append('file', data.file);
      if (data.note) {
        formData.append('note', data.note);
      }
      
      // Use fetch directly for multipart/form-data
      const API_BASE_URL = window.location.origin + '/backend/api';
      const url = `${API_BASE_URL}/medical_certificates`;
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include cookies for session
      });
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        return data;
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${response.status}`);
      }
    },
    
    getMedicalCertificateDownloadUrl(certificateId) {
      const API_BASE_URL = window.location.origin + '/backend/api';
      return `${API_BASE_URL}/medical_certificates/${certificateId}/download`;
    },
    
    async deleteMedicalCertificate(certificateId) {
      return client.del(`medical_certificates/${certificateId}`);
    },
    
    // Dispatch Items endpoints
    async getDispatchItems(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`dispatch_items${queryString ? '?' + queryString : ''}`);
    },
    
    async createDispatchItem(data) {
      return client.post('dispatch_items', data);
    },
    
    async updateDispatchItem(id, data) {
      return client.put(`dispatch_items/${id}`, data);
    },
    
    async deleteDispatchItem(id) {
      return client.del(`dispatch_items/${id}`);
    },
    
    // Dispatch Assignments endpoints (Planungen pro Tag)
    async getDispatchAssignments(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`dispatch_assignments${queryString ? '?' + queryString : ''}`);
    },
    
    async createDispatchAssignment(data) {
      return client.post('dispatch_assignments', data);
    },
    
    async createDispatchAssignmentsBulk(data) {
      return client.post('dispatch_assignments/bulk', data);
    },
    
    async updateDispatchAssignment(id, data) {
      return client.put(`dispatch_assignments/${id}`, data);
    },
    
    async deleteDispatchAssignment(id) {
      return client.del(`dispatch_assignments/${id}`);
    },
    
    // Todos endpoints
    async getTodos(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      return client.get(`todos${queryString ? '?' + queryString : ''}`);
    },
    
    async createTodo(data) {
      return client.post('todos', data);
    },
    
    async updateTodo(id, data) {
      return client.put(`todos/${id}`, data);
    },
    
    async deleteTodo(id) {
      return client.del(`todos/${id}`);
    },
  };
}

// Export singleton instance
export const api = createApiEndpoints();

