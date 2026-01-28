/**
 * Resource Navigation Handlers
 * Handles dock buttons and sidebar interactions
 */

import { on } from './events.js';
import { getState, setState } from '../state/index.js';
import { setResourceContext, setResourceQuery, setUnassignedQuery, setSelectedResource, clearSelectedResource } from '../state/actions.js';
import { getResourceContext } from '../state/selectors.js';
import { renderResourceSidebar } from '../views/planning/resourceSidebar.js';
import { renderApp } from '../views/renderApp.js';
import { formatDateLocal } from '../utils/format.js';
import { isAdmin } from '../utils/permissions.js';

/**
 * Render sidebar partially (for performance)
 */
function renderSidebarOnly() {
  const sidebarRoot = document.getElementById('resourceSidebarRoot');
  if (sidebarRoot) {
    const state = getState();
    sidebarRoot.innerHTML = renderResourceSidebar();
  }
}

/**
 * Bind resource navigation handlers
 */
export function bindResourceNavHandlers() {
  // Dock button: Set resource context
  on('click', '[data-action="set-resource-context"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="set-resource-context"]');
    const context = btn?.getAttribute('data-resource-context');
    
    if (!context || !['WORKER', 'VEHICLE', 'DEVICE', 'LOCATION', 'DISPATCH'].includes(context)) {
      return;
    }
    
    // Guard: If already same context, return early
    const currentContext = getResourceContext();
    if (currentContext === context) {
      return;
    }
    
    // Dispatch actions in correct order:
    // 1. Clear selected resource (when switching context)
    clearSelectedResource();
    
    // 2. Reset search query
    setResourceQuery('');
    
    // 3. Set new resource context
    setResourceContext(context);
    
    // 4. Update dock active state (by updating dock buttons)
    updateDockActiveState(context);
    
    // 5. Immediately render sidebar with new context
    renderSidebarOnly();
  });
  
  // Resource search input
  on('input', '[data-role="resource-search"]', (e) => {
    const query = e.target.value || '';
    setResourceQuery(query);
    renderSidebarOnly();
  });
  
  // Unassigned panel search input
  on('input', '[data-role="unassigned-search"]', async (e) => {
    const query = e.target.value || '';
    setUnassignedQuery(query);
    // Re-render unassigned panel (if needed, can be optimized later)
    const { renderApp } = await import('../views/renderApp.js');
    renderApp();
  });
  
  // Management tab navigation (from empty state CTA)
  on('click', '[data-action="open-management-tab"]', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="open-management-tab"]');
    const tab = btn?.getAttribute('data-action-param');
    
    if (tab) {
      const state = getState();
      setState({
        ui: {
          ...state.ui,
          activeMode: 'manage',
          managementTab: tab
        }
      });
      
      // Re-render app to show management view
      const { renderApp } = await import('../views/renderApp.js');
      renderApp();
    }
  });
  
  // Create dispatch item (from empty state CTA or week view)
  on('click', '[data-action="open-create-dispatch-item"]', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="open-create-dispatch-item"]');
    const date = btn?.getAttribute('data-date');
    
    const state = getState();
    const selectedResource = state.ui.selectedResource;
    
    // If date is provided, use it; otherwise use activeDate
    const targetDate = date || state.ui.activeDate || formatDateLocal(new Date());
    
    // Check if location is selected
    if (selectedResource && selectedResource.type === 'LOCATION') {
      const { createDispatchItem } = await import('../services/dispatchService.js');
      const { showToast } = await import('../utils/ui.js');
      
      try {
        const result = await createDispatchItem({
          locationId: selectedResource.id,
          date: targetDate,
          allDay: true,
          status: 'PLANNED'
        });
        
        if (result.success) {
          showToast('Einsatz erstellt', 'success');
          renderApp();
        } else {
          showToast(result.error || 'Fehler beim Erstellen', 'error');
        }
      } catch (error) {
        console.error('Failed to create dispatch item:', error);
        showToast('Fehler beim Erstellen', 'error');
      }
    } else {
      // Fallback: Open modal if no location selected
      const { openDispatchItemModal } = await import('../views/modals/dispatchItemModal.js');
      openDispatchItemModal(null, { date: targetDate });
    }
  });
  
  // Create dispatch for specific day
  on('click', '[data-action="create-dispatch-for-day"]', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="create-dispatch-for-day"]');
    const date = btn?.getAttribute('data-date');
    
    if (!date) return;
    
    const state = getState();
    const selectedResource = state.ui.selectedResource;
    
    if (selectedResource && selectedResource.type === 'LOCATION') {
      const { createDispatchItem } = await import('../services/dispatchService.js');
      const { showToast } = await import('../utils/ui.js');
      
      try {
        const result = await createDispatchItem({
          locationId: selectedResource.id,
          date: date,
          allDay: true,
          status: 'PLANNED'
        });
        
        if (result.success) {
          showToast('Einsatz erstellt', 'success');
          renderApp();
        } else {
          showToast(result.error || 'Fehler beim Erstellen', 'error');
        }
      } catch (error) {
        console.error('Failed to create dispatch item:', error);
        showToast('Fehler beim Erstellen', 'error');
      }
    } else {
      const { showToast } = await import('../utils/ui.js');
      showToast('Bitte zuerst Einsatzort auswählen', 'warning');
    }
  });
  
  // Select resource (sidebar item click)
  on('click', '[data-action="select-resource"]', (e) => {
    e.preventDefault();
    const item = e.target.closest('[data-action="select-resource"]');
    const type = item?.getAttribute('data-type');
    const id = item?.getAttribute('data-id');
    
    if (type && id) {
      setSelectedResource(type, id);
      // Re-render sidebar (for active state) and main/right panels
      renderSidebarOnly();
      // Re-render main and right panel (but not whole app for performance)
      renderMainAndRightOnly();
    }
  });
  
  // Toggle right panel (unassigned)
  on('click', '[data-action="toggle-right-panel"]', (e) => {
    e.preventDefault();
    const state = getState();
    setState({
      ui: {
        ...state.ui,
        rightPanelCollapsed: !state.ui.rightPanelCollapsed
      }
    });
    renderApp();
  });
}

/**
 * Update dock active state (update CSS classes on dock buttons)
 */
function updateDockActiveState(activeContext) {
  // Remove active class from all dock buttons
  document.querySelectorAll('[data-action="set-resource-context"]').forEach(btn => {
    btn.classList.remove('dock__btn--active');
  });
  
  // Add active class to the clicked button
  const activeBtn = document.querySelector(`[data-action="set-resource-context"][data-resource-context="${activeContext}"]`);
  if (activeBtn) {
    activeBtn.classList.add('dock__btn--active');
  }
}

/**
 * Render main and right panel only (for performance)
 */
function renderMainAndRightOnly() {
  const mainRoot = document.querySelector('.dispo__main');
  const rightRoot = document.querySelector('.dispo__right');
  
  if (mainRoot || rightRoot) {
    // Re-render app but only update main and right areas
    renderApp();
  }
}

