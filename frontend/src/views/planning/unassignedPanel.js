/**
 * Unassigned Panel
 * Shows unassigned resources for selected date
 */

import { getState } from '../../state/index.js';
import { getUnassignedResourcesForDate } from '../../state/selectors.js';
import { formatDateLocal } from '../../utils/format.js';

/**
 * Render unassigned panel
 */
export function renderUnassignedPanel() {
  const state = getState();
  const currentTab = state.ui.unassignedPanelTab || 'WORKER';
  
  // Get selected date (from calendar or active date)
  const selectedDate = state.ui.activeDate || 
                      (state.ui.calendarDate ? formatDateLocal(new Date(state.ui.calendarDate)) : null) ||
                      formatDateLocal(new Date());
  
  // Get unassigned resources for each type
  const unassignedWorkers = getUnassignedResourcesForDate(selectedDate, 'WORKER');
  const unassignedVehicles = getUnassignedResourcesForDate(selectedDate, 'VEHICLE');
  const unassignedDevices = getUnassignedResourcesForDate(selectedDate, 'DEVICE');
  
  // Get search filter (use new unassignedQuery if available, fallback to old name)
  const searchFilter = state.ui.unassignedQuery || state.ui.unassignedPanelSearch || '';
  
  // Filter resources by search
  const filteredWorkers = filterResources(unassignedWorkers, searchFilter, 'name');
  const filteredVehicles = filterResources(unassignedVehicles, searchFilter, 'name', 'licensePlate');
  const filteredDevices = filterResources(unassignedDevices, searchFilter, 'name', 'serialNumber');
  
  // Format date for display
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dateDisplay = dateObj.toLocaleDateString('de-CH', { 
    weekday: 'short', 
    day: '2-digit', 
    month: '2-digit' 
  });
  
  return `
    <div class="unassigned-panel">
      <div class="unassigned-panel__date">
        <span class="unassigned-panel__date-label">Datum:</span>
        <span class="unassigned-panel__date-value">${dateDisplay}</span>
      </div>
      
      <div class="unassigned-panel__tabs">
        <button 
          class="tab ${currentTab === 'WORKER' ? 'tab--active' : ''}" 
          data-resource-tab="WORKER"
          data-action="switch-unassigned-tab"
        >
          Personal (${filteredWorkers.length})
        </button>
        <button 
          class="tab ${currentTab === 'VEHICLE' ? 'tab--active' : ''}" 
          data-resource-tab="VEHICLE"
          data-action="switch-unassigned-tab"
        >
          Fahrzeuge (${filteredVehicles.length})
        </button>
        <button 
          class="tab ${currentTab === 'DEVICE' ? 'tab--active' : ''}" 
          data-resource-tab="DEVICE"
          data-action="switch-unassigned-tab"
        >
          Geräte (${filteredDevices.length})
        </button>
      </div>
      
      <div class="unassigned-panel__search">
        <input 
          type="text" 
          class="input input--search" 
          id="unassigned-panel-search"
          data-role="unassigned-search"
          placeholder="Suchen..." 
          value="${searchFilter}"
        />
      </div>
      
      <div class="unassigned-panel__list">
        ${currentTab === 'WORKER' ? renderUnassignedList(filteredWorkers, 'WORKER') : ''}
        ${currentTab === 'VEHICLE' ? renderUnassignedList(filteredVehicles, 'VEHICLE') : ''}
        ${currentTab === 'DEVICE' ? renderUnassignedList(filteredDevices, 'DEVICE') : ''}
      </div>
    </div>
  `;
}

/**
 * Filter resources by search term
 */
function filterResources(resources, searchTerm, ...fields) {
  if (!searchTerm) return resources;
  
  const term = searchTerm.toLowerCase();
  return resources.filter(resource => {
    return fields.some(field => {
      const value = resource[field];
      return value && value.toString().toLowerCase().includes(term);
    });
  });
}

/**
 * Render unassigned resource list
 */
function renderUnassignedList(resources, resourceType) {
  if (resources.length === 0) {
    return `
      <div class="unassigned-panel__empty">
        <div class="unassigned-panel__empty-icon">✓</div>
        <div class="unassigned-panel__empty-text">Alle Ressourcen zugewiesen</div>
      </div>
    `;
  }
  
  return `
    <div class="unassigned-list" data-resource-type="${resourceType}">
      ${resources.map(resource => renderUnassignedItem(resource, resourceType)).join('')}
    </div>
  `;
}

/**
 * Render unassigned resource item (draggable)
 */
function renderUnassignedItem(resource, resourceType) {
  let displayName = resource.name || resource.id;
  
  // Add additional info for vehicles/devices
  if (resourceType === 'VEHICLE' && resource.licensePlate) {
    displayName += ` (${resource.licensePlate})`;
  } else if (resourceType === 'DEVICE' && resource.serialNumber) {
    displayName += ` (${resource.serialNumber})`;
  }
  
  return `
    <div 
      class="unassigned-item resource-pill" 
      draggable="true"
      data-resource-type="${resourceType}"
      data-resource-id="${resource.id}"
      data-resource-name="${displayName}"
      title="Ziehen zum Zuweisen"
    >
      <span class="resource-pill__icon">${getResourceIcon(resourceType)}</span>
      <span class="resource-pill__name">${displayName}</span>
    </div>
  `;
}

/**
 * Get icon for resource type
 */
function getResourceIcon(resourceType) {
  switch (resourceType) {
    case 'WORKER':
      return '👤';
    case 'VEHICLE':
      return '🚗';
    case 'DEVICE':
      return '🔧';
    default:
      return '📋';
  }
}

