/**
 * Location Management Handlers
 * Handles location creation/editing with resourcesRequired
 */

import { on } from './events.js';
import { api } from '../api/endpoints.js';
import { getState, setLocations } from '../state/index.js';
import { renderApp } from '../views/renderApp.js';

/**
 * Collect resources from form checkboxes
 * Robust: trim, dedupe, remove empty
 */
function collectResourcesFromForm(form) {
  const resources = new Set();
  
  // Collect from equipment checkboxes
  const equipmentCheckboxes = form.querySelectorAll('.equipment-checklist input[type="checkbox"]:checked');
  equipmentCheckboxes.forEach(checkbox => {
    const value = checkbox.value?.trim();
    if (!value) return;
    
    // Map to resource names (remove "benötigt" suffix)
    const resourceName = value.replace(' benötigt', '').trim();
    if (resourceName) {
      resources.add(resourceName);
    }
  });
  
  // Also check general checklist items that indicate resources
  if (form.querySelector('#chk-access')?.checked) {
    resources.add('LKW');
  }
  
  // Convert to array, filter empty, sort
  return Array.from(resources).filter(r => r.length > 0).sort();
}

/**
 * Bind location form handlers
 */
export function bindLocationHandlers() {
  // Save location form (add)
  on('submit', '#form-add-location', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const siteNumber = form.querySelector('#siteNumber')?.value.trim();
    const siteTitle = form.querySelector('#siteTitle')?.value.trim();
    const code = `${siteNumber} ${siteTitle}`;
    const address = form.querySelector('#address')?.value.trim();
    const description = form.querySelector('#desc')?.value.trim() || '';
    const leadName = form.querySelector('#leadName')?.value.trim();
    const leadPhone = form.querySelector('#leadPhone')?.value.trim();
    
    if (!code || !address || !leadName || !leadPhone) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    // Collect resources
    const resourcesRequired = collectResourcesFromForm(form);
    
    // Get plan file if uploaded
    const planFileInput = form.querySelector('#planUpload');
    let planFile = null;
    let planFileName = null;
    
    if (planFileInput?.files?.[0]) {
      const file = planFileInput.files[0];
      planFileName = file.name;
      // Read as base64 (would need FileReader, but for now just store filename)
      planFile = null; // Will be handled by existing code
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Speichere...';
    }
    
    try {
      const locationData = {
        code,
        address,
        description: description || undefined,
        team_leader_name: leadName,
        team_leader_phone: leadPhone,
        resourcesRequired: resourcesRequired, // NEW: Resources array
        planFile: planFile,
        planFileName: planFileName
      };
      
      const response = await api.createLocation(locationData);
      
      if (response.success) {
        // Reload locations
        const locationsResponse = await api.getLocations();
        if (locationsResponse.success) {
          setLocations(locationsResponse.data || []);
        }
        
        // Close modal
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot) modalRoot.innerHTML = '';
        
        renderApp();
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error creating location:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern'}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Save location form (edit) - similar logic
  on('submit', '#form-edit-location', async (e) => {
    e.preventDefault();
    const form = e.target;
    const locationId = form.getAttribute('data-location-id');
    
    if (!locationId) {
      alert('Fehler: Location-ID fehlt');
      return;
    }
    
    const siteNumber = form.querySelector('#edit-siteNumber')?.value.trim();
    const siteTitle = form.querySelector('#edit-siteTitle')?.value.trim();
    const code = `${siteNumber} ${siteTitle}`;
    const address = form.querySelector('#edit-address')?.value.trim();
    const description = form.querySelector('#edit-desc')?.value.trim() || '';
    const leadName = form.querySelector('#edit-leadName')?.value.trim();
    const leadPhone = form.querySelector('#edit-leadPhone')?.value.trim();
    
    if (!code || !address || !leadName || !leadPhone) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    // Collect resources
    const resourcesRequired = collectResourcesFromForm(form);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Speichere...';
    }
    
    try {
      const locationData = {
        code,
        address,
        description: description || undefined,
        team_leader_name: leadName,
        team_leader_phone: leadPhone,
        resourcesRequired: resourcesRequired // NEW: Resources array
      };
      
      const response = await api.updateLocation(locationId, locationData);
      
      if (response.success) {
        // Reload locations
        const locationsResponse = await api.getLocations();
        if (locationsResponse.success) {
          setLocations(locationsResponse.data || []);
        }
        
        // Close modal
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot) modalRoot.innerHTML = '';
        
        renderApp();
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert(`Fehler: ${error.message || 'Fehler beim Speichern'}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close modal handlers
  on('click', '[data-close]', (e) => {
    if (e.target.hasAttribute('data-close')) {
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot) modalRoot.innerHTML = '';
    }
  });
  
  on('click', '#btn-close-loc, #btn-cancel-loc', (e) => {
    e.preventDefault();
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  });
}

