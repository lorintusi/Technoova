/**
 * Planning Selector Component
 * "Planen für: [Dropdown]" selector for Admin
 */

import { getState, getPlanningForWorkerId, setPlanningForWorker, setActiveDate } from '../../state/index.js';
import { isAdmin } from '../../utils/permissions.js';

/**
 * Filter individual workers (exclude teams)
 */
function filterIndividualWorkers(workers, teams) {
  const teamNames = new Set(teams.map(t => t.name));
  return workers.filter((worker) => {
    if (worker.role === "Team" || worker.role === "Montageteam") {
      return false;
    }
    return !teamNames.has(worker.name);
  });
}

/**
 * Render planning selector (Planen für: Dropdown)
 */
export function renderPlanningSelector() {
  const state = getState();
  const currentUser = state.data.currentUser;
  
  if (!currentUser) return '';
  
  const userIsAdmin = isAdmin();
  
  // Get workers to show
  let workersToShow = (state.data.workers || []).filter(w => w.status === 'Arbeitsbereit');
  workersToShow = filterIndividualWorkers(workersToShow, state.data.teams || []);
  
  // Get current selection
  const planningForWorkerId = getPlanningForWorkerId();
  const activeWorkerId = currentUser.workerId || currentUser.worker_id || null;
  const selectedWorkerId = planningForWorkerId || activeWorkerId;
  
  // For non-admin, show readonly (own worker) - "Ich"
  if (!userIsAdmin) {
    const ownWorker = workersToShow.find(w => w.id === activeWorkerId);
    if (!ownWorker) {
      // No worker found - show hint
      return `
        <div class="planning-selector">
          <label class="planning-selector__label">Planen für:</label>
          <div class="planning-selector__value planning-selector__value--error">Kein Mitarbeiter zugewiesen</div>
        </div>
      `;
    }
    
    return `
      <div class="planning-selector">
        <label class="planning-selector__label">Planen für:</label>
        <div class="planning-selector__value">Ich (${ownWorker.name})</div>
      </div>
    `;
  }
  
  // For admin, show dropdown
  if (userIsAdmin && workersToShow.length === 0) {
    return `
      <div class="planning-selector">
        <label class="planning-selector__label" for="planning-worker-select">Planen für:</label>
        <select class="planning-selector__select" id="planning-worker-select" disabled>
          <option value="">Keine Mitarbeiter vorhanden</option>
        </select>
        <small class="planning-selector__hint">Bitte zuerst Mitarbeiter in der Verwaltung anlegen</small>
      </div>
    `;
  }
  
  return `
    <div class="planning-selector">
      <label class="planning-selector__label" for="planning-worker-select">Planen für:</label>
      <select class="planning-selector__select" id="planning-worker-select" data-action="planning-worker-select">
        <option value="">-- Bitte wählen --</option>
        ${workersToShow.map(worker => `
          <option value="${worker.id}" ${worker.id === selectedWorkerId ? 'selected' : ''}>
            ${worker.name}${worker.role ? ` (${worker.role})` : ''}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

