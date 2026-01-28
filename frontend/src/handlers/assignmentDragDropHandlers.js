/**
 * Assignment Drag & Drop Handlers
 * Handles drag and drop for resource assignments to dispatch items
 */

import { on } from './events.js';
import { getState, getDispatchItems, getDispatchAssignments } from '../state/index.js';
import { upsertDispatchAssignmentsBatch, removeDispatchAssignment } from '../services/dispatchService.js';
import { renderApp } from '../views/renderApp.js';
import { showToast } from '../utils/ui.js';
import { validateDispatchAssignmentOverlap } from '../utils/dispatchValidation.js';

let draggedResource = null;

/**
 * Bind assignment drag & drop handlers
 */
export function bindAssignmentDragDropHandlers() {
  // Drag start: Resource from sidebar
  on('dragstart', '[draggable="true"][data-drag-type]', (e) => {
    const item = e.target.closest('[data-drag-type]');
    const dragType = item?.getAttribute('data-drag-type');
    const dragId = item?.getAttribute('data-drag-id');
    
    if (dragType && dragId) {
      draggedResource = {
        type: dragType,
        id: dragId
      };
      
      // Set drag data
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify(draggedResource));
      
      // Visual feedback
      item.style.opacity = '0.5';
    }
  });
  
  // Drag end: Reset visual feedback
  on('dragend', '[draggable="true"][data-drag-type]', (e) => {
    const item = e.target.closest('[data-drag-type]');
    if (item) {
      item.style.opacity = '';
    }
    draggedResource = null;
  });
  
  // Drag over: Drop zone highlight
  on('dragover', '[data-drop]', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const dropZone = e.target.closest('[data-drop]');
    if (dropZone) {
      const dropType = dropZone.getAttribute('data-drop');
      const dragType = draggedResource?.type;
      
      // Only highlight if types match
      if (dragType === dropType) {
        dropZone.classList.add('dropzone--over');
      } else {
        dropZone.classList.add('dropzone--invalid');
      }
    }
  });
  
  // Drag leave: Remove highlight
  on('dragleave', '[data-drop]', (e) => {
    const dropZone = e.target.closest('[data-drop]');
    if (dropZone) {
      dropZone.classList.remove('dropzone--over', 'dropzone--invalid');
    }
  });
  
  // Drop: Assign resource to dispatch item
  on('drop', '[data-drop]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dropZone = e.target.closest('[data-drop]');
    if (!dropZone) return;
    
    // Remove highlights
    dropZone.classList.remove('dropzone--over', 'dropzone--invalid');
    
    // Get drop zone info
    const dropType = dropZone.getAttribute('data-drop');
    const dispatchId = dropZone.getAttribute('data-dispatch-id');
    
    if (!dispatchId) {
      console.warn('No dispatch ID found in drop zone');
      return;
    }
    
    // Get dragged resource
    let dragData = null;
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        dragData = JSON.parse(jsonData);
      } else if (draggedResource) {
        dragData = draggedResource;
      }
    } catch (err) {
      console.warn('Failed to parse drag data:', err);
      if (draggedResource) {
        dragData = draggedResource;
      }
    }
    
    if (!dragData || !dragData.type || !dragData.id) {
      console.warn('Invalid drag data');
      return;
    }
    
    // Validate type match
    if (dragData.type !== dropType) {
      showToast(`Falscher Typ: ${dragData.type} kann nicht auf ${dropType} zugewiesen werden`, 'error');
      return;
    }
    
    // Check if already assigned
    const state = getState();
    const existingAssignments = (state.data.dispatchAssignments || []).filter(
      a => String(a.dispatchItemId || a.dispatch_item_id) === String(dispatchId) &&
           (a.resourceType || a.resource_type) === dragData.type &&
           String(a.resourceId || a.resource_id) === String(dragData.id)
    );
    
    if (existingAssignments.length > 0) {
      showToast('Ressource ist bereits zugewiesen', 'warning');
      return;
    }
    
    // OVERLAP VALIDATION for WORKER assignments
    if (dragData.type === 'WORKER') {
      const dispatchItem = getDispatchItems().find(item => String(item.id) === String(dispatchId));
      if (dispatchItem) {
        const itemDate = dispatchItem.date;
        const itemStartTime = dispatchItem.startTime || dispatchItem.start_time;
        const itemEndTime = dispatchItem.endTime || dispatchItem.end_time;
        const itemAllDay = dispatchItem.allDay || dispatchItem.all_day;
        
        // Get all dispatch items for this worker and date
        const itemsForDate = getDispatchItems(itemDate, itemDate);
        const itemsForWorker = itemsForDate.filter(item => {
          const assignments = getDispatchAssignments(item.id);
          return assignments.some(a => 
            (a.resourceType || a.resource_type) === 'WORKER' &&
            String(a.resourceId || a.resource_id) === String(dragData.id)
          );
        });
        
        // Validate overlap
        const validation = validateDispatchAssignmentOverlap(
          dragData.id,
          itemDate,
          itemStartTime,
          itemEndTime,
          itemAllDay,
          itemsForWorker
        );
        
        if (!validation.ok) {
          showToast(validation.message || 'Zeitüberschneidung erkannt', 'error');
          return;
        }
      }
    }
    
    // Create assignment
    try {
      const assignment = {
        dispatchItemId: dispatchId,
        resourceType: dragData.type,
        resourceId: dragData.id
      };
      
      await upsertDispatchAssignmentsBatch(dispatchId, [assignment]);
      
      // Show success toast
      const resourceName = getResourceName(dragData.type, dragData.id);
      showToast(`${resourceName} zugewiesen`, 'success');
      
      // Re-render app to show new assignment
      renderApp();
    } catch (error) {
      console.error('Failed to assign resource:', error);
      showToast('Fehler beim Zuweisen', 'error');
    }
  });
}

/**
 * Remove assignment handler
 */
on('click', '[data-action="remove-assignment"]', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const btn = e.target.closest('[data-action="remove-assignment"]');
  const assignmentId = btn?.getAttribute('data-assignment-id');
  const dispatchId = btn?.getAttribute('data-dispatch-id');
  const resourceType = btn?.getAttribute('data-resource-type');
  
  if (!assignmentId) {
    console.warn('No assignment ID found');
    return;
  }
  
  // Get resource name for toast
  const state = getState();
  const assignment = (state.data.dispatchAssignments || []).find(
    a => String(a.id) === String(assignmentId)
  );
  
  let resourceName = 'Ressource';
  if (assignment) {
    resourceName = getResourceName(
      assignment.resourceType || assignment.resource_type,
      assignment.resourceId || assignment.resource_id
    );
  }
  
  // Loading state
  btn.disabled = true;
  btn.textContent = '...';
  
  try {
    const result = await removeDispatchAssignment(assignmentId);
    
    if (result.success) {
      showToast(`${resourceName} entfernt`, 'success');
      // Re-render week view and right panel
      renderApp();
    } else {
      showToast(result.error || 'Fehler beim Entfernen', 'error');
      btn.disabled = false;
      btn.textContent = '×';
    }
  } catch (error) {
    console.error('Failed to remove assignment:', error);
    showToast('Fehler beim Entfernen', 'error');
    btn.disabled = false;
    btn.textContent = '×';
  }
});

/**
 * Get resource name by type and id
 */
function getResourceName(resourceType, resourceId) {
  const state = getState();
  
  switch (resourceType) {
    case 'WORKER':
      const worker = (state.data.workers || []).find(w => String(w.id) === String(resourceId));
      return worker?.name || `Worker ${resourceId}`;
    case 'VEHICLE':
      const vehicle = (state.data.vehicles || []).find(v => String(v.id) === String(resourceId));
      return vehicle?.name || `Fahrzeug ${resourceId}`;
    case 'DEVICE':
      const device = (state.data.devices || []).find(d => String(d.id) === String(resourceId));
      return device?.name || `Gerät ${resourceId}`;
    default:
      return `Unknown ${resourceId}`;
  }
}

