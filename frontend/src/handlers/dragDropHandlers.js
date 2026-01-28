/**
 * Drag & Drop Handlers
 * Handles drag and drop for resource assignments
 */

import { on } from './events.js';
import { getState, setState } from '../state/index.js';
import { getDispatchItem, getDispatchAssignments } from '../state/index.js';
import { upsertDispatchAssignmentsBatch } from '../services/dispatchService.js';
import { renderApp } from '../views/renderApp.js';
import { showToast } from '../utils/ui.js';

let draggedResource = null;

/**
 * Bind drag & drop handlers
 */
export function bindDragDropHandlers() {
  // Resource pill drag start
  on('dragstart', '.resource-pill', (e) => {
    const pill = e.target.closest('.resource-pill');
    if (!pill) return;
    
    draggedResource = {
      resourceType: pill.getAttribute('data-resource-type'),
      resourceId: pill.getAttribute('data-resource-id'),
      resourceName: pill.getAttribute('data-resource-name')
    };
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedResource));
    
    // Visual feedback
    pill.classList.add('resource-pill--dragging');
    
    // Add dragging class to body for global styles
    document.body.classList.add('dragging-active');
  });
  
  // Resource pill drag end
  on('dragend', '.resource-pill', (e) => {
    const pill = e.target.closest('.resource-pill');
    if (pill) {
      pill.classList.remove('resource-pill--dragging');
    }
    
    // Clear dragging state
    draggedResource = null;
    document.body.classList.remove('dragging-active');
    
    // Clear all drop zone highlights
    document.querySelectorAll('.dispatch-card__section--drop-zone').forEach(zone => {
      zone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
    });
  });
  
  // Drop zone drag over
  on('dragover', '.dispatch-card__section--drop-zone', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dropZone = e.target.closest('.dispatch-card__section--drop-zone');
    if (!dropZone || !draggedResource) return;
    
    const zoneResourceType = dropZone.getAttribute('data-resource-type');
    
    // Check if resource type matches
    if (zoneResourceType === draggedResource.resourceType) {
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('dispatch-card__section--drop-active');
      dropZone.classList.remove('dispatch-card__section--drop-invalid');
    } else {
      e.dataTransfer.dropEffect = 'none';
      dropZone.classList.add('dispatch-card__section--drop-invalid');
      dropZone.classList.remove('dispatch-card__section--drop-active');
    }
  });
  
  // Drop zone drag leave
  on('dragleave', '.dispatch-card__section--drop-zone', (e) => {
    const dropZone = e.target.closest('.dispatch-card__section--drop-zone');
    if (!dropZone) return;
    
    // Only remove highlight if we're actually leaving the zone
    const rect = dropZone.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      dropZone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
    }
  });
  
  // Drop zone drop
  on('drop', '.dispatch-card__section--drop-zone', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dropZone = e.target.closest('.dispatch-card__section--drop-zone');
    if (!dropZone || !draggedResource) return;
    
    const dispatchItemId = dropZone.getAttribute('data-dispatch-item-id');
    const zoneResourceType = dropZone.getAttribute('data-resource-type');
    
    // Validate resource type match
    if (zoneResourceType !== draggedResource.resourceType) {
      showToast('Ressourcentyp stimmt nicht überein', 'error');
      dropZone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
      return;
    }
    
    // Get dispatch item to get date
    const dispatchItem = getDispatchItem(dispatchItemId);
    if (!dispatchItem) {
      showToast('Einsatz nicht gefunden', 'error');
      dropZone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
      return;
    }
    
    // ⚠️ KRITISCHE REGEL: Einsatzort muss gesetzt sein, bevor Ressourcen zugewiesen werden können
    const locationId = dispatchItem.locationId || dispatchItem.location_id;
    if (!locationId) {
      showToast('⚠️ Bitte zuerst einen Einsatzort setzen, bevor Ressourcen zugewiesen werden', 'error');
      dropZone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
      return;
    }
    
    // Get existing assignments
    const existingAssignments = getDispatchAssignments(dispatchItemId);
    
    // Check if assignment already exists (dedupe)
    const alreadyAssigned = existingAssignments.some(a => 
      (a.resourceType || a.resource_type) === draggedResource.resourceType &&
      (a.resourceId || a.resource_id) === draggedResource.resourceId &&
      a.date === dispatchItem.date
    );
    
    if (alreadyAssigned) {
      showToast(`${draggedResource.resourceName} ist bereits zugewiesen`, 'info');
      dropZone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
      return;
    }
    
    // Add new assignment
    const newAssignment = {
      resourceType: draggedResource.resourceType,
      resourceId: draggedResource.resourceId,
      date: dispatchItem.date
    };
    
    // Combine with existing assignments
    const allAssignments = [
      ...existingAssignments.map(a => ({
        resourceType: a.resourceType || a.resource_type,
        resourceId: a.resourceId || a.resource_id,
        date: a.date
      })),
      newAssignment
    ];
    
    // Show loading state
    dropZone.classList.add('dispatch-card__section--drop-loading');
    
    try {
      // Upsert assignments
      const result = await upsertDispatchAssignmentsBatch(dispatchItemId, allAssignments);
      
      if (result.success) {
        showToast(`${draggedResource.resourceName} zugewiesen`, 'success');
        renderApp();
      } else {
        showToast(`Fehler: ${result.error || 'Unbekannter Fehler'}`, 'error');
        dropZone.classList.remove('dispatch-card__section--drop-loading');
      }
    } catch (error) {
      console.error('Error assigning resource:', error);
      showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}`, 'error');
      dropZone.classList.remove('dispatch-card__section--drop-loading');
    } finally {
      dropZone.classList.remove('dispatch-card__section--drop-active', 'dispatch-card__section--drop-invalid');
    }
  });
  
  // Resource context switch (Dock buttons)
  // NOTE: Handler moved to resourceNavHandlers.js for centralized handling
  // The handler in resourceNavHandlers.js handles: clearSelectedResource, setResourceQuery, guard, and dock active state
  // This duplicate handler has been removed to prevent conflicts
  
  // Resource sidebar tab switch
  on('click', '[data-action="switch-resource-tab"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="switch-resource-tab"]');
    const tab = btn?.getAttribute('data-resource-tab');
    
    if (tab && ['WORKER', 'VEHICLE', 'DEVICE'].includes(tab)) {
      const state = getState();
      setState({
        ui: {
          ...state.ui,
          resourceSidebarTab: tab,
          resourceContext: tab // Sync dock context with sidebar tab
        }
      });
      renderApp();
    }
  });
  
  // Resource sidebar search filter
  on('input', '#resource-sidebar-search', (e) => {
    const searchTerm = e.target.value;
    const state = getState();
    setState({
      ui: {
        ...state.ui,
        resourceSidebarSearch: searchTerm
      }
    });
    renderApp();
  });
  
  // Unassigned panel tab switch
  on('click', '[data-action="switch-unassigned-tab"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="switch-unassigned-tab"]');
    const tab = btn?.getAttribute('data-resource-tab');
    
    if (tab && ['WORKER', 'VEHICLE', 'DEVICE'].includes(tab)) {
      const state = getState();
      setState({
        ui: {
          ...state.ui,
          unassignedPanelTab: tab
        }
      });
      renderApp();
    }
  });
  
  // Unassigned panel search filter
  on('input', '#unassigned-panel-search', (e) => {
    const searchTerm = e.target.value;
    const state = getState();
    setState({
      ui: {
        ...state.ui,
        unassignedPanelSearch: searchTerm
      }
    });
    renderApp();
  });
}

