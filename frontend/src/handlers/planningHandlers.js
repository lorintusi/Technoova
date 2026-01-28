/**
 * Planning Event Handlers
 * Uses event delegation for all planning-related interactions
 */

import { on } from './events.js';
import { 
  getState, 
  setState, 
  setSelectedPlanningWorkerId, 
  setActiveDate, 
  setShowTeamCalendar,
  getActiveWorkerId, 
  getActiveUserId, 
  getSelectedPlanningWorkerId
} from '../state/index.js';
import { setDayViewMode } from '../state/actions.js';
import { renderApp } from '../views/renderApp.js';
import { confirmDayFromPlanning } from '../services/planningService.js';
import { confirmDispatchDay } from '../services/dispatchService.js';
import { canConfirmDay } from '../utils/permissions.js';
import { showToast } from '../utils/ui.js';
import { 
  createDispatchItem, 
  updateDispatchItem, 
  deleteDispatchItem,
  upsertDispatchAssignmentsBatch,
  loadDispatchItems
} from '../services/dispatchService.js';
import { getDispatchItem } from '../state/index.js';
import { renderDispatchItemModal } from '../views/modals/dispatchItemModal.js';
import { formatDateLocal } from '../utils/format.js';

/**
 * Toggle planning sidebar
 */
function togglePlanningSidebar() {
  const state = getState();
  const newCollapsed = !state.ui.planningSidebarCollapsed;
  setState({
    ui: {
      ...state.ui,
      planningSidebarCollapsed: newCollapsed
    }
  });
  renderApp();
}

/**
 * Bind planning event handlers
 */
export function bindPlanningHandlers() {
  // Planning worker selector change
  on('change', '#planning-worker-select', (e) => {
    const workerId = e.target.value;
    if (workerId) {
      setSelectedPlanningWorkerId(workerId);
      renderApp();
    }
  });
  
  // Team calendar toggle
  on('click', '[data-action="open-team-calendar"]', (e) => {
    e.preventDefault();
    setShowTeamCalendar(true);
    renderApp();
  });
  
  on('click', '[data-action="close-team-calendar"]', (e) => {
    e.preventDefault();
    setShowTeamCalendar(false);
    renderApp();
  });
  
  // Confirm day button (now uses Dispatch Items)
  on('click', '#btn-confirm-day', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('#btn-confirm-day');
    const date = btn.getAttribute('data-date');
    const workerId = btn.getAttribute('data-worker-id');
    
    if (!date || !workerId) {
      showToast('Fehler: Datum oder Mitarbeiter-ID fehlt', 'error');
      return;
    }
    
    // Check if there are PLANNED dispatch items to confirm
    const state = getState();
    const { getDispatchItemsForWorkerDay } = await import('../state/index.js');
    const dispatchItems = getDispatchItemsForWorkerDay(date, workerId);
    const plannedItems = dispatchItems.filter(item => item.status === 'PLANNED');
    
    if (plannedItems.length === 0) {
      showToast('Keine geplanten Einsätze zum Bestätigen vorhanden', 'info');
      return;
    }
    
    // Disable button during processing (loading state)
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('btn--loading');
    btn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Bestätige...</span>';
    
    try {
      const result = await confirmDispatchDay(date, workerId);
      
      if (result.success) {
        // Success - show transparent feedback
        const created = result.created || 0;
        const skipped = result.skipped || 0;
        
        if (created > 0 && skipped > 0) {
          showToast(`${created} erstellt, ${skipped} bereits vorhanden`, 'success');
        } else if (created > 0) {
          showToast(`${created} Zeiteintrag${created > 1 ? 'e' : ''} erstellt`, 'success');
        } else if (skipped > 0) {
          showToast(`${skipped} bereits vorhanden`, 'info');
        } else if (result.message) {
          showToast(result.message, 'info');
        }
        
        // Re-render to show updated state
        renderApp();
      } else {
        let errorMessage = result.error || 'Unbekannter Fehler';
        if (result.status === 403 || result.status === 401) {
          errorMessage = 'Keine Berechtigung';
        } else if (result.status >= 500) {
          errorMessage = 'Serverfehler';
        }
        showToast(`Fehler beim Bestätigen: ${errorMessage}`, 'error');
        btn.disabled = false;
        btn.classList.remove('btn--loading');
        btn.innerHTML = originalHTML;
      }
    } catch (error) {
      console.error('Error confirming day:', error);
      let errorMessage = error.message || 'Unbekannter Fehler';
      if (error.status === 403 || error.status === 401) {
        errorMessage = 'Keine Berechtigung';
      } else if (error.status >= 500) {
        errorMessage = 'Serverfehler';
      }
      showToast(`Fehler beim Bestätigen: ${errorMessage}`, 'error');
      btn.disabled = false;
      btn.classList.remove('btn--loading');
      btn.innerHTML = originalHTML;
    }
  });
  
  // Open time entry wizard (syncs date + selected worker)
  on('click', '[data-action="open-time-entry-wizard"]', (e) => {
    e.preventDefault();
    const state = getState();
    
    // Get active date (from selected day or calendar date)
    const activeDate = state.ui.activeDate || 
                      (state.ui.selectedDay ? formatDateLocal(new Date(state.ui.selectedDay)) : null) ||
                      formatDateLocal(state.ui.calendarDate || new Date());
    
    // Get selected worker (for admin planning)
    const selectedWorkerId = getSelectedPlanningWorkerId() || getActiveWorkerId() || getActiveUserId();
    
    // Set active date (Single Source of Truth)
    setActiveDate(activeDate);
    
    // Open wizard with activeDate and selectedWorkerId
    if (window.openTimeEntryWizard) {
      // Pass activeDate and selectedWorkerId to wizard
      window.openTimeEntryWizard(activeDate, null, null, selectedWorkerId);
    } else {
      console.warn('openTimeEntryWizard not available');
    }
  });
  
  // Calendar day click - set active date
  on('click', '[data-date]', (e) => {
    const dateStr = e.target.closest('[data-date]')?.getAttribute('data-date');
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setActiveDate(dateStr);
      
      // If in day view mode, switch to day view
      const state = getState();
      if (state.ui.calendarViewMode !== 'day') {
        setState({
          ui: {
            ...state.ui,
            calendarViewMode: 'day',
            selectedDay: new Date(dateStr + 'T00:00:00')
          }
        });
        renderApp();
      }
    }
  });
  
  // Calendar view mode switch
  on('click', '[data-view-mode]', (e) => {
    e.preventDefault();
    const mode = e.target.closest('[data-view-mode]')?.getAttribute('data-view-mode');
    if (mode && ['year', 'month', 'week', 'day'].includes(mode)) {
      const state = getState();
      setState({
        ui: {
          ...state.ui,
          calendarViewMode: mode
        }
      });
      renderApp();
    }
  });
  
  // Toggle sidebar
  on('click', '[data-action="toggle-sidebar"]', (e) => {
    e.preventDefault();
    togglePlanningSidebar();
  });
  
  // Open unconfirmed day
  on('click', '[data-action="open-unconfirmed-day"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="open-unconfirmed-day"]');
    const workerId = btn?.getAttribute('data-worker-id');
    const date = btn?.getAttribute('data-date');
    
    if (workerId && date) {
      setSelectedPlanningWorkerId(workerId);
      setActiveDate(date);
      
      const state = getState();
      setState({
        ui: {
          ...state.ui,
          calendarViewMode: 'day',
          selectedDay: new Date(date + 'T00:00:00')
        }
      });
      renderApp();
    }
  });
  
  // Dispatch Item Handlers
  bindDispatchItemHandlers();
}

/**
 * Bind dispatch item handlers
 */
function bindDispatchItemHandlers() {
  // Open create dispatch item modal
  on('click', '[data-action="open-create-dispatch-item"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="open-create-dispatch-item"]');
    const date = btn?.getAttribute('data-date');
    
    openDispatchItemModal(null, date);
  });
  
  // Open edit dispatch item modal
  on('click', '[data-action="edit-dispatch-item"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="edit-dispatch-item"]');
    const itemId = btn?.getAttribute('data-dispatch-item-id');
    
    if (itemId) {
      const item = getDispatchItem(itemId);
      if (item) {
        openDispatchItemModal(item);
      } else {
        showToast('Einsatz nicht gefunden', 'error');
      }
    }
  });
  
  // Delete dispatch item
  on('click', '[data-action="delete-dispatch-item"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target.closest('[data-action="delete-dispatch-item"]');
    const itemId = btn?.getAttribute('data-dispatch-item-id');
    
    if (!itemId) return;
    
    if (!confirm('Möchten Sie diesen Einsatz wirklich löschen?')) {
      return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Lösche...';
    
    try {
      const result = await deleteDispatchItem(itemId);
      
      if (result.success) {
        showToast('Einsatz gelöscht', 'success');
        renderApp();
      } else {
        showToast(`Fehler: ${result.error || 'Unbekannter Fehler'}`, 'error');
        btn.disabled = false;
        btn.textContent = '🗑️';
      }
    } catch (error) {
      console.error('Error deleting dispatch item:', error);
      showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}`, 'error');
      btn.disabled = false;
      btn.textContent = '🗑️';
    }
  });
  
  // Dispatch item form submit
  on('submit', '#form-dispatch-item', async (e) => {
    e.preventDefault();
    const form = e.target;
    const itemId = form.getAttribute('data-dispatch-item-id');
    const isEdit = !!itemId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    
    try {
      // Get form data
      const formData = new FormData(form);
      const locationId = formData.get('locationId');
      const date = formData.get('date');
      const category = formData.get('category');
      const allDay = formData.has('allDay');
      const startTime = formData.get('startTime');
      const endTime = formData.get('endTime');
      const status = formData.get('status') || 'PLANNED';
      const note = formData.get('note') || '';
      
      // Get selected resources
      const selectedWorkers = Array.from(formData.getAll('workers')).filter(Boolean);
      const selectedVehicles = Array.from(formData.getAll('vehicles')).filter(Boolean);
      const selectedDevices = Array.from(formData.getAll('devices')).filter(Boolean);
      
      // Build dispatch item data
      const itemData = {
        locationId,
        date,
        category,
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        status,
        note: note || null
      };
      
      let result;
      if (isEdit) {
        // Update existing item
        result = await updateDispatchItem(itemId, itemData);
      } else {
        // Create new item
        result = await createDispatchItem(itemData);
      }
      
      if (result.success && result.data) {
        const dispatchItemId = result.data.id;
        
        // Update assignments
        const assignments = [];
        
        // Add worker assignments
        selectedWorkers.forEach(workerId => {
          assignments.push({
            resourceType: 'WORKER',
            resourceId: workerId,
            date: date
          });
        });
        
        // Add vehicle assignments
        selectedVehicles.forEach(vehicleId => {
          assignments.push({
            resourceType: 'VEHICLE',
            resourceId: vehicleId,
            date: date
          });
        });
        
        // Add device assignments
        selectedDevices.forEach(deviceId => {
          assignments.push({
            resourceType: 'DEVICE',
            resourceId: deviceId,
            date: date
          });
        });
        
        // Upsert assignments
        const assignmentsResult = await upsertDispatchAssignmentsBatch(dispatchItemId, assignments);
        
        if (assignmentsResult.success) {
          showToast(isEdit ? 'Einsatz aktualisiert' : 'Einsatz erstellt', 'success');
          closeDispatchItemModal();
          renderApp();
        } else {
          showToast(`Einsatz ${isEdit ? 'aktualisiert' : 'erstellt'}, aber Fehler bei Ressourcen: ${assignmentsResult.error}`, 'warning');
          closeDispatchItemModal();
          renderApp();
        }
      } else {
        showToast(`Fehler: ${result.error || 'Unbekannter Fehler'}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Error saving dispatch item:', error);
      showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
  
  // Close dispatch item modal
  on('click', '#btn-close-dispatch-modal, #btn-cancel-dispatch, [data-close]', (e) => {
    if (e.target.closest('.modal-overlay') || e.target.id === 'btn-close-dispatch-modal' || e.target.id === 'btn-cancel-dispatch') {
      e.preventDefault();
      closeDispatchItemModal();
    }
  });
  
  // Toggle all-day checkbox
  on('change', '#dispatch-all-day', (e) => {
    const timeRow = document.getElementById('dispatch-time-row');
    if (timeRow) {
      timeRow.style.display = e.target.checked ? 'none' : '';
    }
  });
}

/**
 * Open dispatch item modal
 */
function openDispatchItemModal(item = null, defaultDate = null) {
  // Use modal-root if available, otherwise create modal-host
  let modalHost = document.getElementById('modal-root');
  if (!modalHost) {
    modalHost = document.getElementById('modal-host');
  }
  if (!modalHost) {
    // Create modal host if it doesn't exist
    modalHost = document.createElement('div');
    modalHost.id = 'modal-host';
    document.body.appendChild(modalHost);
  }
  
  modalHost.innerHTML = renderDispatchItemModal(item, defaultDate);
  
  // Focus first input
  const firstInput = modalHost.querySelector('input, select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close dispatch item modal
 */
function closeDispatchItemModal() {
  const modalHost = document.getElementById('modal-host') || document.getElementById('modal-root');
  if (modalHost) {
    modalHost.innerHTML = '';
  }
}


