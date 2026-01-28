/**
 * Weekly Dispatch Board (Resource-based Weekly Planning Board)
 * Board, kein Kalender: Zeitachse = Woche, Spalten = Tage, Karten = Einsätze, Pills = Zuweisungen.
 * Einsatzorte sind Kontextanker: Jede Karte zeigt ihren Einsatzort; ohne Einsatzort ist keine Zuweisung möglich.
 */

import { getState } from '../../state/index.js';
import {
  getPlanningSlotsForDateRange,
  getResourcePillsForSlot,
  getSlotHasConflict,
  getLocationById,
  hasAnyLocations,
  assignmentHasLocation
} from '../../state/selectors.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';

function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - (day === 0 ? 6 : day - 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getResourceName(state, resourceType, resourceId) {
  if (resourceType === 'WORKER') {
    const w = (state.data.workers || []).find((x) => x.id === resourceId);
    return w?.name || `#${resourceId}`;
  }
  if (resourceType === 'VEHICLE') {
    const v = (state.data.vehicles || []).find((x) => x.id === resourceId);
    return v?.name || v?.licensePlate || `#${resourceId}`;
  }
  const d = (state.data.devices || []).find((x) => x.id === resourceId);
  return d?.name || d?.serialNumber || `#${resourceId}`;
}

function getResourceRole(state, resourceType, resourceId) {
  if (resourceType === 'WORKER') {
    const w = (state.data.workers || []).find((x) => x.id === resourceId);
    return w?.role || '';
  }
  return '';
}

/**
 * Label für Einsatzort (Kontextanker). Immer sichtbar; fehlender Ort wird explizit angezeigt.
 */
function getLocationLabel(location) {
  if (!location) return null;
  return location.name || location.code || location.address || location.referenz || `#${location.id}`;
}

/**
 * Eine Tagesspalte: DayHeader + DispatchSlotContainer (DispatchCards + DropZone)
 * Ohne Einsatzort → DropZone inaktiv (keine Zuweisung möglich).
 */
function renderDayColumn(state, dateStr, dayLabel, shortLabel, isToday, slotsOnDay, getResourceNameFn, getResourceRoleFn) {
  const assignmentsOnDay = slotsOnDay.map((s) => ({ slot: s, assignmentId: s.assignmentId }));
  const cardsHtml = assignmentsOnDay.map(({ slot }) => {
    const assignment = (state.data.assignments || []).find((a) => a.id === slot.assignmentId);
    const locationId = assignment?.location_id ?? assignment?.locationId ?? slot.locationId;
    const location = getLocationById(locationId);
    const hasLocation = assignmentHasLocation(assignment);
    const pills = getResourcePillsForSlot(slot.assignmentId, dateStr);
    const hasConflict = getSlotHasConflict(slot.assignmentId, dateStr);
    const timeRange = slot.allDay ? 'Ganztägig' : (slot.startTime || slot.start_time || '') && (slot.endTime || slot.end_time || '') ? `${slot.startTime || slot.start_time} – ${slot.endTime || slot.end_time}` : 'Ganztägig';
    const locationLabel = hasLocation ? getLocationLabel(location) : null;
    const pillsHtml = pills.map((p) => `
      <div class="resource-pill" draggable="true" data-drag-type="${p.resourceType}" data-drag-id="${p.resourceId}">
        <span class="resource-pill__avatar">👤</span>
        <span class="resource-pill__name">${getResourceNameFn(p.resourceType, p.resourceId)}</span>
        <span class="resource-pill__role">${getResourceRoleFn(p.resourceType, p.resourceId)}</span>
        <span class="resource-pill__handle" aria-hidden="true">⋮⋮</span>
        <button type="button" class="resource-pill__remove" data-action="remove-assignment" data-assignment-id="${p.dispatchAssignmentId}" aria-label="Entfernen">×</button>
      </div>`).join('');
    const dropZoneActive = hasLocation;
    const dropZoneHtml = dropZoneActive
      ? `<div class="drop-zone" data-drop="board-cell" data-slot-date="${dateStr}" data-assignment-id="${slot.assignmentId}" data-has-location="true">
          <span class="drop-zone__placeholder">+ Ressource hier ablegen</span>
        </div>`
      : `<div class="drop-zone drop-zone--disabled" data-slot-date="${dateStr}" data-assignment-id="${slot.assignmentId}" data-has-location="false" title="Kein Einsatzort – Zuweisung nicht möglich">
          <span class="drop-zone__placeholder">Kein Einsatzort – Zuweisung nicht möglich</span>
        </div>`;
    return `
      <div class="dispatch-card ${hasConflict ? 'dispatch-card--conflict' : ''} ${!hasLocation ? 'dispatch-card--no-location' : ''}" data-assignment-id="${slot.assignmentId}" data-slot-date="${dateStr}">
        <div class="dispatch-card__header">
          <div class="dispatch-card__header-top">
            <span class="dispatch-card__location" title="Einsatzort">${locationLabel != null ? locationLabel : '— Kein Einsatzort'}</span>
            <div class="dispatch-card__actions">
              <button 
                type="button" 
                class="dispatch-card__edit-btn" 
                data-action="edit-assignment" 
                data-assignment-id="${slot.assignmentId}"
                title="Einsatz bearbeiten"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <span class="dispatch-card__id">#${slot.assignmentId}</span>
          <strong class="dispatch-card__title">${assignment?.title || 'Einsatz'}</strong>
          <span class="dispatch-card__time">${timeRange}</span>
        </div>
        <div class="dispatch-card__body">
          <div class="resource-group" data-resource-type="WORKER">
            <div class="resource-group__header">
              <span class="resource-group__count">${pills.length}</span>
            </div>
            <div class="resource-pill-list">
              ${pillsHtml}
              ${dropZoneHtml}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="day-column ${isToday ? 'day-column--today' : ''}" data-date="${dateStr}" data-scope="${dateStr}">
      <div class="day-column__header">${shortLabel}<span class="day-column__label">${dayLabel}</span></div>
      <div class="dispatch-slot-container">
        ${cardsHtml}
        <div class="empty-slot drop-zone drop-zone--location" data-drop="board-location" data-slot-date="${dateStr}" title="Einsatzort hierher ziehen → neuer Einsatz">
          <span class="empty-slot__placeholder">+ Einsatzort hierher ziehen</span>
        </div>
      </div>
    </div>`;
}

export function renderWeeklyDispatchBoard() {
  const state = getState();
  const calendarDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
  const weekStart = getWeekStart(calendarDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const rangeStartStr = formatDateLocal(weekStart);
  const rangeEndStr = formatDateLocal(weekEnd);
  const slots = getPlanningSlotsForDateRange(rangeStartStr, rangeEndStr);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateLocal(d);
    days.push({
      dateStr,
      label: formatDateForDisplay(d),
      short: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i],
      isToday: dateStr === formatDateLocal(new Date())
    });
  }

  const slotsByDate = new Map();
  days.forEach((d) => slotsByDate.set(d.dateStr, slots.filter((s) => s.date === d.dateStr)));

  const getResourceNameFn = (resourceType, resourceId) => getResourceName(state, resourceType, resourceId);
  const getResourceRoleFn = (resourceType, resourceId) => getResourceRole(state, resourceType, resourceId);

  // Ohne Einsatzorte ist keine Planung möglich – Blockade mit klarer Meldung
  const anyLocations = hasAnyLocations();
  const dayColumnsHtml = anyLocations
    ? days.map((d) =>
        renderDayColumn(state, d.dateStr, d.label, d.short, d.isToday, slotsByDate.get(d.dateStr) || [], getResourceNameFn, getResourceRoleFn)
      ).join('')
    : '';

  const rangeLabel = `${weekStart.getDate()}.${weekStart.getMonth() + 1}. – ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}. ${weekStart.getFullYear()}`;
  const userIsAdmin = isAdmin(state.data.currentUser);

  const emptyLocationsHtml = !anyLocations
    ? `
    <div class="weekly-dispatch-board__empty weekly-dispatch-board__empty--no-locations">
      <p class="weekly-dispatch-board__empty-title">Keine Einsatzorte angelegt</p>
      <p class="weekly-dispatch-board__empty-text">Ohne Einsatzort ist keine Disposition möglich. Mitarbeiter werden immer an einem konkreten Ort eingeplant.</p>
      <p class="weekly-dispatch-board__empty-hint">Bitte legen Sie zuerst Einsatzorte an (z. B. Baustellen, Kundencode). Danach können Einsätze und Zuweisungen geplant werden.</p>
    </div>`
    : '';

  return `
    <section class="weekly-dispatch-board" aria-label="Weekly Dispatch Board">
      <div class="time-axis">
        <div class="time-axis__nav">
          <button type="button" class="time-axis__btn" data-action="board-prev-week" aria-label="Vorherige Woche">‹</button>
          <span class="time-axis__range">${rangeLabel}</span>
          <button type="button" class="time-axis__btn" data-action="board-next-week" aria-label="Nächste Woche">›</button>
          ${userIsAdmin ? '<button type="button" class="time-axis__btn time-axis__btn--primary" id="btn-add-assignment">+ Einsatz</button>' : ''}
        </div>
        ${emptyLocationsHtml}
        ${anyLocations ? `<div class="time-axis__columns" style="grid-template-columns: repeat(7, minmax(140px, 1fr))">${dayColumnsHtml}</div>` : ''}
      </div>
    </section>
  `;
}
