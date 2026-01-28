/**
 * Week View with Dispatch Cards
 * Shows dispatch items as cards for selected week
 */

import { 
  getState, 
  getDispatchItems,
  getDispatchAssignments,
  getPlanningForWorkerId, 
  getActiveWorkerId,
  getActiveUser
} from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';
import { renderDispatchCard } from './dispatchCard.js';
import { renderCalendarHeader } from './calendarHeader.js';

/**
 * Get week start date (Monday)
 */
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Generate week days (Monday to Sunday)
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
      dayNum: date.getDate(),
      displayDate: formatDateForDisplay(date)
    });
  }
  return days;
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

/**
 * Render week view with dispatch cards
 */
export function renderWeekViewDispatch() {
  const state = getState();
  const currentUser = state.data.currentUser;
  const canCreate = isAdmin(currentUser);
  
  // Get calendar date or use today
  const calendarDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
  const weekStart = getWeekStartDate(calendarDate);
  const weekStartStr = formatDateLocal(weekStart);
  
  // Calculate week end (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = formatDateLocal(weekEnd);
  
  // Get week number
  const weekNumber = getWeekNumber(weekStart);
  
  // Get dispatch items for this week
  // CRITICAL: Multiple dispatch items per day per worker are STANDARD
  let dispatchItems = getDispatchItems(weekStartStr, weekEndStr);
  
  // Filter by worker role if needed (RBAC)
  if (!canCreate) {
    // Worker sees only items where they are assigned
    const workerId = currentUser?.workerId || currentUser?.worker_id || currentUser?.id;
    if (workerId) {
      dispatchItems = dispatchItems.filter(item => {
        const assignments = getDispatchAssignments(item.id);
        return assignments.some(a => 
          (a.resourceType || a.resource_type) === 'WORKER' &&
          String(a.resourceId || a.resource_id) === String(workerId)
        );
      });
    } else {
      dispatchItems = []; // No worker ID, show nothing
    }
  }
  
  // Group dispatch items by date
  const itemsByDate = {};
  dispatchItems.forEach(item => {
    const date = item.date;
    if (!itemsByDate[date]) {
      itemsByDate[date] = [];
    }
    itemsByDate[date].push(item);
  });
  
  // Generate week days
  const weekDays = generateWeekDays(weekStart);
  
  // Get today's date string for highlighting
  const todayStr = formatDateLocal(new Date());
  
  // Generate range label
  const rangeLabel = `KW ${weekNumber} - ${weekStart.getDate()}.${weekStart.getMonth() + 1}. - ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}. ${weekStart.getFullYear()}`;
  
  return `
    <div class="week-view-dispatch">
      ${renderCalendarHeader({ viewMode: 'week', date: calendarDate, rangeLabel, canCreateDispatch: canCreate })}
      
      <div class="week-view-dispatch__days">
        ${weekDays.map(day => {
          const isToday = day.dateStr === todayStr;
          const dayItems = itemsByDate[day.dateStr] || [];
          
          return `
            <div class="week-view-dispatch__day ${isToday ? 'week-view-dispatch__day--today' : ''}">
              <div class="week-view-dispatch__day-header">
                <div class="week-view-dispatch__day-name">${day.dayName}</div>
                <div class="week-view-dispatch__day-number">${day.dayNum}</div>
                <div class="week-view-dispatch__day-date">${day.displayDate}</div>
              </div>
              <div class="week-view-dispatch__day-body">
                ${canCreate ? `
                  <button class="btn btn--ghost btn--small week-view-dispatch__add-btn" 
                          data-action="open-create-dispatch-item" 
                          data-date="${day.dateStr}"
                          title="Einsatz für ${day.displayDate} hinzufügen">
                    <span class="btn-icon">+</span>
                    <span class="btn-text">Einsatz</span>
                  </button>
                ` : ''}
                <div class="week-view-dispatch__cards">
                  ${dayItems
                    .sort((a, b) => {
                      // Sort: timed items first (by start time), then all-day
                      // CRITICAL: Multiple dispatch items per day are STANDARD
                      const aAllDay = a.allDay || a.all_day;
                      const bAllDay = b.allDay || b.all_day;
                      
                      if (aAllDay && !bAllDay) return 1;
                      if (!aAllDay && bAllDay) return -1;
                      
                      if (!aAllDay && !bAllDay) {
                        const aStart = a.startTime || a.start_time || '00:00';
                        const bStart = b.startTime || b.start_time || '00:00';
                        return aStart.localeCompare(bStart);
                      }
                      
                      return 0;
                    })
                    .map(item => {
                      const assignments = getDispatchAssignments(item.id);
                      return renderDispatchCard(item, assignments);
                    }).join('')}
                </div>
                ${dayItems.length === 0 ? `
                  <div class="week-view-dispatch__empty">
                    <em>Keine Einsätze</em>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

