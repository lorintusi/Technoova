/**
 * Planning shell view
 * Main planning interface
 */

import { getState, setSelectedPlanningWorkerId, setActiveDate } from '../../state/index.js';
import { canViewTeamCalendar, isAdmin } from '../../utils/permissions.js';
import { renderPlanningSelector } from './planningSelector.js';
import { renderWeekView } from './weekView.js';
import { renderWeekViewDispatch } from './weekViewDispatch.js';
import { renderDayView } from './dayView.js';
import { renderMonthViewDispatch } from './monthViewDispatch.js';
import { renderTeamCalendarView } from './teamCalendarView.js';
import { renderResourceSidebar } from './resourceSidebar.js';
import { renderUnassignedPanel } from './unassignedPanel.js';
import { getUnconfirmedDaysCurrentWeek, getUnconfirmedDaysLastWeek } from '../../utils/unconfirmedDays.js';
import { formatDateLocal } from '../../utils/format.js';

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
 * Render planning shell
 */
export function renderPlanningShell() {
  const state = getState();
  const showSidebar = false; // Sidebar immer ausblenden
  const viewAll = state.data.currentUser && state.data.currentUser.permissions && state.data.currentUser.permissions.includes("view_all");
  
  // Filter workers based on permissions and exclude teams
  let workersToShow = state.data.workers.filter((worker) => worker.status === "Arbeitsbereit");
  workersToShow = filterIndividualWorkers(workersToShow, state.data.teams);
  if (!viewAll && state.data.currentUser && state.data.currentUser.workerId) {
    workersToShow = workersToShow.filter(w => w.id === state.data.currentUser.workerId);
  }
  
  // Filter locations based on permissions
  let locationsToShow = state.data.locations;
  if (!viewAll && state.data.currentUser && state.data.currentUser.workerId) {
    const worker = state.data.workers.find(w => w.id === state.data.currentUser.workerId);
    if (worker) {
      const workerLocations = new Set();
      (worker.availability || []).forEach(slot => {
        const loc = state.data.locations.find(l => l.address === slot.site || l.code === slot.site);
        if (loc) workerLocations.add(loc.id);
      });
      locationsToShow = state.data.locations.filter(l => workerLocations.has(l.id));
    } else {
      locationsToShow = [];
    }
  }
  
  // Render active view based on calendarViewMode
  let activeViewContent = '';
  if (state.ui.showTeamCalendar) {
    activeViewContent = renderTeamCalendarView();
  } else {
    switch (state.ui.calendarViewMode) {
      case 'week':
        activeViewContent = renderWeekViewDispatch();
        break;
      case 'day':
        activeViewContent = renderDayView();
        break;
      case 'month':
        activeViewContent = renderMonthViewDispatch();
        break;
      default:
        // Fallback to dispatch view if unknown mode
        activeViewContent = renderWeekViewDispatch();
    }
  }
  
  // Render unconfirmed days overview (admin only)
  const userIsAdmin = isAdmin();
  
  let unconfirmedOverview = '';
  if (userIsAdmin && state.ui.activeView === 'calendar') {
    const unconfirmedCurrentWeek = getUnconfirmedDaysCurrentWeek();
    const unconfirmedLastWeek = getUnconfirmedDaysLastWeek();
    const totalUnconfirmed = unconfirmedCurrentWeek.length + unconfirmedLastWeek.length;
    
    if (totalUnconfirmed > 0) {
      unconfirmedOverview = `
        <div class="unconfirmed-overview">
          <div class="unconfirmed-overview__header">
            <h3>⏳ Unbestätigte Tage</h3>
            <span class="unconfirmed-overview__count">${totalUnconfirmed} Mitarbeiter</span>
          </div>
          <div class="unconfirmed-overview__list">
            ${[...unconfirmedCurrentWeek, ...unconfirmedLastWeek].slice(0, 10).map(item => {
              const firstDate = item.dates[0];
              return `
                <div class="unconfirmed-item" data-action="open-unconfirmed-day" data-worker-id="${item.workerId}" data-date="${firstDate}">
                  <div class="unconfirmed-item__worker">${item.workerName}</div>
                  <div class="unconfirmed-item__info">
                    <span class="unconfirmed-item__count">${item.count} Block${item.count > 1 ? 'e' : ''}</span>
                    <span class="unconfirmed-item__dates">${item.dates.length} Tag${item.dates.length > 1 ? 'e' : ''}</span>
                  </div>
                  <button class="btn-link" data-action="open-unconfirmed-day" data-worker-id="${item.workerId}" data-date="${firstDate}">Öffnen</button>
                </div>
              `;
            }).join('')}
            ${totalUnconfirmed > 10 ? `<div class="unconfirmed-overview__more">+ ${totalUnconfirmed - 10} weitere</div>` : ''}
          </div>
        </div>
      `;
    }
  }
  
  // Check if sidebar should be collapsed (from state or default)
  const sidebarCollapsed = state.ui.planningSidebarCollapsed || false;
  const resourceContext = state.ui.resourceContext || 'WORKER'; // WORKER, VEHICLE, DEVICE, LOCATION, DISPATCH
  
  return `
    <div class="dispo">
      <!-- Dock: Left Navigation -->
      <nav class="dispo__dock dock">
        <button class="dock__btn ${resourceContext === 'WORKER' ? 'dock__btn--active' : ''}" 
                data-resource-context="WORKER" 
                data-action="set-resource-context"
                title="Personal">
          <span class="dock__icon">👤</span>
        </button>
        <button class="dock__btn ${resourceContext === 'VEHICLE' ? 'dock__btn--active' : ''}" 
                data-resource-context="VEHICLE" 
                data-action="set-resource-context"
                title="Fahrzeuge">
          <span class="dock__icon">🚗</span>
        </button>
        <button class="dock__btn ${resourceContext === 'DEVICE' ? 'dock__btn--active' : ''}" 
                data-resource-context="DEVICE" 
                data-action="set-resource-context"
                title="Geräte">
          <span class="dock__icon">🔧</span>
        </button>
        <button class="dock__btn ${resourceContext === 'LOCATION' ? 'dock__btn--active' : ''}" 
                data-resource-context="LOCATION" 
                data-action="set-resource-context"
                title="Einsatzorte">
          <span class="dock__icon">📍</span>
        </button>
        <button class="dock__btn ${resourceContext === 'DISPATCH' ? 'dock__btn--active' : ''}" 
                data-resource-context="DISPATCH" 
                data-action="set-resource-context"
                title="Einsätze">
          <span class="dock__icon">📋</span>
        </button>
      </nav>
      
      <!-- Left Sidebar: Resources -->
      <aside class="dispo__sidebar panel ${sidebarCollapsed ? 'panel--collapsed' : ''}" id="planning-sidebar">
        <div class="panel__header">
          <h3 class="panel__title">${getResourceContextTitle(resourceContext)}</h3>
          <button class="panel__toggle" id="btn-sidebar-toggle" data-action="toggle-sidebar" title="Sidebar ausblenden">
            <span class="btn-icon">◀</span>
          </button>
        </div>
        <div class="panel__body" id="resourceSidebarRoot">
          ${renderResourceSidebar({ context: resourceContext })}
        </div>
      </aside>
      
      <!-- Sidebar Dock (when collapsed) -->
      ${sidebarCollapsed ? `
        <div class="dispo__dock-toggle">
          <button class="dock-toggle__btn" id="btn-sidebar-dock-toggle" data-action="toggle-sidebar" title="Sidebar einblenden">
            <span class="btn-icon">▶</span>
          </button>
        </div>
      ` : ''}
      
      <!-- Main Content Area -->
      <main class="dispo__main planning-main">
        ${unconfirmedOverview}
        
        <!-- Viaplano Action Bar -->
        ${userIsAdmin ? `
          <div class="planning-action-bar" style="padding: 1rem; display: flex; gap: 0.5rem; border-bottom: 1px solid #e0e0e0;">
            <button class="btn btn--primary" id="btn-add-assignment" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
              <span class="btn-icon">+</span>
              <span class="btn-text">Einsatz</span>
            </button>
            <button class="btn btn--secondary" id="btn-add-planning" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
              <span class="btn-icon">👤</span>
              <span class="btn-text">Personal einplanen</span>
            </button>
          </div>
        ` : ''}
        
        <div class="planning-main__body">
          ${activeViewContent}
        </div>
      </main>
      
      <!-- Right Panel: Unassigned -->
      <aside class="dispo__right panel ${state.ui.rightPanelCollapsed ? 'panel--right-collapsed' : ''}" id="planning-right-panel">
        ${!state.ui.rightPanelCollapsed ? `
          <div class="panel__header">
            <h3 class="panel__title">Nicht im Einsatz</h3>
            <button class="panel__toggle" data-action="toggle-right-panel" title="Panel einklappen">
              <span class="btn-icon">▶</span>
            </button>
          </div>
          <div class="panel__body">
            ${renderUnassignedPanel()}
          </div>
        ` : `
          <button class="panel__toggle panel__toggle--collapsed-right" data-action="toggle-right-panel" title="Panel aufklappen">
            <span class="btn-icon">◀</span>
          </button>
        `}
      </aside>
      
    </div>
  `;
}

/**
 * Get resource context title
 */
function getResourceContextTitle(context) {
  const titles = {
    'WORKER': 'Personal',
    'VEHICLE': 'Fahrzeuge',
    'DEVICE': 'Geräte',
    'LOCATION': 'Einsatzorte',
    'DISPATCH': 'Einsätze'
  };
  return titles[context] || 'Ressourcen';
}

