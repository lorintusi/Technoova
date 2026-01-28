/**
 * Assignment & Planning Handlers
 * Viaplano-Workflow: Einsätze erstellen + Personal & Ressourcen einplanen
 */

import { on } from './events.js';
import { api } from '../api/endpoints.js';
import { getState, setState } from '../state/index.js';
import { renderApp } from '../views/renderApp.js';
import { openAssignmentModal, closeAssignmentModal } from '../views/modals/assignmentModal.js';
import { openPlanningModal, closePlanningModal } from '../views/modals/planningModal.js';
import { showToast } from '../utils/ui.js';

/**
 * Bind assignment & planning handlers
 */
export function bindAssignmentHandlers() {
  // ========== ASSIGNMENT (Einsatz) HANDLERS ==========
  
  // Open create assignment modal
  on('click', '#btn-add-assignment', (e) => {
    e.preventDefault();
    console.log('[AssignmentHandler] Opening assignment modal');
    openAssignmentModal();
  });
  
  // Open edit assignment modal
  on('click', '[data-action="edit-assignment"]', (e) => {
    e.preventDefault();
    const assignmentId = e.target.closest('[data-action="edit-assignment"]')?.getAttribute('data-assignment-id');
    if (assignmentId) {
      const state = getState();
      const assignment = state.data.assignments.find(a => a.id == assignmentId);
      if (assignment) {
        console.log('[AssignmentHandler] Opening edit modal for assignment', assignment.id);
        openAssignmentModal(assignment);
      }
    }
  });
  
  // Delete assignment
  on('click', '[data-action="delete-assignment"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const assignmentId = e.target.closest('[data-action="delete-assignment"]')?.getAttribute('data-assignment-id');
    if (!assignmentId) return;
    
    const state = getState();
    const assignment = state.data.assignments.find(a => a.id == assignmentId);
    if (!assignment) return;
    
    const confirmMsg = `Einsatz "${assignment.title}" wirklich löschen?\n\nAlle zugehörigen Planungen werden ebenfalls gelöscht!`;
    if (!confirm(confirmMsg)) return;
    
    try {
      const response = await api.deleteAssignment(assignmentId);
      if (response.success) {
        // Remove from state
        setState({
          data: {
            ...state.data,
            assignments: state.data.assignments.filter(a => a.id != assignmentId),
            dispatchAssignments: state.data.dispatchAssignments.filter(d => d.assignment_id != assignmentId)
          }
        });
        renderApp();
        showToast('Einsatz gelöscht', 'success');
      }
    } catch (error) {
      console.error('[AssignmentHandler] Error deleting assignment:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Löschen'}`, 'error');
    }
  });
  
  // Save assignment form
  on('submit', '#form-assignment', async (e) => {
    e.preventDefault();
    const form = e.target;
    const assignmentId = form.getAttribute('data-assignment-id');
    const isEdit = !!assignmentId;
    
    const locationId = form.querySelector('[name="location_id"]')?.value;
    const title = form.querySelector('[name="title"]')?.value.trim();
    const startDate = form.querySelector('[name="start_date"]')?.value;
    const endDate = form.querySelector('[name="end_date"]')?.value;
    const notes = form.querySelector('[name="notes"]')?.value.trim();
    const status = form.querySelector('[name="status"]')?.value;
    
    if (!locationId || !title || !startDate || !endDate) {
      showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Enddatum muss nach Startdatum liegen', 'error');
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Speichere...' : 'Erstelle...';
    }
    
    try {
      const data = {
        location_id: parseInt(locationId),
        title,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        status
      };
      
      let response;
      if (isEdit) {
        response = await api.updateAssignment(assignmentId, data);
      } else {
        response = await api.createAssignment(data);
      }
      
      if (response.success) {
        console.log('[AssignmentHandler] Assignment saved:', response.data);
        
        // Reload assignments
        const assignmentsResponse = await api.getAssignments();
        if (assignmentsResponse.success) {
          setState({
            data: {
              ...getState().data,
              assignments: assignmentsResponse.data || []
            }
          });
        }
        
        closeAssignmentModal();
        renderApp();
        showToast(isEdit ? 'Einsatz aktualisiert' : 'Einsatz erstellt', 'success');
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('[AssignmentHandler] Error saving assignment:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Speichern'}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // ========== PLANNING (Personal einplanen) HANDLERS ==========
  
  // Open planning modal
  on('click', '#btn-add-planning', (e) => {
    e.preventDefault();
    console.log('[AssignmentHandler] Opening planning modal');
    openPlanningModal();
  });
  
  // Open planning modal with pre-selected assignment/date
  on('click', '[data-action="plan-for-assignment"]', (e) => {
    e.preventDefault();
    const assignmentId = e.target.closest('[data-action="plan-for-assignment"]')?.getAttribute('data-assignment-id');
    const date = e.target.closest('[data-action="plan-for-assignment"]')?.getAttribute('data-date');
    console.log('[AssignmentHandler] Opening planning modal for assignment', assignmentId, 'date', date);
    openPlanningModal({ assignment_id: assignmentId, date });
  });
  
  // Open edit planning modal
  on('click', '[data-action="edit-planning"]', (e) => {
    e.preventDefault();
    const planningId = e.target.closest('[data-action="edit-planning"]')?.getAttribute('data-planning-id');
    if (planningId) {
      const state = getState();
      const planning = state.data.dispatchAssignments.find(p => p.id == planningId);
      if (planning) {
        console.log('[AssignmentHandler] Opening edit planning modal', planning.id);
        openPlanningModal({ dispatch_assignment: planning });
      }
    }
  });
  
  // Delete planning
  on('click', '[data-action="delete-planning"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const planningId = e.target.closest('[data-action="delete-planning"]')?.getAttribute('data-planning-id');
    if (!planningId) return;
    
    const state = getState();
    const planning = state.data.dispatchAssignments.find(p => p.id == planningId);
    if (!planning) return;
    
    const worker = state.data.workers.find(w => w.id === planning.worker_id);
    const workerName = worker?.name || 'Mitarbeiter';
    
    const confirmMsg = `Planung für "${workerName}" am ${planning.date} wirklich löschen?`;
    if (!confirm(confirmMsg)) return;
    
    try {
      const response = await api.deleteDispatchAssignment(planningId);
      if (response.success) {
        // Remove from state
        setState({
          data: {
            ...state.data,
            dispatchAssignments: state.data.dispatchAssignments.filter(p => p.id != planningId)
          }
        });
        renderApp();
        showToast('Planung gelöscht', 'success');
      }
    } catch (error) {
      console.error('[AssignmentHandler] Error deleting planning:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Löschen'}`, 'error');
    }
  });
  
  // Save planning form
  on('submit', '#form-planning', async (e) => {
    e.preventDefault();
    const form = e.target;
    const dispatchAssignmentId = form.getAttribute('data-dispatch-assignment-id');
    const isEdit = !!dispatchAssignmentId;
    
    const assignmentId = form.querySelector('[name="assignment_id"]')?.value;
    const date = form.querySelector('[name="date"]')?.value;
    const workerId = form.querySelector('[name="worker_id"]')?.value;
    const notes = form.querySelector('[name="notes"]')?.value.trim();
    
    // Collect vehicle IDs
    const vehicleIds = Array.from(form.querySelectorAll('[name="vehicle_ids"]:checked')).map(cb => parseInt(cb.value));
    
    // Collect device IDs
    const deviceIds = Array.from(form.querySelectorAll('[name="device_ids"]:checked')).map(cb => parseInt(cb.value));
    
    // Check for bulk mode
    const bulkMode = form.querySelector('#planning-bulk-mode')?.checked;
    const endDate = form.querySelector('[name="end_date"]')?.value;
    
    if (!assignmentId || !date || !workerId) {
      showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Speichere...' : 'Plane ein...';
    }
    
    try {
      // Check for double booking (only for new plannings)
      if (!isEdit) {
        const existingResponse = await api.getDispatchAssignments({ worker_id: workerId, date });
        if (existingResponse.success && existingResponse.data && existingResponse.data.length > 0) {
          const existing = existingResponse.data.find(d => d.assignment_id != assignmentId);
          if (existing) {
            const state = getState();
            const existingAssignment = state.data.assignments.find(a => a.id === existing.assignment_id);
            const assignmentTitle = existingAssignment?.title || 'einen anderen Einsatz';
            const confirmMsg = `⚠️ WARNUNG: Doppelbuchung!\n\nDer Mitarbeiter ist am ${date} bereits für "${assignmentTitle}" eingeplant.\n\nTrotzdem fortfahren?`;
            if (!confirm(confirmMsg)) {
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
              }
              return;
            }
          }
        }
      }
      
      let response;
      if (isEdit) {
        // Edit: only update vehicle_ids, device_ids, notes
        response = await api.updateDispatchAssignment(dispatchAssignmentId, {
          vehicle_ids: vehicleIds,
          device_ids: deviceIds,
          notes: notes || null
        });
      } else if (bulkMode && endDate) {
        // Bulk: Generate dates array
        const dates = generateDateRange(date, endDate);
        console.log('[AssignmentHandler] Bulk planning for dates:', dates);
        
        response = await api.createDispatchAssignmentsBulk({
          assignment_id: parseInt(assignmentId),
          dates,
          worker_id: parseInt(workerId),
          vehicle_ids: vehicleIds,
          device_ids: deviceIds,
          notes: notes || null
        });
      } else {
        // Single day
        response = await api.createDispatchAssignment({
          assignment_id: parseInt(assignmentId),
          date,
          worker_id: parseInt(workerId),
          vehicle_ids: vehicleIds,
          device_ids: deviceIds,
          notes: notes || null
        });
      }
      
      if (response.success) {
        console.log('[AssignmentHandler] Planning saved:', response.data);
        
        // Reload dispatch_assignments
        const dispatchResponse = await api.getDispatchAssignments();
        if (dispatchResponse.success) {
          setState({
            data: {
              ...getState().data,
              dispatchAssignments: dispatchResponse.data || []
            }
          });
        }
        
        closePlanningModal();
        renderApp();
        
        if (bulkMode && response.count) {
          showToast(`${response.count} Planungen erstellt`, 'success');
        } else {
          showToast(isEdit ? 'Planung aktualisiert' : 'Planung erstellt', 'success');
        }
      } else {
        throw new Error(response.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('[AssignmentHandler] Error saving planning:', error);
      showToast(`Fehler: ${error.message || 'Fehler beim Speichern'}`, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
  
  // ========== MODAL CLOSE HANDLERS ==========
  
  // Close assignment modal
  on('click', '[data-close="assignment-modal"]', (e) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      closeAssignmentModal();
    }
  });
  
  on('click', '#btn-close-assignment-modal, #btn-cancel-assignment-modal', (e) => {
    e.preventDefault();
    closeAssignmentModal();
  });
  
  // Close planning modal
  on('click', '[data-close="planning-modal"]', (e) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      closePlanningModal();
    }
  });
  
  on('click', '#btn-close-planning-modal, #btn-cancel-planning-modal', (e) => {
    e.preventDefault();
    closePlanningModal();
  });
}

/**
 * Helper: Generate date range (inclusive)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string[]} Array of dates in YYYY-MM-DD format
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}


