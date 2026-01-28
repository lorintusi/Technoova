/**
 * Month View with Dispatch Overview
 * Shows month grid with dispatch item counts and status dots
 */

import {
  getState,
  getDispatchItems,
  getDispatchAssignments,
  getPlanningSlotsForDateRange
} from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { renderCalendarHeader } from './calendarHeader.js';

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
 * Get month end date
 */
function getMonthEndDate(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get first day of week for month start (0 = Sunday, 1 = Monday, etc.)
 */
function getFirstDayOfWeek(date) {
  const firstDay = getMonthStartDate(date);
  const day = firstDay.getDay();
  // Convert to Monday = 0
  return day === 0 ? 6 : day - 1;
}

/**
 * Render month view with dispatch overview
 */
export function renderMonthViewDispatch() {
  const state = getState();
  
  // Get calendar date or use today
  const calendarDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
  const monthStart = getMonthStartDate(calendarDate);
  const monthEnd = getMonthEndDate(calendarDate);
  const monthStartStr = formatDateLocal(monthStart);
  const monthEndStr = formatDateLocal(monthEnd);
  
  // Viaplano: Slots aus Einsätzen; sonst Legacy dispatch_items
  const hasAssignments = (state.data.assignments || []).length > 0;
  const slots = hasAssignments
    ? getPlanningSlotsForDateRange(monthStartStr, monthEndStr)
    : [];
  const dispatchItems = hasAssignments ? [] : getDispatchItems(monthStartStr, monthEndStr);
  const itemsByDate = {};
  (slots.length > 0 ? slots : dispatchItems).forEach((item) => {
    const date = item.date;
    if (!itemsByDate[date]) itemsByDate[date] = [];
    itemsByDate[date].push(item);
  });
  
  // Generate month grid
  const firstDayOfWeek = getFirstDayOfWeek(calendarDate);
  const daysInMonth = monthEnd.getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);
  
  // Generate month name
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const monthName = monthNames[monthStart.getMonth()];
  const rangeLabel = `${monthName} ${monthStart.getFullYear()}`;
  
  // Generate calendar cells
  const cells = [];
  
  // Empty cells for days before month start
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(monthStart);
    date.setDate(day);
    const dateStr = formatDateLocal(date);
    const isToday = dateStr === todayStr;
    const dayItems = itemsByDate[dateStr] || [];
    
    // Count planned vs confirmed
    const plannedCount = dayItems.filter(item => item.status === 'PLANNED').length;
    const confirmedCount = dayItems.filter(item => item.status === 'CONFIRMED').length;
    const totalCount = dayItems.length;
    
    cells.push({
      date,
      dateStr,
      day,
      isToday,
      totalCount,
      plannedCount,
      confirmedCount,
      items: dayItems
    });
  }
  
  // Day names (Monday to Sunday)
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  
  return `
    <div class="month-view-dispatch">
      ${renderCalendarHeader({ viewMode: 'month', date: calendarDate, rangeLabel })}
      
      <div class="month-grid">
        <div class="month-grid__header">
          ${dayNames.map(dayName => `
            <div class="month-grid__day-name">${dayName}</div>
          `).join('')}
        </div>
        
        <div class="month-grid__body">
          ${cells.map((cell, index) => {
            if (!cell) {
              return `<div class="month-grid__cell month-grid__cell--empty"></div>`;
            }
            
            const intensity = Math.min(cell.totalCount, 5); // Max intensity for 5+ items
            const intensityClass = intensity > 0 ? `month-grid__cell--intensity-${intensity}` : '';
            
            return `
              <div class="month-grid__cell ${cell.isToday ? 'month-grid__cell--today' : ''} ${intensityClass}"
                   data-action="open-day"
                   data-date="${cell.dateStr}"
                   title="${cell.totalCount} Einsätze${cell.totalCount > 0 ? ` (${cell.plannedCount} geplant, ${cell.confirmedCount} bestätigt)` : ''}">
                <div class="month-grid__cell-day">${cell.day}</div>
                ${cell.totalCount > 0 ? `
                  <div class="month-grid__cell-content">
                    <div class="month-grid__cell-count">${cell.totalCount}</div>
                    <div class="month-grid__cell-dots">
                      ${cell.plannedCount > 0 ? `<span class="month-grid__dot month-grid__dot--planned" title="${cell.plannedCount} geplant"></span>` : ''}
                      ${cell.confirmedCount > 0 ? `<span class="month-grid__dot month-grid__dot--confirmed" title="${cell.confirmedCount} bestätigt"></span>` : ''}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

