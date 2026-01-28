/**
 * Day View Grid Mode
 * Dispo-Grid: Projekte/Einsätze als Zeilen links, Zeitraster rechts
 */

import { getState } from '../../state/index.js';
import {
  getDispatchItems,
  getDispatchAssignments,
  getPlanningSlotsForDateRange,
  getResourcePillsForSlot
} from '../../state/selectors.js';
import { formatDateLocal } from '../../utils/format.js';
import { renderDispatchCard } from './dispatchCard.js';

/**
 * Render day grid view
 * @param {Date|string} date - Date to render
 */
export function renderDayGrid(date) {
  const state = getState();
  
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date + 'T00:00:00');
  } else {
    dateObj = new Date();
  }
  
  const dateStr = formatDateLocal(dateObj);
  const hasAssignments = (state.data.assignments || []).length > 0;
  const slots = hasAssignments ? getPlanningSlotsForDateRange(dateStr, dateStr) : [];
  const dispatchItems = hasAssignments ? [] : getDispatchItems(dateStr, dateStr);
  const items = slots.length > 0 ? slots : dispatchItems;

  const allDayItems = items.filter((item) => item.allDay || item.all_day);
  const timedItems = items.filter((item) => !(item.allDay || item.all_day));
  
  // Sort timed items by start_time
  timedItems.sort((a, b) => {
    const aStart = a.startTime || a.start_time || '00:00';
    const bStart = b.startTime || b.start_time || '00:00';
    return aStart.localeCompare(bStart);
  });
  
  // Calculate time range for grid (06:00 to 18:00 default, or extend based on items)
  const timeRange = calculateTimeRange(timedItems);
  const hours = generateHourLabels(timeRange.start, timeRange.end);
  
  return `
    <div class="day-grid">
      ${allDayItems.length > 0 ? `
        <div class="day-grid__all-day-section">
          <div class="day-grid__all-day-header">
            <h4 class="day-grid__section-title">Ganztägige Einsätze</h4>
          </div>
          <div class="day-grid__all-day-rows">
            ${allDayItems.map((item) => {
              const assignments =
                item.assignmentId != null
                  ? getResourcePillsForSlot(item.assignmentId, item.date)
                  : getDispatchAssignments(item.id);
              const location = state.data.locations.find((l) => l.id === (item.locationId || item.location_id));
              return renderGridRow(item, assignments, location, null, null, true);
            }).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="day-grid__main">
        <div class="day-grid__rows">
          ${timedItems.length === 0 ? `
            <div class="day-grid__empty">
              <p>Keine zeitlichen Einsätze für diesen Tag</p>
            </div>
          ` : timedItems.map((item) => {
            const assignments =
              item.assignmentId != null
                ? getResourcePillsForSlot(item.assignmentId, item.date)
                : getDispatchAssignments(item.id);
            const location = state.data.locations.find((l) => l.id === (item.locationId || item.location_id));
            const startTime = item.startTime || item.start_time || '00:00';
            const endTime = item.endTime || item.end_time || '00:00';
            return renderGridRow(item, assignments, location, startTime, endTime, false, timeRange);
          }).join('')}
        </div>
        
        <div class="day-grid__timeline">
          <div class="day-grid__timebar">
            ${hours.map(hour => `
              <div class="day-grid__timebar-hour" data-hour="${hour}">
                <span class="day-grid__timebar-label">${hour}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="day-grid__timeline-content">
            ${timedItems.map(item => {
              const startTime = item.startTime || item.start_time || '00:00';
              const endTime = item.endTime || item.end_time || '00:00';
              return renderTimelineBlock(item, startTime, endTime, timeRange);
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render grid row (left side)
 */
function renderGridRow(item, assignments, location, startTime, endTime, isAllDay, timeRange = null) {
  const locationName = location ? (location.code || location.address || 'Unbekannt') : 'Unbekannt';
  const locationAddress = location ? location.address : '';
  
  // Count assignments by type
  const workerCount = assignments.filter(a => (a.resourceType || a.resource_type) === 'WORKER').length;
  const vehicleCount = assignments.filter(a => (a.resourceType || a.resource_type) === 'VEHICLE').length;
  const deviceCount = assignments.filter(a => (a.resourceType || a.resource_type) === 'DEVICE').length;
  
  // Status badge
  const statusClass = item.status === 'CONFIRMED' ? 'dispatch-card__status--confirmed' : 
                     item.status === 'PLANNED' ? 'dispatch-card__status--planned' : '';
  
  return `
    <div class="day-grid__row" 
         data-dispatch-item-id="${item.id}"
         data-action="select-resource"
         data-type="DISPATCH"
         data-id="${item.id}"
         ${isAllDay ? 'data-all-day="true"' : ''}
         ${startTime ? `data-start-time="${startTime}"` : ''}
         ${endTime ? `data-end-time="${endTime}"` : ''}>
      <div class="day-grid__row-content">
        <div class="day-grid__row-header">
          <h5 class="day-grid__row-title">${locationName}</h5>
          ${item.status ? `<span class="dispatch-card__status ${statusClass}">${item.status}</span>` : ''}
        </div>
        ${locationAddress && locationAddress !== locationName ? `
          <div class="day-grid__row-address">${locationAddress}</div>
        ` : ''}
        ${item.category ? `
          <div class="day-grid__row-category">${item.category}</div>
        ` : ''}
        ${!isAllDay && startTime && endTime ? `
          <div class="day-grid__row-time">${startTime} - ${endTime}</div>
        ` : ''}
        <div class="day-grid__row-badges">
          ${workerCount > 0 ? `<span class="day-grid__badge day-grid__badge--worker">👤 ${workerCount}</span>` : ''}
          ${vehicleCount > 0 ? `<span class="day-grid__badge day-grid__badge--vehicle">🚗 ${vehicleCount}</span>` : ''}
          ${deviceCount > 0 ? `<span class="day-grid__badge day-grid__badge--device">🔧 ${deviceCount}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render timeline block (right side)
 */
function renderTimelineBlock(item, startTime, endTime, timeRange) {
  // Calculate position and width
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const rangeStartMinutes = timeToMinutes(timeRange.start);
  const rangeEndMinutes = timeToMinutes(timeRange.end);
  const rangeDuration = rangeEndMinutes - rangeStartMinutes;
  
  // Calculate percentage position and width
  const leftPercent = ((startMinutes - rangeStartMinutes) / rangeDuration) * 100;
  const widthPercent = ((endMinutes - startMinutes) / rangeDuration) * 100;
  
  const location = getState().data.locations.find(l => l.id === (item.locationId || item.location_id));
  const locationName = location ? (location.code || location.address || 'Einsatz') : 'Einsatz';
  
  const statusClass = item.status === 'CONFIRMED' ? 'day-grid__block--confirmed' : 
                     item.status === 'PLANNED' ? 'day-grid__block--planned' : '';
  
  return `
    <div class="day-grid__block ${statusClass}"
         style="left: ${Math.max(0, leftPercent)}%; width: ${Math.max(2, widthPercent)}%;"
         data-dispatch-item-id="${item.id}"
         data-action="select-resource"
         data-type="DISPATCH"
         data-id="${item.id}"
         title="${locationName}: ${startTime} - ${endTime}">
      <div class="day-grid__block-content">
        <div class="day-grid__block-title">${locationName}</div>
        <div class="day-grid__block-time">${startTime} - ${endTime}</div>
      </div>
    </div>
  `;
}

/**
 * Calculate time range for grid
 */
function calculateTimeRange(items) {
  if (items.length === 0) {
    return { start: '06:00', end: '18:00' };
  }
  
  let minTime = '23:59';
  let maxTime = '00:00';
  
  items.forEach(item => {
    const start = item.startTime || item.start_time || '00:00';
    const end = item.endTime || item.end_time || '23:59';
    
    if (start < minTime) minTime = start;
    if (end > maxTime) maxTime = end;
  });
  
  // Round to nearest hour, extend by 1 hour on each side
  const minHour = Math.max(0, parseInt(minTime.split(':')[0]) - 1);
  const maxHour = Math.min(23, parseInt(maxTime.split(':')[0]) + 2);
  
  return {
    start: `${String(minHour).padStart(2, '0')}:00`,
    end: `${String(maxHour).padStart(2, '0')}:00`
  };
}

/**
 * Generate hour labels
 */
function generateHourLabels(startTime, endTime) {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const hours = [];
  
  for (let hour = startHour; hour <= endHour; hour++) {
    hours.push(`${String(hour).padStart(2, '0')}:00`);
  }
  
  return hours;
}

/**
 * Convert time string to minutes
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

