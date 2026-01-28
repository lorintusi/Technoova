/**
 * Board – Kontextpanel (rechts)
 * Ausgewählter Einsatz oder „Nicht im Einsatz“ für gewähltes Datum.
 * Design: UX_NEU_DESIGN.md – Zone Kontext.
 */

import { getState } from '../../state/index.js';
import { getUnassignedResourcesForDate } from '../../state/selectors.js';
import { formatDateLocal } from '../../utils/format.js';

function filterIndividualWorkers(workers, teams = []) {
  const teamNames = new Set((teams || []).map((t) => t.name));
  return (workers || []).filter((w) => w.role !== 'Team' && w.role !== 'Montageteam' && !teamNames.has(w.name));
}

export function renderBoardContext() {
  const state = getState();
  const date = state.ui.activeDate || (state.ui.calendarDate ? formatDateLocal(new Date(state.ui.calendarDate)) : null) || formatDateLocal(new Date());
  const selectedResource = state.ui.selectedResource;
  const selectedSlot = state.ui.selectedSlot || null;

  const dateObj = new Date(date + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const unassignedWorkers = getUnassignedResourcesForDate(date, 'WORKER');
  const workersToShow = filterIndividualWorkers(unassignedWorkers, state.data.teams || []);

  let content = '';
  if (selectedSlot && selectedSlot.assignmentId && selectedSlot.date) {
    const assignment = (state.data.assignments || []).find((a) => a.id == selectedSlot.assignmentId);
    const location = assignment ? (state.data.locations || []).find((l) => l.id === assignment.location_id) : null;
    content = `
      <div class="board-context__slot">
        <h3 class="board-context__heading">Einsatz</h3>
        <p class="board-context__slot-title">${assignment?.title || '—'}</p>
        <p class="board-context__meta">${location ? (location.code || location.address) : '—'}</p>
        <p class="board-context__date">${dateLabel}</p>
      </div>
    `;
  } else {
    content = `
      <div class="board-context__unassigned">
        <h3 class="board-context__heading">Nicht im Einsatz</h3>
        <p class="board-context__date-label">${dateLabel}</p>
        <div class="board-context__list">
          ${workersToShow.length ? workersToShow.map((w) => `
            <div class="board-context__resource">
              <span class="board-context__resource-icon">👤</span>
              <span class="board-context__resource-name">${w.name || ''}</span>
              <span class="board-context__resource-role">${w.role || ''}</span>
            </div>
          `).join('') : '<p class="board-context__empty">Alle verfügbaren Mitarbeiter sind eingeplant.</p>'}
        </div>
      </div>
    `;
  }

  return `
    <aside class="board-context" aria-label="Kontext">
      <div class="board-context__header">
        <h2 class="board-context__title">Kontext</h2>
      </div>
      <div class="board-context__body">
        ${content}
      </div>
    </aside>
  `;
}
