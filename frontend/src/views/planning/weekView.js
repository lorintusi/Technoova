/**
 * Week View with Planning Blocks
 * Shows planned blocks for selected worker
 */

import { 
  getState, 
  getPlanningEntriesForWeek, 
  getPlanningForWorkerId, 
  getActiveWorkerId,
  getActiveUser,
  getMedicalCertificateByPlanningEntryId
} from '../../state/index.js';
import { formatDateLocal, formatDateForDisplay } from '../../utils/format.js';
import { entryHours } from '../../utils/time.js';
import { canEditPlanningEntry, canDeletePlanningEntry } from '../../utils/permissions.js';

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
      dayNum: date.getDate()
    });
  }
  return days;
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
  const labels = {
    'PROJEKT': 'Projekt',
    'SCHULUNG': 'Schulung',
    'BUERO': 'Büro',
    'TRAINING': 'Training',
    'KRANK': 'Krank',
    'MEETING': 'Meeting'
  };
  return labels[category] || category || 'Allgemein';
}

/**
 * Render planning block
 */
function renderPlanningBlock(entry, location, currentUser) {
  const state = getState();
  const categoryLabel = getCategoryLabel(entry.category);
  const statusClass = entry.status === 'CONFIRMED' ? 'planning-block--confirmed' : 'planning-block--planned';
  const statusBadge = entry.status === 'CONFIRMED' ? '<span class="planning-block__status-badge">✓</span>' : '';
  
  // Source badge (SELF_PLAN vs ADMIN_PLAN)
  const sourceBadge = entry.source === 'SELF_PLAN' ? '<span class="planning-block__source-badge">SELF</span>' : '';
  
  // Calculate position and height
  const startTime = entry.startTime || entry.time_from || '08:00';
  const endTime = entry.endTime || entry.time_to || '17:00';
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const top = (startMinutes / 60) * 64; // 64px per hour
  const height = ((endMinutes - startMinutes) / 60) * 64;
  
  // For PROJEKT category: show full project details
  const isProject = entry.category === 'PROJEKT';
  const locationName = location ? (location.code || location.address || 'Keine Baustelle') : 'Keine Baustelle';
  const locationAddress = location?.address || '';
  const resources = location?.resourcesRequired || [];
  const resourcesDisplay = Array.isArray(resources) ? resources.join(', ') : '';
  
  // Check for medical certificate (KRANK category)
  const isKrank = entry.category === 'KRANK';
  const medicalCertificate = isKrank ? getMedicalCertificateByPlanningEntryId(entry.id) : null;
  const hasMedicalCertificate = !!medicalCertificate;
  const medicalBadge = isKrank ? (hasMedicalCertificate 
    ? '<span class="planning-block__medical-badge planning-block__medical-badge--ok" title="Arztzeugnis vorhanden">🏥✓</span>' 
    : '<span class="planning-block__medical-badge planning-block__medical-badge--missing" title="Arztzeugnis fehlt">🏥!</span>') : '';
  
  // Build display content based on category
  let displayContent = '';
  if (isProject && location) {
    // Full project details
    displayContent = `
      <div class="planning-block__project-name">${locationName}</div>
      ${locationAddress ? `<div class="planning-block__project-address">${locationAddress}</div>` : ''}
      ${resourcesDisplay ? `<div class="planning-block__project-resources">${resourcesDisplay}</div>` : ''}
    `;
  } else {
    // Just category for non-project entries
    displayContent = `<div class="planning-block__category">${categoryLabel}</div>`;
  }
  
  // Action buttons (edit/delete) if permitted
  const canEdit = canEditPlanningEntry(currentUser, entry);
  const canDelete = canDeletePlanningEntry(currentUser, entry);
  const actionsHtml = (canEdit || canDelete) ? `
    <div class="planning-block__actions">
      ${canEdit ? `<button class="planning-block__action-btn" data-action="edit-planning-entry" data-planning-entry-id="${entry.id}" title="Bearbeiten">✏️</button>` : ''}
      ${canDelete ? `<button class="planning-block__action-btn" data-action="delete-planning-entry" data-planning-entry-id="${entry.id}" title="Löschen">🗑️</button>` : ''}
    </div>
  ` : '';
  
  // Audit trail info (for admin)
  const isAdmin = currentUser && (currentUser.role === 'Admin' || (currentUser.permissions && currentUser.permissions.includes('manage_users')));
  const createdBy = entry.createdByUserId ? (state.data.users?.find(u => u.id === entry.createdByUserId)?.name || 'Unbekannt') : null;
  const createdDate = entry.createdAt || entry.updatedAt;
  const createdDateStr = createdDate ? new Date(createdDate).toLocaleDateString('de-CH') : null;
  const confirmedDate = entry.confirmedAt || (entry.status === 'CONFIRMED' ? entry.updatedAt : null);
  const confirmedDateStr = confirmedDate ? new Date(confirmedDate).toLocaleDateString('de-CH') : null;
  
  // Tooltip with full details including audit trail
  const tooltipParts = [
    `Kategorie: ${categoryLabel}`,
    isProject && location ? `Baustelle: ${locationName}` : '',
    isProject && locationAddress ? `Adresse: ${locationAddress}` : '',
    isProject && resourcesDisplay ? `Ressourcen: ${resourcesDisplay}` : '',
    entry.source === 'SELF_PLAN' ? 'Selbst geplant' : 'Admin geplant',
    isAdmin && createdBy ? `Geplant von: ${createdBy}` : '',
    isAdmin && createdDateStr ? `Geplant am: ${createdDateStr}` : '',
    confirmedDateStr ? `Bestätigt am: ${confirmedDateStr}` : '',
    isKrank ? (hasMedicalCertificate ? 'Arztzeugnis: Vorhanden' : 'Arztzeugnis: Fehlt') : '',
    entry.note ? `Notiz: ${entry.note}` : ''
  ].filter(Boolean);
  const tooltip = tooltipParts.join('\n');
  
  return `
    <div class="planning-block ${statusClass}" 
         style="top: ${top}px; height: ${height}px;"
         data-planning-entry-id="${entry.id}"
         title="${tooltip.replace(/"/g, '&quot;')}">
      <div class="planning-block__content">
        <div class="planning-block__header">
          <div class="planning-block__category-badge">${categoryLabel} ${sourceBadge} ${medicalBadge}</div>
          ${statusBadge}
        </div>
        ${displayContent}
        ${entry.allDay ? '<div class="planning-block__badge">Ganztägig</div>' : ''}
        ${actionsHtml}
      </div>
    </div>
  `;
}

/**
 * Render week view with planning blocks
 */
export function renderWeekView() {
  const state = getState();
  const calendarDate = state.ui.calendarDate || new Date();
  const weekStart = getWeekStartDate(calendarDate);
  const weekDays = generateWeekDays(weekStart);
  const weekStartStr = formatDateLocal(weekStart);
  
  // Get worker ID for planning
  const planningForWorkerId = getPlanningForWorkerId();
  const activeWorkerId = getActiveWorkerId();
  const viewWorkerId = planningForWorkerId || activeWorkerId;
  
  if (!viewWorkerId) {
    return '<div class="content__body"><p>Bitte wählen Sie einen Mitarbeiter aus.</p></div>';
  }
  
  // Get planning entries for this week
  const planningEntries = getPlanningEntriesForWeek(weekStartStr, viewWorkerId);
  
  // Get time entries for this week (for comparison)
  const weekEndStr = weekDays[6].dateStr;
  const timeEntries = (state.data.timeEntries || []).filter(entry => {
    if (entry.worker_id !== viewWorkerId && entry.user_id !== viewWorkerId) return false;
    return entry.entry_date >= weekStartStr && entry.entry_date <= weekEndStr;
  });
  
  // Group planning entries by day
  const entriesByDay = {};
  weekDays.forEach(day => {
    entriesByDay[day.dateStr] = planningEntries.filter(e => e.date === day.dateStr);
  });
  
  // Generate time slots (0-24h)
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    timeSlots.push({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`
    });
  }
  
  const currentUser = getActiveUser();
  const canCreate = currentUser && (getActiveWorkerId() === viewWorkerId || getActiveUserId() === viewWorkerId);
  
  return `
    <div class="week-view week-view--planning">
      <div class="week-view__header">
        <div class="week-view__week-label">
          KW ${getWeekNumber(weekStart)} - ${weekStart.getDate()}.${weekStart.getMonth() + 1}. - ${weekDays[6].dayNum}.${weekDays[6].date.getMonth() + 1}. ${weekStart.getFullYear()}
        </div>
        ${canCreate ? `
          <button class="btn-secondary" data-action="open-create-planning-entry" data-worker-id="${viewWorkerId}" title="Planungsblock hinzufügen">
            <span class="btn-icon">+</span>
            <span class="btn-text">Block hinzufügen</span>
          </button>
        ` : ''}
      </div>
      
      <div class="week-view__grid">
        <div class="week-view__time-column">
          ${timeSlots.map(slot => `
            <div class="week-view__time-slot" style="height: 64px;">
              <span class="week-view__time-label">${slot.label}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="week-view__days-container">
          ${weekDays.map(day => {
            const dayEntries = entriesByDay[day.dateStr] || [];
            const isToday = formatDateLocal(new Date()) === day.dateStr;
            
            return `
              <div class="week-view__day-column ${isToday ? 'week-view__day-column--today' : ''}" 
                   data-date="${day.dateStr}"
                   data-day-name="${day.dayName}">
                <div class="week-view__day-header">
                  <div class="week-view__day-name">${day.dayName}</div>
                  <div class="week-view__day-number">${day.dayNum}</div>
                </div>
                <div class="week-view__day-body" style="height: 1536px;">
                  ${dayEntries.map(entry => {
                    const location = state.data.locations.find(l => l.id === entry.locationId);
                    return renderPlanningBlock(entry, location, getActiveUser());
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
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

