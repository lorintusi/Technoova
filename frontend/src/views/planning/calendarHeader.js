/**
 * Calendar Header Component
 * Unified header for Day/Week/Month views
 */

import { getState } from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { isAdmin, canViewTeamCalendar } from '../../utils/permissions.js';

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
 * Get month start date
 */
function getMonthStartDate(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Render calendar header
 * @param {object} options - Options object
 * @param {string} options.viewMode - Current view mode ('day' | 'week' | 'month')
 * @param {Date|string} options.date - Current date
 * @param {string} options.rangeLabel - Optional range label (e.g., "KW 5", "Januar 2024")
 * @param {boolean} options.canTeamCalendar - Can show team calendar
 * @param {boolean} options.canCreateDispatch - Can create dispatch items
 */
export function renderCalendarHeader(options = {}) {
  const state = getState();
  const viewMode = options.viewMode || state.ui.calendarViewMode || 'week';
  const currentUser = state.data.currentUser;
  
  // Parse date
  let date;
  if (options.date) {
    date = options.date instanceof Date ? options.date : new Date(options.date + 'T00:00:00');
  } else {
    date = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
  }
  date.setHours(0, 0, 0, 0);
  
  // Calculate range label if not provided
  let rangeLabel = options.rangeLabel;
  if (!rangeLabel) {
    switch (viewMode) {
      case 'day':
        rangeLabel = formatDateForDisplay(date);
        break;
      case 'week':
        const weekStart = getWeekStartDate(date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekNumber = getWeekNumber(weekStart);
        rangeLabel = `KW ${weekNumber} - ${weekStart.getDate()}.${weekStart.getMonth() + 1}. - ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}. ${weekStart.getFullYear()}`;
        break;
      case 'month':
        const monthStart = getMonthStartDate(date);
        const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        rangeLabel = `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
        break;
      default:
        rangeLabel = formatDateForDisplay(date);
    }
  }
  
  const canTeamCalendar = options.canTeamCalendar !== undefined ? options.canTeamCalendar : canViewTeamCalendar();
  const canCreateDispatch = options.canCreateDispatch !== undefined ? options.canCreateDispatch : isAdmin(currentUser);
  const showTeamCalendar = state.ui.showTeamCalendar || false;
  
  // Get today's date string
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);
  const currentDateStr = formatDateLocal(date);
  const isToday = todayStr === currentDateStr;
  
  return `
    <div class="calendar-header">
      <!-- Left: View Tabs -->
      <div class="calendar-header__left">
        <div class="segmented calendar-header__view-tabs">
          <button class="segmented__btn ${viewMode === 'day' ? 'segmented__btn--active' : ''}" 
                  data-action="set-view" 
                  data-view="day"
                  title="Tagesansicht"
                  type="button">
            <span class="btn-icon">📋</span>
            <span class="btn-text">Tag</span>
          </button>
          <button class="segmented__btn ${viewMode === 'week' ? 'segmented__btn--active' : ''}" 
                  data-action="set-view" 
                  data-view="week"
                  title="Wochenansicht"
                  type="button">
            <span class="btn-icon">📆</span>
            <span class="btn-text">Woche</span>
          </button>
          <button class="segmented__btn ${viewMode === 'month' ? 'segmented__btn--active' : ''}" 
                  data-action="set-view" 
                  data-view="month"
                  title="Monatsansicht"
                  type="button">
            <span class="btn-icon">📅</span>
            <span class="btn-text">Monat</span>
          </button>
        </div>
      </div>
      
      <!-- Center: Date Navigation -->
      <div class="calendar-header__center">
        <button class="btn btn--ghost btn--icon calendar-header__nav-btn" 
                data-action="nav-prev"
                title="Vorheriger ${viewMode === 'day' ? 'Tag' : viewMode === 'week' ? 'Woche' : 'Monat'}"
                type="button">
          <span class="btn-icon">‹</span>
        </button>
        <div class="calendar-header__range-label">${rangeLabel}</div>
        <button class="btn btn--ghost btn--icon calendar-header__nav-btn" 
                data-action="nav-next"
                title="Nächster ${viewMode === 'day' ? 'Tag' : viewMode === 'week' ? 'Woche' : 'Monat'}"
                type="button">
          <span class="btn-icon">›</span>
        </button>
        <button class="btn btn--ghost calendar-header__today-btn ${isToday ? 'calendar-header__today-btn--active' : ''}" 
                data-action="nav-today"
                title="Heute"
                type="button">
          <span class="btn-text">Heute</span>
        </button>
      </div>
      
      <!-- Right: Actions -->
      <div class="calendar-header__right">
        ${canTeamCalendar && !showTeamCalendar ? `
          <button class="btn btn--secondary calendar-header__action-btn" 
                  data-action="open-team-calendar"
                  title="Teamkalender anzeigen"
                  type="button">
            <span class="btn-icon">👥</span>
            <span class="btn-text">Teamkalender</span>
          </button>
        ` : showTeamCalendar ? `
          <button class="btn btn--secondary calendar-header__action-btn" 
                  data-action="close-team-calendar"
                  title="Zurück"
                  type="button">
            <span class="btn-text">Zurück</span>
          </button>
        ` : ''}
        <button class="btn btn--ghost calendar-header__action-btn" 
                data-action="open-notes-modal"
                title="Notizen"
                type="button">
          <span class="btn-icon">📝</span>
          <span class="btn-text">Notizen</span>
        </button>
        ${canCreateDispatch ? `
          <button class="btn btn--primary calendar-header__action-btn" 
                  data-action="create-dispatch"
                  title="Einsatz hinzufügen"
                  type="button">
            <span class="btn-icon">+</span>
            <span class="btn-text">Einsatz</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

