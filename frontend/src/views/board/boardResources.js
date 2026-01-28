/**
 * Board – Ressourcenpanel (links)
 * Personal, Fahrzeuge, Geräte als Erstklassige Objekte mit Status.
 * Design: UX_NEU_DESIGN.md – Zone Ressourcen.
 */

import { getState } from '../../state/index.js';
import { getUnassignedResourcesForDate, getAssignedWorkerIdsOnDate, getActiveLocations } from '../../state/selectors.js';
import { formatDateLocal } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';
import { renderEmptyState } from '../emptyStates.js';

function filterIndividualWorkers(workers, teams = []) {
  const teamNames = new Set((teams || []).map((t) => t.name));
  return (workers || []).filter((w) => w.role !== 'Team' && w.role !== 'Montageteam' && !teamNames.has(w.name));
}

/**
 * Status-Label für Ressource an einem Datum
 */
function getResourceStatusLabel(resource, resourceType, date, state) {
  if (resourceType === 'WORKER') {
    const status = (resource.status || '').toLowerCase();
    if (status === 'urlaub') return { text: 'Urlaub', token: 'absent', icon: '🌴' };
    if (status === 'krank' || status === 'abwesend') return { text: 'Abwesend', token: 'absent', icon: '🏥' };
    const assignedIds = getAssignedWorkerIdsOnDate(date);
    if (assignedIds.has(String(resource.id))) return { text: 'Eingeplant', token: 'assigned', icon: '📅' };
    return { text: 'Verfügbar', token: 'available', icon: '✓' };
  }
  if (resourceType === 'LOCATION') {
    return { text: 'Verfügbar', token: 'available', icon: '✓' };
  }
  const list = getUnassignedResourcesForDate(date, resourceType);
  const isAssigned = !list.some((r) => String(r.id) === String(resource.id));
  if (isAssigned) return { text: 'Eingeplant', token: 'assigned', icon: '📅' };
  return { text: 'Verfügbar', token: 'available', icon: '✓' };
}

export function renderBoardResources() {
  const state = getState();
  const context = state.ui.resourceContext || 'WORKER';
  const date = state.ui.activeDate || (state.ui.calendarDate ? formatDateLocal(new Date(state.ui.calendarDate)) : null) || formatDateLocal(new Date());
  const query = (state.ui.resourceQuery || '').toLowerCase().trim();
  const selected = state.ui.selectedResource;
  const userIsAdmin = isAdmin(state.data.currentUser);

  let items = [];
  let title = 'Personal';
  let emptyStateType = 'no-workers';

  if (context === 'WORKER') {
    let workers = (state.data.workers || []).filter((w) => (w.status || '').toLowerCase() === 'arbeitsbereit');
    workers = filterIndividualWorkers(workers, state.data.teams || []);
    if (query) workers = workers.filter((w) => (w.name || '').toLowerCase().includes(query));
    items = workers;
    title = 'Personal';
    emptyStateType = query ? 'no-results' : 'no-workers';
  } else if (context === 'VEHICLE') {
    items = (state.data.vehicles || []).filter((v) => !query || (v.name || v.licensePlate || '').toLowerCase().includes(query));
    title = 'Fahrzeuge';
    emptyStateType = query ? 'no-results' : 'no-vehicles';
  } else if (context === 'DEVICE') {
    items = (state.data.devices || []).filter((d) => !query || (d.name || d.serialNumber || '').toLowerCase().includes(query));
    title = 'Geräte';
    emptyStateType = query ? 'no-results' : 'no-devices';
  } else if (context === 'LOCATION') {
    items = getActiveLocations().filter((loc) => !query || (loc.name || loc.code || loc.address || '').toLowerCase().includes(query));
    title = 'Einsatzorte';
    emptyStateType = query ? 'no-results' : 'no-locations';
  }

  const resourceItems = items.map((item) => {
    const statusInfo = getResourceStatusLabel(item, context, date, state);
    const isSelected = selected && selected.type === context && String(selected.id) === String(item.id);
    const displayName = item.name || item.title || item.code || `#${item.id}`;
    const meta = context === 'WORKER' ? (item.role || '') : context === 'LOCATION' ? (item.project_number ?? item.projektnummer ?? '') : (item.licensePlate || item.serialNumber || '');

    return `
      <div
        class="board-resource board-resource--${statusInfo.token} ${isSelected ? 'board-resource--selected' : ''}"
        data-action="select-board-resource"
        data-resource-type="${context}"
        data-resource-id="${item.id}"
        data-resource-name="${displayName}"
        draggable="true"
        data-drag-type="${context}"
        data-drag-id="${item.id}"
      >
        <span class="board-resource__icon">${context === 'WORKER' ? '👤' : context === 'VEHICLE' ? '🚗' : context === 'LOCATION' ? '📍' : '🔧'}</span>
        <div class="board-resource__body">
          <span class="board-resource__name">${displayName}</span>
          ${meta ? `<span class="board-resource__meta">${meta}</span>` : ''}
        </div>
        <span class="board-resource__status board-resource__status--${statusInfo.token}">
          ${statusInfo.icon ? `<span class="board-resource__status-icon">${statusInfo.icon}</span>` : ''}
          ${statusInfo.text}
        </span>
      </div>
    `;
  });

  // Separate Locations from Resources for better UX hierarchy
  const isLocationContext = context === 'LOCATION';
  const resourceTabClass = isLocationContext ? 'board-resources--location-mode' : 'board-resources--resource-mode';

  return `
    <aside class="board-resources ${resourceTabClass}" aria-label="Planbare Objekte">
      <div class="board-resources__header">
        <div class="board-resources__title-row">
          <h2 class="board-resources__title">
            ${isLocationContext ? '📍 Einsatzorte' : '📦 Ressourcen'}
          </h2>
          <span class="board-resources__count">${items.length}</span>
        </div>
        
        <!-- Context Switcher -->
        <div class="board-resources__context-switcher">
          <div class="board-resources__context-group board-resources__context-group--locations">
            <button type="button" 
              class="board-context-btn ${context === 'LOCATION' ? 'board-context-btn--active' : ''}" 
              data-action="set-resource-context" 
              data-resource-context="LOCATION"
              title="Einsatzorte">
              <span class="board-context-btn__icon">📍</span>
              <span class="board-context-btn__label">Einsatzorte</span>
            </button>
          </div>
          <div class="board-resources__divider-line"></div>
          <div class="board-resources__context-group board-resources__context-group--resources">
            <button type="button" 
              class="board-context-btn ${context === 'WORKER' ? 'board-context-btn--active' : ''}" 
              data-action="set-resource-context" 
              data-resource-context="WORKER"
              title="Personal">
              <span class="board-context-btn__icon">👤</span>
              <span class="board-context-btn__label">Personal</span>
            </button>
            <button type="button" 
              class="board-context-btn ${context === 'VEHICLE' ? 'board-context-btn--active' : ''}" 
              data-action="set-resource-context" 
              data-resource-context="VEHICLE"
              title="Fahrzeuge">
              <span class="board-context-btn__icon">🚗</span>
              <span class="board-context-btn__label">Fahrzeuge</span>
            </button>
            <button type="button" 
              class="board-context-btn ${context === 'DEVICE' ? 'board-context-btn--active' : ''}" 
              data-action="set-resource-context" 
              data-resource-context="DEVICE"
              title="Geräte">
              <span class="board-context-btn__icon">🔧</span>
              <span class="board-context-btn__label">Geräte</span>
            </button>
          </div>
        </div>
        
        <input type="text" class="board-resources__search input" data-role="resource-search" placeholder="Suchen…" value="${state.ui.resourceQuery || ''}" />
      </div>
      <div class="board-resources__list">
        ${resourceItems.length ? resourceItems.join('') : renderEmptyState(emptyStateType, { query })}
      </div>
    </aside>
  `;
}
