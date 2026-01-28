/**
 * Board – Ressourcenpanel (links)
 * Personal, Fahrzeuge, Geräte als Erstklassige Objekte mit Status.
 * Design: UX_NEU_DESIGN.md – Zone Ressourcen.
 */

import { getState } from '../../state/index.js';
import { getUnassignedResourcesForDate, getAssignedWorkerIdsOnDate, getActiveLocations } from '../../state/selectors.js';
import { formatDateLocal } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';

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
    if (status === 'urlaub') return { text: 'Urlaub', token: 'absent' };
    if (status === 'krank' || status === 'abwesend') return { text: 'Abwesend', token: 'absent' };
    const assignedIds = getAssignedWorkerIdsOnDate(date);
    if (assignedIds.has(String(resource.id))) return { text: 'Eingeplant', token: 'assigned' };
    return { text: 'Verfügbar', token: 'available' };
  }
  if (resourceType === 'LOCATION') {
    return { text: 'Verfügbar', token: 'available' };
  }
  const list = getUnassignedResourcesForDate(date, resourceType);
  const isAssigned = !list.some((r) => String(r.id) === String(resource.id));
  if (isAssigned) return { text: 'Eingeplant', token: 'assigned' };
  return { text: 'Verfügbar', token: 'available' };
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
  let emptyLabel = 'Kein Personal';

  if (context === 'WORKER') {
    let workers = (state.data.workers || []).filter((w) => (w.status || '').toLowerCase() === 'arbeitsbereit');
    workers = filterIndividualWorkers(workers, state.data.teams || []);
    if (query) workers = workers.filter((w) => (w.name || '').toLowerCase().includes(query));
    items = workers;
    title = 'Personal';
    emptyLabel = 'Keine Mitarbeiter';
  } else if (context === 'VEHICLE') {
    items = (state.data.vehicles || []).filter((v) => !query || (v.name || v.licensePlate || '').toLowerCase().includes(query));
    title = 'Fahrzeuge';
    emptyLabel = 'Keine Fahrzeuge';
  } else if (context === 'DEVICE') {
    items = (state.data.devices || []).filter((d) => !query || (d.name || d.serialNumber || '').toLowerCase().includes(query));
    title = 'Geräte';
    emptyLabel = 'Keine Geräte';
  } else if (context === 'LOCATION') {
    items = getActiveLocations().filter((loc) => !query || (loc.name || loc.code || loc.address || '').toLowerCase().includes(query));
    title = 'Einsatzorte';
    emptyLabel = 'Keine Einsatzorte';
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
        <span class="board-resource__status board-resource__status--${statusInfo.token}">${statusInfo.text}</span>
      </div>
    `;
  });

  return `
    <aside class="board-resources" aria-label="Ressourcen">
      <div class="board-resources__header">
        <h2 class="board-resources__title">${title}</h2>
        <div class="board-resources__tabs">
          <button type="button" class="board-tab ${context === 'WORKER' ? 'board-tab--active' : ''}" data-action="set-resource-context" data-resource-context="WORKER">Personal</button>
          <button type="button" class="board-tab ${context === 'VEHICLE' ? 'board-tab--active' : ''}" data-action="set-resource-context" data-resource-context="VEHICLE">Fahrzeuge</button>
          <button type="button" class="board-tab ${context === 'DEVICE' ? 'board-tab--active' : ''}" data-action="set-resource-context" data-resource-context="DEVICE">Geräte</button>
          <button type="button" class="board-tab ${context === 'LOCATION' ? 'board-tab--active' : ''}" data-action="set-resource-context" data-resource-context="LOCATION" id="btn-locations">📍 Einsatzorte</button>
        </div>
        ${context === 'LOCATION' ? '<button type="button" class="board-resources__manage-btn" id="btn-locations-manage" title="Einsatzorte verwalten">Verwalten</button>' : ''}
        <input type="text" class="board-resources__search input" data-role="resource-search" placeholder="Suchen…" value="${state.ui.resourceQuery || ''}" />
      </div>
      <div class="board-resources__list">
        ${resourceItems.length ? resourceItems.join('') : `<div class="board-resources__empty">${emptyLabel}</div>`}
      </div>
    </aside>
  `;
}
