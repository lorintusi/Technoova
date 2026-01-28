/**
 * Dispatch Handlers
 * Handles dispatch item edit/delete actions
 */

import { on } from './events.js';
import { getState, getDispatchItem } from '../state/index.js';
import { updateDispatchItem, deleteDispatchItem } from '../services/dispatchService.js';
import { renderDispatchItemModal } from '../views/modals/dispatchItemModal.js';
import { renderApp } from '../views/renderApp.js';
import { showToast } from '../utils/ui.js';
import { isAdmin } from '../utils/permissions.js';

/**
 * Bind dispatch handlers
 */
export function bindDispatchHandlers() {
  // Edit dispatch item
  on('click', '[data-action="edit-dispatch"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="edit-dispatch"]');
    const dispatchId = btn?.getAttribute('data-dispatch-item-id');
    
    if (!dispatchId) return;
    
    const state = getState();
    const item = getDispatchItem(dispatchId);
    
    if (!item) {
      showToast('Einsatz nicht gefunden', 'error');
      return;
    }
    
    // Open modal with item
    openDispatchItemModal(item);
  });
  
  // Delete dispatch item
  on('click', '[data-action="delete-dispatch-item"]', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="delete-dispatch-item"]');
    const dispatchId = btn?.getAttribute('data-dispatch-item-id');
    
    if (!dispatchId) return;
    
    const state = getState();
    const item = getDispatchItem(dispatchId);
    
    if (!item) {
      showToast('Einsatz nicht gefunden', 'error');
      return;
    }
    
    // Confirmation
    if (!confirm(`Möchten Sie den Einsatz wirklich löschen?\n\nOrt: ${item.locationId || 'Unbekannt'}\nDatum: ${item.date || 'Unbekannt'}`)) {
      return;
    }
    
    try {
      const result = await deleteDispatchItem(dispatchId);
      
      if (result.success) {
        showToast('Einsatz gelöscht', 'success');
        renderApp();
      } else {
        showToast(result.error || 'Fehler beim Löschen', 'error');
      }
    } catch (error) {
      console.error('Failed to delete dispatch item:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  });
  
  // Delete from modal
  on('click', '#btn-delete-dispatch', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('#btn-delete-dispatch');
    const dispatchId = btn?.getAttribute('data-dispatch-item-id');
    
    if (!dispatchId) return;
    
    const state = getState();
    const item = getDispatchItem(dispatchId);
    
    if (!item) {
      showToast('Einsatz nicht gefunden', 'error');
      return;
    }
    
    // Confirmation
    if (!confirm(`Möchten Sie den Einsatz wirklich löschen?\n\nOrt: ${item.locationId || 'Unbekannt'}\nDatum: ${item.date || 'Unbekannt'}`)) {
      return;
    }
    
    try {
      const result = await deleteDispatchItem(dispatchId);
      
      if (result.success) {
        showToast('Einsatz gelöscht', 'success');
        // Close modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
          modal.remove();
        }
        renderApp();
      } else {
        showToast(result.error || 'Fehler beim Löschen', 'error');
      }
    } catch (error) {
      console.error('Failed to delete dispatch item:', error);
      showToast('Fehler beim Löschen', 'error');
    }
  });
  
  // Dispatch modal form submit
  on('submit', '#form-dispatch-item', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const dispatchId = form.getAttribute('data-dispatch-item-id');
    const isEdit = !!dispatchId;
    
    // Get form values
    const locationId = formData.get('locationId');
    const category = formData.get('category');
    const date = formData.get('date');
    const allDay = formData.has('allDay');
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    const status = formData.get('status') || 'PLANNED';
    const note = formData.get('note') || '';
    
    // Validation
    if (!locationId) {
      showToast('Bitte wählen Sie einen Einsatzort', 'error');
      return;
    }
    
    if (!date) {
      showToast('Bitte wählen Sie ein Datum', 'error');
      return;
    }
    
    // Build data object
    const data = {
      locationId,
      category,
      date,
      allDay,
      status,
      note
    };
    
    if (!allDay && startTime && endTime) {
      data.startTime = startTime;
      data.endTime = endTime;
    }
    
    // Get selected resources
    const workersSelect = form.querySelector('#dispatch-workers');
    const vehiclesSelect = form.querySelector('#dispatch-vehicles');
    const devicesSelect = form.querySelector('#dispatch-devices');
    
    const selectedWorkers = Array.from(workersSelect?.selectedOptions || []).map(opt => opt.value);
    const selectedVehicles = Array.from(vehiclesSelect?.selectedOptions || []).map(opt => opt.value);
    const selectedDevices = Array.from(devicesSelect?.selectedOptions || []).map(opt => opt.value);
    
    // Submit button loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Speichere...';
    }
    
    try {
      let result;
      
      if (isEdit) {
        // Update existing
        result = await updateDispatchItem(dispatchId, data);
      } else {
        // Create new
        const { createDispatchItem } = await import('../services/dispatchService.js');
        result = await createDispatchItem(data);
        
        // If creation successful, update assignments
        if (result.success && result.data) {
          const { upsertDispatchAssignmentsBatch } = await import('../services/dispatchService.js');
          const assignments = [];
          
          selectedWorkers.forEach(workerId => {
            assignments.push({ resourceType: 'WORKER', resourceId: workerId });
          });
          selectedVehicles.forEach(vehicleId => {
            assignments.push({ resourceType: 'VEHICLE', resourceId: vehicleId });
          });
          selectedDevices.forEach(deviceId => {
            assignments.push({ resourceType: 'DEVICE', resourceId: deviceId });
          });
          
          if (assignments.length > 0) {
            await upsertDispatchAssignmentsBatch(result.data.id, assignments);
          }
        }
      }
      
      if (result.success) {
        showToast(isEdit ? 'Einsatz aktualisiert' : 'Einsatz erstellt', 'success');
        // Close modal
        const modal = form.closest('.modal-overlay');
        if (modal) {
          modal.remove();
        }
        renderApp();
      } else {
        showToast(result.error || 'Fehler beim Speichern', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    } catch (error) {
      console.error('Failed to save dispatch item:', error);
      showToast('Fehler beim Speichern', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // Close modal
  on('click', '#btn-close-dispatch-modal, #btn-cancel-dispatch', (e) => {
    e.preventDefault();
    const modal = e.target.closest('.modal-overlay');
    if (modal) {
      modal.remove();
    }
  });
  
  // Close modal on overlay click
  on('click', '.modal-overlay[data-close]', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.remove();
    }
  });
  
  // Toggle time fields based on allDay checkbox
  on('change', '#dispatch-all-day', (e) => {
    const timeRow = document.getElementById('dispatch-time-row');
    if (timeRow) {
      timeRow.style.display = e.target.checked ? 'none' : 'flex';
    }
  });
}

/**
 * Open dispatch item modal
 * @param {object|null} item - Dispatch item (for edit) or null (for create)
 * @param {object} options - Options { date }
 */
export function openDispatchItemModal(item = null, options = {}) {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  if (!isAdmin(currentUser)) {
    showToast('Nur Administratoren können Einsätze bearbeiten', 'error');
    return;
  }
  
  // Remove existing modal if present
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Render modal
  const modalHTML = renderDispatchItemModal(item, options.date);
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Focus first input
  const firstInput = document.querySelector('#form-dispatch-item input, #form-dispatch-item select');
  if (firstInput) {
    firstInput.focus();
  }
}

// Export for global access
window.openDispatchItemModal = openDispatchItemModal;

