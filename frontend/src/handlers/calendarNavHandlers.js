/**
 * Calendar Navigation Handlers
 * Unified handlers for Day/Week/Month view navigation
 */

import { on } from './events.js';
import { getState, setState } from '../state/index.js';
import { setCalendarViewMode, setActiveDate } from '../state/actions.js';
import { formatDateLocal } from '../utils/format.js';
import { renderApp } from '../views/renderApp.js';
import { showToast } from '../utils/ui.js';

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
 * Get month start date
 */
function getMonthStartDate(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Navigate to previous period
 */
function navigatePrev(viewMode, currentDate) {
  const date = new Date(currentDate);
  
  switch (viewMode) {
    case 'day':
      date.setDate(date.getDate() - 1);
      break;
    case 'week':
      date.setDate(date.getDate() - 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() - 1);
      break;
    default:
      return;
  }
  
  setState({
    ui: {
      ...getState().ui,
      calendarDate: date,
      selectedDay: date
    }
  });
  
  renderApp();
}

/**
 * Navigate to next period
 */
function navigateNext(viewMode, currentDate) {
  const date = new Date(currentDate);
  
  switch (viewMode) {
    case 'day':
      date.setDate(date.getDate() + 1);
      break;
    case 'week':
      date.setDate(date.getDate() + 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return;
  }
  
  setState({
    ui: {
      ...getState().ui,
      calendarDate: date,
      selectedDay: date
    }
  });
  
  renderApp();
}

/**
 * Navigate to today
 */
function navigateToday(viewMode) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // For week view, go to week start (Monday)
  let targetDate = today;
  if (viewMode === 'week') {
    targetDate = getWeekStartDate(today);
  } else if (viewMode === 'month') {
    targetDate = getMonthStartDate(today);
  }
  
  setState({
    ui: {
      ...getState().ui,
      calendarDate: targetDate,
      selectedDay: today
    }
  });
  
  setActiveDate(formatDateLocal(today));
  renderApp();
}

/**
 * Bind calendar navigation handlers
 */
export function bindCalendarNavHandlers() {
  // View switch (Day/Week/Month)
  on('click', '[data-action="set-view"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="set-view"]');
    const view = btn?.getAttribute('data-view');
    
    if (view && ['day', 'week', 'month'].includes(view)) {
      setCalendarViewMode(view);
      
      // Adjust date if needed
      const state = getState();
      const currentDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
      
      let targetDate = currentDate;
      if (view === 'week') {
        targetDate = getWeekStartDate(currentDate);
      } else if (view === 'month') {
        targetDate = getMonthStartDate(currentDate);
      }
      
      setState({
        ui: {
          ...state.ui,
          calendarDate: targetDate,
          selectedDay: view === 'day' ? currentDate : null
        }
      });
      
      renderApp();
    }
  });
  
  // Previous period
  on('click', '[data-action="nav-prev"]', (e) => {
    e.preventDefault();
    const state = getState();
    const viewMode = state.ui.calendarViewMode || 'week';
    const currentDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
    navigatePrev(viewMode, currentDate);
  });
  
  // Next period
  on('click', '[data-action="nav-next"]', (e) => {
    e.preventDefault();
    const state = getState();
    const viewMode = state.ui.calendarViewMode || 'week';
    const currentDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
    navigateNext(viewMode, currentDate);
  });
  
  // Today button
  on('click', '[data-action="nav-today"]', (e) => {
    e.preventDefault();
    const state = getState();
    const viewMode = state.ui.calendarViewMode || 'week';
    navigateToday(viewMode);
  });
  
  // Open day from month view
  on('click', '[data-action="open-day"]', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="open-day"]');
    const dateStr = btn?.getAttribute('data-date');
    
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr + 'T00:00:00');
      
      setCalendarViewMode('day');
      setActiveDate(dateStr);
      
      setState({
        ui: {
          ...getState().ui,
          calendarDate: date,
          selectedDay: date
        }
      });
      
      renderApp();
    }
  });
  
  // Create dispatch item
  on('click', '[data-action="create-dispatch"]', async (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-action="create-dispatch"]');
    const dateStr = btn?.getAttribute('data-date'); // Optional: specific date
    
    const state = getState();
    const targetDate = dateStr || state.ui.activeDate || formatDateLocal(state.ui.calendarDate || new Date());
    
    // Open dispatch item modal
    const { openDispatchItemModal } = await import('../views/modals/dispatchItemModal.js');
    openDispatchItemModal(null, { date: targetDate });
  });
  
  // Team calendar handlers (delegated from calendar header)
  on('click', '[data-action="open-team-calendar"]', (e) => {
    e.preventDefault();
    const state = getState();
    setState({
      ui: {
        ...state.ui,
        showTeamCalendar: true
      }
    });
    renderApp();
  });
  
  on('click', '[data-action="close-team-calendar"]', (e) => {
    e.preventDefault();
    const state = getState();
    setState({
      ui: {
        ...state.ui,
        showTeamCalendar: false
      }
    });
    renderApp();
  });
  
  // Notes modal handler (delegated from calendar header)
  on('click', '[data-action="open-notes-modal"]', async (e) => {
    e.preventDefault();
    // Open notes modal (if exists)
    if (window.openNotesModal) {
      window.openNotesModal();
    } else {
      console.warn('Notes modal not available');
    }
  });
}

