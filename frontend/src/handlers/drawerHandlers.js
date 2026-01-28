/**
 * Drawer Handlers
 * Handles opening/closing drawers and form submissions
 */

import { on } from './events.js';
import { openDrawer, closeDrawer } from '../views/drawers/drawerHost.js';
import { renderAssignmentDrawer } from '../views/drawers/assignmentDrawer.js';
import { renderWorkerDrawer } from '../views/drawers/workerDrawer.js';
import { renderVehicleDrawer } from '../views/drawers/vehicleDrawer.js';
import { renderDeviceDrawer } from '../views/drawers/deviceDrawer.js';
import { renderLocationDrawer } from '../views/drawers/locationDrawerNew.js';
import { api } from '../api/endpoints.js';
import { getState, setState } from '../state/index.js';
import { showToast } from '../utils/ui.js';
import { renderApp } from '../views/renderApp.js';
import { searchAddresses, debounce } from '../utils/geocoding.js';

export function bindDrawerHandlers() {
  // Quick Admin Menu Toggle
  on('click', '#quick-admin-trigger', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('quick-admin-dropdown');
    if (menu) {
      const isVisible = menu.style.display !== 'none';
      menu.style.display = isVisible ? 'none' : 'block';
    }
  });
  
  // Close quick admin menu when clicking outside
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('quick-admin-dropdown');
    const trigger = document.getElementById('quick-admin-trigger');
    if (menu && trigger && !menu.contains(e.target) && !trigger.contains(e.target)) {
      menu.style.display = 'none';
    }
  });
  
  // Create Assignment
  on('click', '[data-action="create-assignment"]', (e) => {
    e.preventDefault();
    const menu = document.getElementById('quick-admin-dropdown');
    if (menu) menu.style.display = 'none';
    openDrawer('assignment', renderAssignmentDrawer(), {
      onMount: bindDrawerFormHandlers
    });
  });
  
  // Create Location
  on('click', '[data-action="create-location"]', (e) => {
    e.preventDefault();
    const menu = document.getElementById('quick-admin-dropdown');
    if (menu) menu.style.display = 'none';
    openDrawer('location', renderLocationDrawer(), {
      onMount: bindDrawerFormHandlers
    });
  });
  
  // Create Worker
  on('click', '[data-action="create-worker"]', (e) => {
    e.preventDefault();
    const menu = document.getElementById('quick-admin-dropdown');
    if (menu) menu.style.display = 'none';
    openDrawer('worker', renderWorkerDrawer(), {
      onMount: bindDrawerFormHandlers
    });
  });
  
  // Create Vehicle
  on('click', '[data-action="create-vehicle"]', (e) => {
    e.preventDefault();
    const menu = document.getElementById('quick-admin-dropdown');
    if (menu) menu.style.display = 'none';
    openDrawer('vehicle', renderVehicleDrawer(), {
      onMount: bindDrawerFormHandlers
    });
  });
  
  // Create Device
  on('click', '[data-action="create-device"]', (e) => {
    e.preventDefault();
    const menu = document.getElementById('quick-admin-dropdown');
    if (menu) menu.style.display = 'none';
    openDrawer('device', renderDeviceDrawer(), {
      onMount: bindDrawerFormHandlers
    });
  });
  
  // Edit Assignment
  on('click', '[data-action="edit-assignment"]', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target.closest('[data-action="edit-assignment"]');
    if (!btn) return;
    
    const assignmentId = parseInt(btn.getAttribute('data-assignment-id'));
    const state = getState();
    const assignment = (state.data.assignments || []).find(a => a.id === assignmentId);
    
    if (assignment) {
      openDrawer('assignment', renderAssignmentDrawer(assignment), {
        onMount: bindDrawerFormHandlers
      });
    }
  });
  
  // Close drawer
  on('click', '[data-action="close-drawer"]', (e) => {
    e.preventDefault();
    const drawer = e.target.closest('.drawer-container');
    if (drawer) {
      const drawerId = drawer.getAttribute('data-drawer-id') || drawer.id.replace('drawer-', '');
      closeDrawer(drawerId);
    }
  });
}

/**
 * Bind handlers inside drawer forms
 * Called after drawer is mounted
 */
function bindDrawerFormHandlers(container) {
  // Address Autocomplete
  const addressInput = container.querySelector('#address-input');
  const addressResults = container.querySelector('#address-results');
  
  if (addressInput && addressResults) {
    let selectedIndex = -1;
    let currentResults = [];
    
    const debouncedSearch = debounce(async (query) => {
      if (!query || query.length < 3) {
        addressResults.style.display = 'none';
        return;
      }
      
      addressResults.innerHTML = '<div class="address-autocomplete__loading">Suche...</div>';
      addressResults.style.display = 'block';
      
      const results = await searchAddresses(query);
      currentResults = results;
      selectedIndex = -1;
      
      if (results.length === 0) {
        addressResults.innerHTML = '<div class="address-autocomplete__empty">Keine Adressen gefunden</div>';
        return;
      }
      
      addressResults.innerHTML = results.map((result, idx) => `
        <div class="address-autocomplete__item" data-index="${idx}">
          <span class="address-autocomplete__name">${result.formatted}</span>
          <span class="address-autocomplete__details">${result.display_name}</span>
        </div>
      `).join('');
      
      // Click handler for results
      addressResults.querySelectorAll('.address-autocomplete__item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.getAttribute('data-index'));
          selectAddress(currentResults[idx]);
        });
      });
    }, 300);
    
    const selectAddress = (result) => {
      addressInput.value = result.formatted;
      const latInput = container.querySelector('#location-lat');
      const lonInput = container.querySelector('#location-lon');
      if (latInput) latInput.value = result.lat;
      if (lonInput) lonInput.value = result.lon;
      addressResults.style.display = 'none';
      selectedIndex = -1;
    };
    
    addressInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
    
    addressInput.addEventListener('keydown', (e) => {
      const items = addressResults.querySelectorAll('.address-autocomplete__item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelectedItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelectedItem(items);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectAddress(currentResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        addressResults.style.display = 'none';
        selectedIndex = -1;
      }
    });
    
    const updateSelectedItem = (items) => {
      items.forEach((item, idx) => {
        if (idx === selectedIndex) {
          item.classList.add('address-autocomplete__item--active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('address-autocomplete__item--active');
        }
      });
    };
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        addressResults.style.display = 'none';
      }
    });
  }
  
  // Toggle switches
  container.querySelectorAll('[data-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const checkbox = toggle.querySelector('input[type="checkbox"]');
      const fieldName = toggle.getAttribute('data-toggle');
      
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggle.classList.toggle('drawer__toggle-switch--active');
        
        // Special handling for all_day toggle
        if (fieldName === 'all_day') {
          const timeFields = container.querySelector('#time-fields');
          if (timeFields) {
            timeFields.style.display = checkbox.checked ? 'none' : 'block';
          }
        }
      }
    });
  });
  
  // Save Assignment
  const saveAssignmentBtn = container.querySelector('[data-action="save-assignment"]');
  if (saveAssignmentBtn) {
    saveAssignmentBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleSaveAssignment(container);
    });
  }
  
  // Save Worker
  const saveWorkerBtn = container.querySelector('[data-action="save-worker"]');
  if (saveWorkerBtn) {
    saveWorkerBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleSaveWorker(container);
    });
  }
  
  // Save Vehicle
  const saveVehicleBtn = container.querySelector('[data-action="save-vehicle"]');
  if (saveVehicleBtn) {
    saveVehicleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleSaveVehicle(container);
    });
  }
  
  // Save Device
  const saveDeviceBtn = container.querySelector('[data-action="save-device"]');
  if (saveDeviceBtn) {
    saveDeviceBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleSaveDevice(container);
    });
  }
  
  // Save Location
  const saveLocationBtn = container.querySelector('[data-action="save-location"]');
  if (saveLocationBtn) {
    saveLocationBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleSaveLocation(container);
    });
  }
}

/**
 * Handle save assignment
 */
async function handleSaveAssignment(container) {
  const form = container.querySelector('#assignment-form');
  if (!form) return;
  
  const formData = new FormData(form);
  const data = {
    location_id: parseInt(formData.get('location_id')),
    title: formData.get('title'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    all_day: formData.get('all_day') === 'on',
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    recurring: formData.get('recurring') === 'on',
    notes: formData.get('notes'),
    status: formData.get('status')
  };
  
  try {
    const result = await api.createAssignment(data);
    showToast('Einsatz erfolgreich erstellt', 'success');
    
    // Refresh assignments
    const assignments = await api.getAssignments();
    const state = getState();
    setState({ data: { ...state.data, assignments: Array.isArray(assignments) ? assignments : assignments?.data || [] } });
    
    closeDrawer('assignment');
    renderApp();
  } catch (error) {
    console.error('Error saving assignment:', error);
    showToast('Fehler beim Erstellen des Einsatzes', 'error');
  }
}

/**
 * Handle save worker
 */
async function handleSaveWorker(container) {
  const form = container.querySelector('#worker-form');
  if (!form) return;
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    role: formData.get('role'),
    company: formData.get('company'),
    status: formData.get('status'),
    contact_phone: formData.get('contact_phone'),
    contact_email: formData.get('contact_email'),
    is_admin: formData.get('is_admin') === 'on'
  };
  
  try {
    const result = await api.createWorker(data);
    showToast('Personal erfolgreich hinzugefügt', 'success');
    
    // Refresh workers
    const workers = await api.getWorkers();
    const state = getState();
    setState({ data: { ...state.data, workers: Array.isArray(workers) ? workers : workers?.data || [] } });
    
    closeDrawer('worker');
    renderApp();
  } catch (error) {
    console.error('Error saving worker:', error);
    showToast('Fehler beim Hinzufügen des Personals', 'error');
  }
}

/**
 * Handle save vehicle
 */
async function handleSaveVehicle(container) {
  const form = container.querySelector('#vehicle-form');
  if (!form) return;
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    license_plate: formData.get('license_plate'),
    type: formData.get('type'),
    status: formData.get('status')
  };
  
  try {
    const result = await api.createVehicle(data);
    showToast('Fahrzeug erfolgreich hinzugefügt', 'success');
    
    // Refresh vehicles
    const vehicles = await api.getVehicles();
    const state = getState();
    setState({ data: { ...state.data, vehicles: Array.isArray(vehicles) ? vehicles : vehicles?.data || [] } });
    
    closeDrawer('vehicle');
    renderApp();
  } catch (error) {
    console.error('Error saving vehicle:', error);
    showToast('Fehler beim Hinzufügen des Fahrzeugs', 'error');
  }
}

/**
 * Handle save device
 */
async function handleSaveDevice(container) {
  const form = container.querySelector('#device-form');
  if (!form) return;
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    type: formData.get('type'),
    serial_number: formData.get('serial_number'),
    status: formData.get('status')
  };
  
  try {
    const result = await api.createDevice(data);
    showToast('Gerät erfolgreich hinzugefügt', 'success');
    
    // Refresh devices
    const devices = await api.getDevices();
    const state = getState();
    setState({ data: { ...state.data, devices: Array.isArray(devices) ? devices : devices?.data || [] } });
    
    closeDrawer('device');
    renderApp();
  } catch (error) {
    console.error('Error saving device:', error);
    showToast('Fehler beim Hinzufügen des Geräts', 'error');
  }
}

/**
 * Handle save location
 */
async function handleSaveLocation(container) {
  const form = container.querySelector('#location-form');
  if (!form) return;
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    code: formData.get('code'),
    address: formData.get('address'),
    description: formData.get('description'),
    default_work_time: formData.get('default_work_time'),
    default_departure_time: formData.get('default_departure_time'),
    contact_name: formData.get('contact_name'),
    contact_phone: formData.get('contact_phone'),
    is_archived: formData.get('is_archived') === 'on',
    status: formData.get('status'),
    latitude: formData.get('latitude') || null,
    longitude: formData.get('longitude') || null
  };
  
  try {
    const result = await api.createLocation(data);
    showToast('Einsatzort erfolgreich erstellt', 'success');
    
    // Refresh locations
    const locations = await api.getLocations();
    const state = getState();
    setState({ data: { ...state.data, locations: Array.isArray(locations) ? locations : locations?.data || [] } });
    
    closeDrawer('location');
    renderApp();
  } catch (error) {
    console.error('Error saving location:', error);
    showToast('Fehler beim Erstellen des Einsatzorts', 'error');
  }
}

