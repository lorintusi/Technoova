/**
 * Management Handlers
 * Handles user/worker management interactions
 */

import { on } from './events.js';
import { api } from '../api/endpoints.js';
import { getState, setState, setUsers, upsertUser, setLocations, upsertLocation, removeLocation, setVehicles, setDevices, upsertVehicle, removeVehicle, upsertDevice, removeDevice } from '../state/index.js';
import { renderApp } from '../views/renderApp.js';
import { openCreateUserModal, openEditUserModal, closeUserModal } from '../views/modals/userModal.js';
import { renderLocationModal } from '../views/management/locationManagementView.js';
import { openVehicleModal, closeVehicleModal } from '../views/modals/vehicleModal.js';
import { openDeviceModal, closeDeviceModal } from '../views/modals/deviceModal.js';
import { showToast, handleApiError, setButtonLoading, clearAllFieldErrors, showFieldErrors } from '../utils/ui.js';

/**
 * Bind management handlers
 */
export function bindManagementHandlers() {
  // Open create user modal
  on('click', '#btn-add-worker', (e) => {
    e.preventDefault();
    openCreateUserModal();
  });
  
  // Save user form (create)
  on('submit', '#form-user', async (e) => {
    e.preventDefault();
    const form = e.target;
    const userId = form.getAttribute('data-user-id');
    const isEdit = !!userId;
    
    const name = form.querySelector('#user-name')?.value.trim();
    const username = form.querySelector('#user-username')?.value.trim();
    const email = form.querySelector('#user-email')?.value.trim();
    const password = form.querySelector('#user-password')?.value;
    const role = form.querySelector('#user-role')?.value;
    const workerId = form.querySelector('#user-worker-id')?.value.trim() || null;
    
    // Collect permissions
    const permissionCheckboxes = form.querySelectorAll('input[name="permissions"]:checked');
    const permissions = Array.from(permissionCheckboxes).map(cb => cb.value);
    
    if (!name || !username || !email || !role) {
      showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    if (!isEdit && !password) {
      showToast('Passwort ist erforderlich', 'error');
      return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    }
    
    try {
      const userData = {
        name,
        username,
        email,
        role,
        permissions,
        worker_id: workerId
      };
      
      if (!isEdit) {
        userData.password = password;
      }
      
      let response;
      if (isEdit) {
        response = await api.updateUser(userId, userData);
      } else {
        response = await api.createUser(userData);
      }
      
      if (response.success) {
        // Use response data directly (single user) instead of reloading all users
        // This prevents race conditions and duplicate adds
        if (response.data) {
          upsertUser(response.data);
        } else {
          // Fallback: reload all users if response doesn't contain data
          const usersResponse = await api.getUsers();
          if (usersResponse.success) {
            setUsers(usersResponse.data || []);
          }
        }
        
        closeUserModal();
        renderApp();
        showToast(isEdit ? 'Benutzer aktualisiert' : 'Benutzer erstellt', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Speichern'}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close modal handlers (overlay click)
  on('click', '#user-modal.modal-overlay', (e) => {
    // Only close if clicking directly on overlay (not on modal content)
    if (e.target === e.currentTarget) {
      e.preventDefault();
      closeUserModal();
    }
  });
  
  // Close buttons (X button and Cancel button)
  on('click', '[data-close="user-modal"]', (e) => {
    e.preventDefault();
    closeUserModal();
  });
  
  // Edit user (click on row)
  on('click', '.user-table tbody tr', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    
    // Get user ID from row (we need to add data-user-id to rows)
    const userId = row.getAttribute('data-user-id');
    if (userId) {
      openEditUserModal(userId);
    }
  });
  
  // Tab switching
  on('click', '.management__tab', async (e) => {
    e.preventDefault();
    const tab = e.target.closest('.management__tab');
    if (!tab) return;
    
    const tabName = tab.getAttribute('data-tab');
    if (tabName) {
      // Load todos if switching to todos tab
      if (tabName === 'todos') {
        try {
          const { loadTodos } = await import('../services/todoService.js');
          await loadTodos();
        } catch (error) {
          console.error('Error loading todos:', error);
        }
      }
      
      setState({
        ui: {
          ...getState().ui,
          managementTab: tabName
        }
      });
      renderApp();
    }
  });
  
  // Location management handlers
  bindLocationManagementHandlers();
  
  // Vehicle management handlers
  bindVehicleManagementHandlers();
  
  // Device management handlers
  bindDeviceManagementHandlers();
}

/**
 * Bind location management handlers
 */
function bindLocationManagementHandlers() {
  // Open create location modal
  on('click', '#btn-add-location, #btn-add-location-empty', (e) => {
    e.preventDefault();
    openLocationModal();
  });
  
  // Open edit location modal
  on('click', '[data-action="edit-location"]', (e) => {
    e.preventDefault();
    const locationId = e.target.closest('[data-action="edit-location"]')?.getAttribute('data-location-id');
    if (locationId) {
      const state = getState();
      const location = state.data.locations.find(l => l.id === locationId);
      if (location) {
        openLocationModal(location);
      }
    }
  });
  
  // Delete location
  on('click', '[data-action="delete-location"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const locationId = e.target.closest('[data-action="delete-location"]')?.getAttribute('data-location-id');
    if (!locationId) return;
    
    const state = getState();
    const location = state.data.locations.find(l => l.id === locationId);
    if (!location) return;
    
    if (!confirm(`Möchten Sie die Baustelle "${location.code || location.address}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await api.deleteLocation(locationId);
      if (response.success) {
        // Remove location from state
        removeLocation(locationId);
        renderApp();
        showToast('Baustelle gelöscht', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Löschen'}`, 'error');
    }
  });
  
  // Save location form
  on('submit', '#form-location', async (e) => {
    e.preventDefault();
    const form = e.target;
    const locationId = form.getAttribute('data-location-id');
    const isEdit = !!locationId;
    
    const code = form.querySelector('#location-code')?.value.trim();
    const address = form.querySelector('#location-address')?.value.trim();
    const description = form.querySelector('#location-description')?.value.trim() || null;
    const resourcesStr = form.querySelector('#location-resources')?.value.trim() || '';
    
    if (!code || !address) {
      showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    // Parse resources (comma-separated)
    const resources = resourcesStr
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    }
    
    try {
      const locationData = {
        code,
        address,
        description,
        resourcesRequired: resources.length > 0 ? resources : null
      };
      
      let response;
      if (isEdit) {
        response = await api.updateLocation(locationId, locationData);
      } else {
        response = await api.createLocation(locationData);
      }
      
      if (response.success) {
        // Upsert location directly (no full reload)
        if (response.data) {
          upsertLocation(response.data);
        } else {
          // Fallback: reload all locations
          const locationsResponse = await api.getLocations();
          if (locationsResponse.success) {
            setLocations(locationsResponse.data || []);
          }
        }
        
        closeLocationModal();
        renderApp();
        showToast(isEdit ? 'Baustelle aktualisiert' : 'Baustelle erstellt', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Speichern'}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close location modal
  on('click', '[data-close="location-modal"]', (e) => {
    // Only close if clicking directly on overlay (not on modal content)
    if (e.target === e.currentTarget) {
      e.preventDefault();
      closeLocationModal();
    }
  });
  
  // Close buttons
  on('click', '#btn-close-location-modal, #btn-cancel-location-modal', (e) => {
    e.preventDefault();
    closeLocationModal();
  });
}

/**
 * Open location modal
 */
function openLocationModal(location = null) {
  const modalRoot = document.getElementById('modal-root') || document.body;
  modalRoot.insertAdjacentHTML('beforeend', renderLocationModal(location));
}

/**
 * Close location modal
 */
function closeLocationModal() {
  const modal = document.querySelector('[data-close="location-modal"]');
  if (modal) {
    modal.remove();
  }
}

/**
 * Bind vehicle management handlers
 */
function bindVehicleManagementHandlers() {
  // Open create vehicle modal
  on('click', '#btn-add-vehicle, #btn-add-vehicle-empty', (e) => {
    e.preventDefault();
    openVehicleModal();
  });
  
  // Open edit vehicle modal
  on('click', '[data-action="edit-vehicle"]', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const vehicleId = e.target.closest('[data-action="edit-vehicle"]')?.getAttribute('data-vehicle-id');
    if (vehicleId) {
      const state = getState();
      const vehicle = state.data.vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        openVehicleModal(vehicle);
      }
    }
  });
  
  // Delete vehicle
  on('click', '[data-action="delete-vehicle"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const vehicleId = e.target.closest('[data-action="delete-vehicle"]')?.getAttribute('data-vehicle-id');
    if (!vehicleId) return;
    
    const state = getState();
    const vehicle = state.data.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    if (!confirm(`Möchten Sie das Fahrzeug "${vehicle.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await api.deleteVehicle(vehicleId);
      if (response.success) {
        removeVehicle(vehicleId);
        renderApp();
        showToast('Fahrzeug gelöscht', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Löschen'}`, 'error');
    }
  });
  
  // Save vehicle form
  on('submit', '#form-vehicle', async (e) => {
    e.preventDefault();
    const form = e.target;
    const vehicleId = form.getAttribute('data-vehicle-id');
    const isEdit = !!vehicleId;
    
    const name = form.querySelector('#vehicle-name')?.value.trim();
    const type = form.querySelector('#vehicle-type')?.value;
    const licensePlate = form.querySelector('#vehicle-license-plate')?.value.trim();
    const status = form.querySelector('#vehicle-status')?.value || 'available';
    const notes = form.querySelector('#vehicle-notes')?.value.trim() || null;
    
    if (!name || !type) {
      showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    }
    
    try {
      const vehicleData = {
        name,
        type,
        license_plate: licensePlate,
        status,
        notes
      };
      
      let response;
      if (isEdit) {
        response = await api.updateVehicle(vehicleId, vehicleData);
      } else {
        response = await api.createVehicle(vehicleData);
      }
      
      if (response.success) {
        // Upsert vehicle directly (no full reload)
        if (response.data) {
          upsertVehicle(response.data);
        } else {
          // Fallback: reload all vehicles
          const vehiclesResponse = await api.getVehicles();
          if (vehiclesResponse.success) {
            setVehicles(vehiclesResponse.data || []);
          }
        }
        
        closeVehicleModal();
        renderApp();
        showToast(isEdit ? 'Fahrzeug aktualisiert' : 'Fahrzeug erstellt', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Speichern'}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close vehicle modal
  on('click', '[data-close="vehicle-modal"]', (e) => {
    // Only close if clicking directly on overlay (not on modal content)
    if (e.target === e.currentTarget) {
      e.preventDefault();
      closeVehicleModal();
    }
  });
  
  // Close buttons
  on('click', '#btn-close-vehicle-modal, #btn-cancel-vehicle-modal', (e) => {
    e.preventDefault();
    closeVehicleModal();
  });
}

/**
 * Bind device management handlers
 */
function bindDeviceManagementHandlers() {
  // Open create device modal
  on('click', '#btn-add-device, #btn-add-device-empty', (e) => {
    e.preventDefault();
    openDeviceModal();
  });
  
  // Open edit device modal
  on('click', '[data-action="edit-device"]', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const deviceId = e.target.closest('[data-action="edit-device"]')?.getAttribute('data-device-id');
    if (deviceId) {
      const state = getState();
      const device = state.data.devices.find(d => d.id === deviceId);
      if (device) {
        openDeviceModal(device);
      }
    }
  });
  
  // Delete device
  on('click', '[data-action="delete-device"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const deviceId = e.target.closest('[data-action="delete-device"]')?.getAttribute('data-device-id');
    if (!deviceId) return;
    
    const state = getState();
    const device = state.data.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    if (!confirm(`Möchten Sie das Gerät "${device.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      const response = await api.deleteDevice(deviceId);
      if (response.success) {
        removeDevice(deviceId);
        renderApp();
        showToast('Gerät gelöscht', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Löschen'}`, 'error');
    }
  });
  
  // Save device form
  on('submit', '#form-device', async (e) => {
    e.preventDefault();
    const form = e.target;
    const deviceId = form.getAttribute('data-device-id');
    const isEdit = !!deviceId;
    
    const name = form.querySelector('#device-name')?.value.trim();
    const type = form.querySelector('#device-type')?.value;
    const serialNumber = form.querySelector('#device-serial-number')?.value.trim() || null;
    const status = form.querySelector('#device-status')?.value || 'available';
    const notes = form.querySelector('#device-notes')?.value.trim() || null;
    
    if (!name || !type) {
      showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    }
    
    try {
      const deviceData = {
        name,
        type,
        serial_number: serialNumber,
        status,
        notes
      };
      
      let response;
      if (isEdit) {
        response = await api.updateDevice(deviceId, deviceData);
      } else {
        response = await api.createDevice(deviceData);
      }
      
      if (response.success) {
        // Upsert device directly (no full reload)
        if (response.data) {
          upsertDevice(response.data);
        } else {
          // Fallback: reload all devices
          const devicesResponse = await api.getDevices();
          if (devicesResponse.success) {
            setDevices(devicesResponse.data || []);
          }
        }
        
        closeDeviceModal();
        renderApp();
        showToast(isEdit ? 'Gerät aktualisiert' : 'Gerät erstellt', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Speichern'}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close device modal
  on('click', '[data-close="device-modal"]', (e) => {
    // Only close if clicking directly on overlay (not on modal content)
    if (e.target === e.currentTarget) {
      e.preventDefault();
      closeDeviceModal();
    }
  });
  
  // Close buttons
  on('click', '#btn-close-device-modal, #btn-cancel-device-modal', (e) => {
    e.preventDefault();
    closeDeviceModal();
  });
}


