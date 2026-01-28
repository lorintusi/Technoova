/**
 * Resource Sidebar
 * Shows resources based on context (Workers, Vehicles, Devices, Locations, Dispatch Items)
 */

import { getState } from '../../state/index.js';
import { getFilteredResourcesByContext, getResourceContext, getSelectedResource } from '../../state/selectors.js';
import { isAdmin } from '../../utils/permissions.js';

/**
 * Render resource sidebar
 * @param {object} options - Options object
 * @param {string} options.context - Resource context (optional, uses state if not provided)
 * @param {string} options.query - Search query (optional, uses state if not provided)
 */
export function renderResourceSidebar(options = {}) {
  const state = getState();
  const context = options.context || getResourceContext();
  const query = options.query !== undefined ? options.query : (state.ui.resourceQuery || '');
  
  // Get filtered resources
  const { items, count } = getFilteredResourcesByContext(context, query);
  
  // Get context metadata
  const contextMeta = getContextMetadata(context);
  const currentUser = state.data.currentUser;
  const userIsAdmin = isAdmin(currentUser);
  
  return `
    <div class="resource-sidebar" data-resource-context="${context}">
      <!-- Header -->
      <div class="resource-sidebar__header">
        <div class="resource-sidebar__header-content">
          <span class="resource-sidebar__icon">${contextMeta.icon}</span>
          <div class="resource-sidebar__header-text">
            <h3 class="resource-sidebar__title">${contextMeta.title}</h3>
            <span class="resource-sidebar__count">${count}</span>
          </div>
        </div>
      </div>
      
      <!-- Search -->
      <div class="resource-sidebar__search">
        <input 
          type="text" 
          class="input input--search" 
          data-role="resource-search"
          placeholder="${contextMeta.searchPlaceholder}" 
          value="${query}"
        />
      </div>
      
      <!-- List -->
      <div class="resource-sidebar__list">
        ${renderResourceList(items, context, userIsAdmin)}
      </div>
    </div>
  `;
}

/**
 * Get context metadata
 */
function getContextMetadata(context) {
  const meta = {
    'WORKER': {
      icon: '👤',
      title: 'Personal',
      searchPlaceholder: 'Personal suchen...',
      emptyTitle: 'Kein Personal',
      emptyText: 'Keine Mitarbeiter verfügbar',
      addLabel: '+ Personal hinzufügen',
      addAction: 'open-management-tab',
      addActionParam: 'users'
    },
    'VEHICLE': {
      icon: '🚗',
      title: 'Fahrzeuge',
      searchPlaceholder: 'Fahrzeuge suchen...',
      emptyTitle: 'Keine Fahrzeuge',
      emptyText: 'Keine Fahrzeuge verfügbar',
      addLabel: '+ Fahrzeug hinzufügen',
      addAction: 'open-management-tab',
      addActionParam: 'vehicles'
    },
    'DEVICE': {
      icon: '🔧',
      title: 'Geräte',
      searchPlaceholder: 'Geräte suchen...',
      emptyTitle: 'Keine Geräte',
      emptyText: 'Keine Geräte verfügbar',
      addLabel: '+ Gerät hinzufügen',
      addAction: 'open-management-tab',
      addActionParam: 'devices'
    },
    'LOCATION': {
      icon: '📍',
      title: 'Einsatzorte',
      searchPlaceholder: 'Einsatzorte suchen...',
      emptyTitle: 'Keine Einsatzorte',
      emptyText: 'Keine Einsatzorte verfügbar',
      addLabel: '+ Einsatzort hinzufügen',
      addAction: 'open-management-tab',
      addActionParam: 'locations'
    },
    'DISPATCH': {
      icon: '📋',
      title: 'Einsätze',
      searchPlaceholder: 'Einsätze suchen...',
      emptyTitle: 'Keine Einsätze',
      emptyText: 'Keine Einsätze verfügbar',
      addLabel: '+ Einsatz hinzufügen',
      addAction: 'open-create-dispatch-item',
      addActionParam: null
    }
  };
  
  return meta[context] || meta['WORKER'];
}

/**
 * Render resource list
 */
function renderResourceList(items, context, userIsAdmin) {
  if (items.length === 0) {
    const meta = getContextMetadata(context);
    return `
      <div class="resource-sidebar__empty">
        <div class="resource-sidebar__empty-icon">${meta.icon}</div>
        <div class="resource-sidebar__empty-title">${meta.emptyTitle}</div>
        <div class="resource-sidebar__empty-text">${meta.emptyText}</div>
        ${userIsAdmin ? `
          <button class="btn btn--primary btn--sm" 
                  data-action="${meta.addAction}" 
                  ${meta.addActionParam ? `data-action-param="${meta.addActionParam}"` : ''}
                  style="margin-top: var(--spacing);">
            ${meta.addLabel}
          </button>
        ` : ''}
      </div>
    `;
  }
  
  return `
    <div class="resource-list" data-resource-context="${context}">
      ${items.map(item => renderResourceItem(item, context)).join('')}
    </div>
  `;
}

/**
 * Render resource item (card/row)
 */
function renderResourceItem(item, context) {
  const state = getState();
  const selected = getSelectedResource();
  const isSelected = selected && selected.type === context && String(selected.id) === String(item.id);
  
  let title = item.name || item.title || item.code || item.id;
  let meta = '';
  let icon = getResourceIcon(context);
  
  // Context-specific rendering
  switch (context) {
    case 'WORKER':
      meta = item.role ? `<span class="resource-item__meta">${item.role}</span>` : '';
      break;
    case 'VEHICLE':
      if (item.licensePlate) {
        meta = `<span class="resource-item__meta">${item.licensePlate}</span>`;
      }
      if (item.status) {
        meta += `<span class="resource-item__status resource-item__status--${item.status}">${item.status}</span>`;
      }
      break;
    case 'DEVICE':
      if (item.serialNumber) {
        meta = `<span class="resource-item__meta">${item.serialNumber}</span>`;
      }
      if (item.status) {
        meta += `<span class="resource-item__status resource-item__status--${item.status}">${item.status}</span>`;
      }
      break;
    case 'LOCATION':
      if (item.address) {
        meta = `<span class="resource-item__meta">${item.address}</span>`;
      }
      if (item.code && item.code !== title) {
        title = `${item.code} - ${title}`;
      }
      break;
    case 'DISPATCH':
      if (item.start_date && item.end_date) {
        const startStr = new Date(item.start_date + 'T00:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
        const endStr = new Date(item.end_date + 'T00:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
        meta = `<span class="resource-item__meta">${startStr} – ${endStr}</span>`;
      } else if (item.date) {
        const dateObj = new Date(item.date + 'T00:00:00');
        meta = `<span class="resource-item__meta">${dateObj.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}</span>`;
      }
      if (item.startTime && item.endTime) {
        meta += `<span class="resource-item__meta">${item.startTime} - ${item.endTime}</span>`;
      } else if ((item.allDay || item.all_day) && !item.start_date) {
        meta += `<span class="resource-item__meta">Ganztägig</span>`;
      }
      break;
  }
  
  // Determine if draggable (only for WORKER, VEHICLE, DEVICE)
  const isDraggable = ['WORKER', 'VEHICLE', 'DEVICE'].includes(context);
  
  return `
    <div 
      class="resource-item ${isDraggable ? 'resource-item--draggable' : ''} ${isSelected ? 'resource-item--active' : ''}" 
      ${isDraggable ? 'draggable="true"' : ''}
      data-action="select-resource"
      data-type="${context}"
      data-id="${item.id}"
      data-resource-context="${context}"
      data-resource-id="${item.id}"
      data-resource-name="${title}"
      ${isDraggable ? 'data-drag-type="' + context + '" data-drag-id="' + item.id + '"' : ''}
      ${isDraggable ? 'title="Ziehen zum Zuweisen"' : 'title="Klicken zum Auswählen"'}
    >
      <span class="resource-item__icon">${icon}</span>
      <div class="resource-item__content">
        <div class="resource-item__title">${title}</div>
        ${meta ? `<div class="resource-item__meta-row">${meta}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Get icon for resource type
 */
function getResourceIcon(context) {
  const icons = {
    'WORKER': '👤',
    'VEHICLE': '🚗',
    'DEVICE': '🔧',
    'LOCATION': '📍',
    'DISPATCH': '📋'
  };
  return icons[context] || '📋';
}

