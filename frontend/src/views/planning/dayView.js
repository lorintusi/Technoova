/**
 * Day View with Dispatch Cards and Confirm Button
 */

import { 
  getState, 
  getPlanningEntriesForDay, 
  getActiveWorkerId, 
  getActiveUserId, 
  getActiveUser,
  getDispatchItemsForWorkerDay,
  getDispatchAssignments
} from '../../state/index.js';
import { getDayViewMode } from '../../state/selectors.js';
import { canConfirmDay } from '../../utils/permissions.js';
import { formatDateForDisplay, getDayName } from '../../utils/format.js';
import { entryHours } from '../../utils/time.js';
import { formatDateLocal } from '../../utils/format.js';
import { showLoadingState, showEmpty, showError } from '../../utils/loadingStates.js';
import { renderDispatchCard } from './dispatchCard.js';
import { renderDayGrid } from './dayViewGrid.js';
import { renderCalendarHeader } from './calendarHeader.js';

/**
 * Render day view with planning blocks and confirm button
 */
export function renderDayView() {
  const state = getState();
  const selectedDay = state.ui.selectedDay || state.workflow.selectedDate || new Date();
  
  let date;
  if (selectedDay instanceof Date) {
    date = selectedDay;
  } else if (typeof selectedDay === 'string') {
    date = new Date(selectedDay + 'T00:00:00');
  } else {
    date = new Date();
  }
  
  const dateStr = formatDateLocal(date);
  const dayName = getDayName(date);
  const dayViewMode = getDayViewMode();
  
  // Get active worker/user
  const activeWorkerId = getActiveWorkerId();
  const activeUserId = getActiveUserId();
  const viewWorkerId = activeWorkerId || activeUserId;
  
  if (!viewWorkerId) {
    return '<div class="day-view"><p>Bitte wählen Sie einen Mitarbeiter aus.</p></div>';
  }
  
  // Get dispatch items for this day and worker
  const dispatchItems = getDispatchItemsForWorkerDay(dateStr, viewWorkerId);
  
  // Get time entries for this day
  const timeEntries = (state.data.timeEntries || []).filter(entry => {
    if (entry.entry_date !== dateStr) return false;
    if (activeWorkerId) return entry.worker_id === activeWorkerId;
    return entry.user_id === activeUserId;
  });
  
  // Check if there are PLANNED dispatch items that can be confirmed
  const hasPlannedItems = dispatchItems.some(item => item.status === 'PLANNED');
  const allConfirmed = dispatchItems.length > 0 && dispatchItems.every(item => item.status === 'CONFIRMED');
  
  // Check if time entries already exist for all dispatch items (idempotent check)
  const hasTimeEntriesForAllItems = dispatchItems.length > 0 && dispatchItems.every(item => {
    return timeEntries.some(te => {
      const meta = te.meta || {};
      return meta.sourceDispatchItemId === item.id;
    });
  });
  
  // Button should be disabled if:
  // - No planned items
  // - All items already have time entries (already confirmed)
  const canConfirm = hasPlannedItems && !hasTimeEntriesForAllItems && canConfirmDay(null, viewWorkerId, dateStr);
  
  // Calculate totals from dispatch items
  const plannedHours = dispatchItems
    .filter(item => item.status === 'PLANNED')
    .reduce((sum, item) => {
      if (item.allDay || item.all_day) return sum + 8.5;
      const start = item.startTime || item.start_time || '08:00';
      const end = item.endTime || item.end_time || '17:00';
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const minutes = (eh * 60 + em) - (sh * 60 + sm);
      return sum + (minutes / 60);
    }, 0);
  
  const confirmedHours = timeEntries
    .filter(e => e.status === 'CONFIRMED')
    .reduce((sum, e) => sum + entryHours(e), 0);
  
  return `
    <div class="day-view day-view--planning">
      ${renderCalendarHeader({ viewMode: 'day', date })}
      
      <!-- Day View Mode Toggle (below header) -->
      <div class="day-view__mode-toggle-wrapper">
        <div class="day-view__mode-toggle segmented">
          <button class="segmented__btn ${dayViewMode === 'timeline' ? 'segmented__btn--active' : ''}" 
                  data-action="set-day-view-mode" 
                  data-mode="timeline"
                  title="Timeline-Ansicht"
                  type="button">
            <span class="btn-icon">📅</span>
            <span class="btn-text">Timeline</span>
          </button>
          <button class="segmented__btn ${dayViewMode === 'grid' ? 'segmented__btn--active' : ''}" 
                  data-action="set-day-view-mode" 
                  data-mode="grid"
                  title="Dispo-Grid-Ansicht"
                  type="button">
            <span class="btn-icon">📊</span>
            <span class="btn-text">Grid</span>
          </button>
        </div>
        
        ${canConfirm ? `
          <button class="btn btn--primary" id="btn-confirm-day" data-date="${dateStr}" data-worker-id="${viewWorkerId}">
            <span class="btn-icon">✓</span>
            <span class="btn-text">Tag bestätigen</span>
          </button>
        ` : hasTimeEntriesForAllItems || allConfirmed ? `
          <div class="day-view__status-badge day-view__status-badge--confirmed">
            <span>✓ Bestätigt</span>
          </div>
        ` : dispatchItems.length === 0 ? `
          <div class="day-view__status-badge day-view__status-badge--empty">
            <span>Keine Einsätze</span>
          </div>
        ` : !hasPlannedItems ? `
          <div class="day-view__status-badge day-view__status-badge--info">
            <span>Keine geplanten Einsätze</span>
          </div>
        ` : ''}
      </div>
      
      <div class="day-view__body">
        <div class="day-view__summary">
          <div class="day-view__summary-item">
            <span class="day-view__summary-label">Geplant:</span>
            <span class="day-view__summary-value">${plannedHours.toFixed(1)}h</span>
          </div>
          <div class="day-view__summary-item">
            <span class="day-view__summary-label">Bestätigt:</span>
            <span class="day-view__summary-value">${confirmedHours.toFixed(1)}h</span>
          </div>
        </div>
        
        ${dayViewMode === 'grid' ? renderDayGrid(date) : renderTimelineView(dispatchItems, timeEntries, state)}
      </div>
    </div>
  `;
}

/**
 * Render timeline view (existing implementation)
 */
function renderTimelineView(dispatchItems, timeEntries, state) {
  return `
    ${dispatchItems.length === 0 ? `
      <div class="day-view__empty">Keine Einsätze für diesen Tag</div>
    ` : `
      ${(() => {
        // Split items into all-day and timed
        const allDayItems = dispatchItems.filter(item => item.allDay || item.all_day);
        const timedItems = dispatchItems.filter(item => !(item.allDay || item.all_day));
        
        // Sort timed items by start_time
        timedItems.sort((a, b) => {
          const aStart = a.startTime || a.start_time || '00:00';
          const bStart = b.startTime || b.start_time || '00:00';
          return aStart.localeCompare(bStart);
        });
        
        return `
          ${allDayItems.length > 0 ? `
            <div class="day-view__section">
              <h4 class="day-view__section-title">Ganztägige Einsätze</h4>
              <div class="day-view__dispatch-cards day-view__dispatch-cards--all-day">
                ${allDayItems.map(item => {
                  const assignments = getDispatchAssignments(item.id);
                  return renderDispatchCard(item, assignments);
                }).join('')}
              </div>
            </div>
          ` : ''}
          
          ${timedItems.length > 0 ? `
            <div class="day-view__section">
              <h4 class="day-view__section-title">Tagesplan</h4>
              <div class="day-view__timeline">
                ${timedItems.map(item => {
                  const assignments = getDispatchAssignments(item.id);
                  const startTime = item.startTime || item.start_time || '00:00';
                  const endTime = item.endTime || item.end_time || '00:00';
                  return `
                    <div class="day-view__timeline-item">
                      <div class="day-view__timeline-time">
                        <span class="day-view__timeline-time-start">${startTime}</span>
                        <span class="day-view__timeline-time-separator">–</span>
                        <span class="day-view__timeline-time-end">${endTime}</span>
                      </div>
                      <div class="day-view__timeline-content">
                        ${renderDispatchCard(item, assignments)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        `;
      })()}
    `}
    
    <div class="day-view__time-entries">
      <h4 class="day-view__section-title">Zeiteinträge</h4>
      ${timeEntries.length === 0 ? `
        <div class="day-view__empty">Keine Zeiteinträge für diesen Tag</div>
      ` : timeEntries.map(entry => {
        const location = state.data.locations.find(l => l.id === entry.location_id);
        return `
          <div class="day-view__time-entry">
            <div class="day-view__time-entry-time">
              ${entry.time_from || '—'} - ${entry.time_to || '—'}
            </div>
            <div class="day-view__time-entry-details">
              <div class="day-view__time-entry-category">${entry.category || '—'}</div>
              ${location ? `<div class="day-view__time-entry-location">${location.code || location.address || '—'}</div>` : ''}
            </div>
            <div class="day-view__time-entry-hours">${entryHours(entry).toFixed(1)}h</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

