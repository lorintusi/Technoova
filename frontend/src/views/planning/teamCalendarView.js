/**
 * Team Calendar View
 * Shows all workers' planning blocks in a matrix
 */

import { getState, getPlanningEntriesForWeek } from '../../state/index.js';
import { formatDateLocal } from '../../utils/format.js';

/**
 * Get week start date (Monday)
 */
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Generate week days
 */
function generateWeekDays(weekStart) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      dateStr: formatDateLocal(date),
      dayName: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i],
      dayNum: date.getDate()
    });
  }
  return days;
}

/**
 * Get worker initials
 */
function getWorkerInitials(worker) {
  if (!worker || !worker.name) return '??';
  return worker.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/**
 * Render team calendar view
 */
export function renderTeamCalendarView() {
  const state = getState();
  const calendarDate = state.ui.calendarDate || new Date();
  const weekStart = getWeekStartDate(calendarDate);
  const weekDays = generateWeekDays(weekStart);
  const weekStartStr = formatDateLocal(weekStart);
  
  // Get all individual workers (exclude teams)
  const workers = state.data.workers.filter(w => {
    if (w.role === 'Team' || w.role === 'Montageteam') return false;
    const teamNames = new Set(state.data.teams.map(t => t.name));
    return !teamNames.has(w.name);
  });
  
  // Get planning entries for all workers
  const allPlanningEntries = [];
  workers.forEach(worker => {
    const entries = getPlanningEntriesForWeek(weekStartStr, worker.id);
    entries.forEach(entry => {
      allPlanningEntries.push({ ...entry, workerId: worker.id, workerName: worker.name });
    });
  });
  
  // Group entries by day and worker
  const entriesByDayAndWorker = {};
  weekDays.forEach(day => {
    entriesByDayAndWorker[day.dateStr] = {};
    workers.forEach(worker => {
      entriesByDayAndWorker[day.dateStr][worker.id] = allPlanningEntries.filter(
        e => e.date === day.dateStr && e.workerId === worker.id
      );
    });
  });
  
  return `
    <div class="team-calendar-view">
      <div class="team-calendar-view__header">
        <h3>Teamkalender - KW ${getWeekNumber(weekStart)}</h3>
        <button class="btn-secondary" data-action="close-team-calendar">Zurück</button>
      </div>
      
      <div class="team-calendar-view__grid">
        <div class="team-calendar-view__worker-column">
          <div class="team-calendar-view__worker-header">Mitarbeiter</div>
          ${workers.map(worker => `
            <div class="team-calendar-view__worker-row" data-worker-id="${worker.id}">
              <div class="team-calendar-view__worker-initials">${getWorkerInitials(worker)}</div>
              <div class="team-calendar-view__worker-name">${worker.name}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="team-calendar-view__days-container">
          ${weekDays.map(day => `
            <div class="team-calendar-view__day-column" data-date="${day.dateStr}">
              <div class="team-calendar-view__day-header">
                <div class="team-calendar-view__day-name">${day.dayName}</div>
                <div class="team-calendar-view__day-number">${day.dayNum}</div>
              </div>
              ${workers.map(worker => {
                const entries = entriesByDayAndWorker[day.dateStr][worker.id] || [];
                return `
                  <div class="team-calendar-view__cell" data-worker-id="${worker.id}" data-date="${day.dateStr}">
                    ${entries.map(entry => {
                      const location = state.data.locations.find(l => l.id === entry.locationId);
                      const locationName = location ? (location.code || location.address || '—') : '—';
                      const statusClass = entry.status === 'CONFIRMED' ? 'team-block--confirmed' : 'team-block--planned';
                      const statusLabel = entry.status === 'CONFIRMED' ? '✓' : '⏳';
                      const sourceLabel = entry.source === 'SELF_PLAN' ? '<span class="team-block__source-label">SELF</span>' : '<span class="team-block__source-label">ADMIN</span>';
                      const tooltip = `${locationName} - ${entry.category || 'Allgemein'} (${entry.source === 'SELF_PLAN' ? 'Selbst geplant' : 'Admin geplant'})`;
                      return `
                        <div class="team-block ${statusClass}" title="${tooltip}">
                          <span class="team-block__initials">${getWorkerInitials(worker)}</span>
                          <span class="team-block__category">${entry.category || 'Allg'}</span>
                          <span class="team-block__status-badge">${statusLabel}</span>
                          ${sourceLabel}
                        </div>
                      `;
                    }).join('')}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Get week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

