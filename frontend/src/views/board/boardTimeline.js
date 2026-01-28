/**
 * Board – Planungsboard (Mitte)
 * Eine Zeitachse mit Perspektive Tag/Woche/Monat. Zeilen = Einsätze, Zellen = Zuordnung.
 * Design: UX_NEU_DESIGN.md – Zone Planungsboard.
 */

import { getState } from '../../state/index.js';
import {
  getPlanningSlotsForDateRange,
  getResourcePillsForSlot,
  getSlotHasConflict
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

function getMonthStart(d) {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function renderBoardTimeline() {
  const state = getState();
  const mode = state.ui.calendarViewMode || 'week';
  const calendarDate = state.ui.calendarDate ? new Date(state.ui.calendarDate) : new Date();
  const userIsAdmin = isAdmin(state.data.currentUser);

  let rangeStart;
  let rangeEnd;
  let columns = []; // { key, dateStr?, label, short, isToday?, hour? }

  if (mode === 'day') {
    rangeStart = new Date(calendarDate);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    const dayStr = formatDateLocal(rangeStart);
    columns.push({
      key: dayStr,
      dateStr: dayStr,
      label: formatDateForDisplay(rangeStart),
      short: 'Tag',
      isToday: dayStr === formatDateLocal(new Date())
    });
  } else if (mode === 'month') {
    rangeStart = getMonthStart(calendarDate);
    rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0);
    const daysInMonth = rangeEnd.getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), i);
      const dateStr = formatDateLocal(d);
      columns.push({
        key: dateStr,
        dateStr,
        label: formatDateForDisplay(d),
        short: String(i),
        isToday: dateStr === formatDateLocal(new Date())
      });
    }
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  } else {
    // week
    rangeStart = getWeekStart(calendarDate);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 6);
    for (let i = 0; i < 7; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateLocal(d);
      columns.push({
        key: dateStr,
        dateStr,
        label: formatDateForDisplay(d),
        short: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i],
        isToday: dateStr === formatDateLocal(new Date())
      });
    }
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  }

  const rangeStartStr = formatDateLocal(rangeStart);
  let rangeEndStr;
  let rangeEndDate;
  if (mode === 'month') {
    rangeEndStr = formatDateLocal(rangeEnd);
    rangeEndDate = rangeEnd;
  } else {
    rangeEndDate = new Date(rangeEnd);
    rangeEndDate.setDate(rangeEndDate.getDate() - 1);
    rangeEndStr = formatDateLocal(rangeEndDate);
  }
  const slots = getPlanningSlotsForDateRange(rangeStartStr, rangeEndStr);
  const days = columns;

  const slotsByAssignment = new Map();
  slots.forEach((slot) => {
    const key = slot.assignmentId;
    if (!slotsByAssignment.has(key)) slotsByAssignment.set(key, { slot: slot, days: {} });
    slotsByAssignment.get(key).days[slot.date] = slot;
  });

  function getResourceName(resourceType, resourceId) {
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

  const assignmentRows = Array.from(slotsByAssignment.entries()).map(([assignmentId, { slot, days: dayMap }]) => {
    const location = (state.data.locations || []).find((l) => l.id === slot.locationId);
    const locationLabel = location ? (location.code || location.address) : '—';
    const cells = days.map((day) => {
      const dateStr = day.dateStr;
      const slotForDay = dateStr ? dayMap[dateStr] : null;
      const pills = slotForDay ? getResourcePillsForSlot(slotForDay.assignmentId, dateStr) : (dateStr ? getResourcePillsForSlot(slot.assignmentId, dateStr) : []);
      const hasConflict = dateStr ? getSlotHasConflict(slot.assignmentId, dateStr) : false;
      const status = slotForDay ? (slotForDay.status === 'CONFIRMED' ? 'bestätigt' : 'geplant') : 'leer';
      const chipsHtml = pills.length
        ? pills.map((p) => `<span class="board-cell__chip" data-dispatch-id="${p.dispatchAssignmentId}" data-resource-type="${p.resourceType}">${getResourceName(p.resourceType, p.resourceId)}</span>`).join('')
        : '<span class="board-cell__empty">—</span>';
      return `
        <div
          class="board-cell board-cell--${status} ${hasConflict ? 'board-cell--conflict' : ''}"
          data-slot-date="${dateStr || ''}"
          data-assignment-id="${slot.assignmentId}"
          data-action="board-cell"
          data-drop="board-cell"
        >
          ${chipsHtml}
        </div>
      `;
    });

    return `
      <div class="board-row" data-assignment-id="${assignmentId}">
        <div class="board-row__label">
          <strong>${slot.title || 'Einsatz'}</strong>
          <span class="board-row__meta">${locationLabel}</span>
        </div>
        <div class="board-row__cells" style="grid-template-columns: repeat(${days.length}, 1fr)">${cells.join('')}</div>
      </div>
    `;
  });

  const rangeLabel = mode === 'day'
    ? formatDateForDisplay(rangeStart)
    : mode === 'month'
      ? `${rangeStart.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`
      : `${rangeStart.getDate()}.${rangeStart.getMonth() + 1}. – ${rangeEndDate.getDate()}.${rangeEndDate.getMonth() + 1}. ${rangeStart.getFullYear()}`;

  return `
    <section class="board-timeline" aria-label="Planungsboard">
      <header class="board-timeline__header">
        <div class="board-timeline__nav">
          <button type="button" class="board-btn board-btn--icon" data-action="board-prev-week" aria-label="Vorherige Woche">‹</button>
          <span class="board-timeline__range">${rangeLabel}</span>
          <button type="button" class="board-btn board-btn--icon" data-action="board-next-week" aria-label="Nächste Woche">›</button>
        </div>
        <div class="board-timeline__perspective">
          <button type="button" class="board-tab ${mode === 'day' ? 'board-tab--active' : ''}" data-action="set-calendar-view" data-mode="day">Tag</button>
          <button type="button" class="board-tab ${mode === 'week' ? 'board-tab--active' : ''}" data-action="set-calendar-view" data-mode="week">Woche</button>
          <button type="button" class="board-tab ${mode === 'month' ? 'board-tab--active' : ''}" data-action="set-calendar-view" data-mode="month">Monat</button>
        </div>
        ${userIsAdmin ? `
          <button type="button" class="board-btn board-btn--primary" id="btn-add-assignment">+ Einsatz</button>
          <button type="button" class="board-btn board-btn--secondary" id="btn-add-planning">Personal zuweisen</button>
        ` : ''}
      </header>
      <div class="board-timeline__grid">
        <div class="board-timeline__row board-timeline__row--head">
          <div class="board-row__label board-row__label--head"></div>
          <div class="board-row__cells" style="grid-template-columns: repeat(${days.length}, 1fr)">
            ${days.map((d) => `<div class="board-cell board-cell--head ${d.isToday ? 'board-cell--today' : ''}"><span>${d.short}</span><span>${d.label || ''}</span></div>`).join('')}
          </div>
        </div>
        ${assignmentRows.length ? assignmentRows.join('') : `
          <div class="board-timeline__empty">
            <p>Keine Einsätze in dieser Woche.</p>
            ${userIsAdmin ? '<button type="button" class="board-btn board-btn--primary" id="btn-add-assignment-empty">+ Einsatz anlegen</button>' : ''}
          </div>
        `}
      </div>
    </section>
  `;
}
