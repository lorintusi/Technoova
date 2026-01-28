/**
 * Dispatch Card Component
 * Renders a single dispatch card with assignments
 */

import { getState } from '../../state/index.js';
import { getDispatchAssignments } from '../../state/index.js';
import { formatDateForDisplay } from '../../utils/format.js';
import { isAdmin } from '../../utils/permissions.js';

/**
 * Get resource name by type and id
 */
function getResourceName(resourceType, resourceId) {
  const state = getState();
  
  switch (resourceType) {
    case 'WORKER':
      const worker = (state.data.workers || []).find(w => w.id === resourceId);
      return worker?.name || `Worker ${resourceId}`;
    case 'VEHICLE':
      const vehicle = (state.data.vehicles || []).find(v => v.id === resourceId);
      return vehicle?.name || `Fahrzeug ${resourceId}`;
    case 'DEVICE':
      const device = (state.data.devices || []).find(d => d.id === resourceId);
      return device?.name || `Gerät ${resourceId}`;
    default:
      return `Unknown ${resourceId}`;
  }
}

/**
 * Render resource pill
 */
function renderResourcePill(assignment, canEdit) {
  const state = getState();
  const resourceName = getResourceName(assignment.resourceType || assignment.resource_type, assignment.resourceId || assignment.resource_id);
  const assignmentId = assignment.id;
  const dispatchId = assignment.dispatchItemId || assignment.dispatch_item_id;
  const resourceType = assignment.resourceType || assignment.resource_type;
  // Viaplano: Nur WORKER entfernen (eine Planungszeile = ein Mitarbeiter); Vehicle/Device-Pills haben composite id
  const isCompositeId = assignmentId && (String(assignmentId).includes('-v-') || String(assignmentId).includes('-d-'));
  const canRemove = canEdit && assignmentId && (resourceType === 'WORKER' || !isCompositeId);

  if (canRemove) {
    const effectiveId = assignment.dispatchAssignmentId != null ? assignment.dispatchAssignmentId : assignmentId;
    return `
      <span class="chip chip--removable">
        <span class="chip__text">${resourceName}</span>
        <button 
          class="chip__remove" 
          data-action="remove-assignment"
          data-assignment-id="${effectiveId}"
          data-dispatch-id="${dispatchId}"
          data-resource-type="${resourceType}"
          title="Entfernen"
        >×</button>
      </span>
    `;
  }

  return `<span class="chip"><span class="chip__text">${resourceName}</span></span>`;
}

/**
 * Render dispatch card
 * @param {object} item - Dispatch item
 * @param {Array} assignments - Assignments for this item
 */
export function renderDispatchCard(item, assignments = []) {
  const state = getState();
  const currentUser = state.data.currentUser;
  const canEdit = isAdmin(currentUser);
  
  // Get location
  const location = (state.data.locations || []).find(l => l.id === (item.locationId || item.location_id));
  const locationCode = location?.code || 'Kein Ort';
  const locationAddress = location?.address || '';
  
  // Time display
  const timeDisplay = item.allDay || item.all_day 
    ? 'Ganztägig' 
    : (item.startTime || item.start_time) && (item.endTime || item.end_time)
      ? `${item.startTime || item.start_time} - ${item.endTime || item.end_time}`
      : 'Keine Zeit';
  
  // Status badge
  const status = item.status || 'PLANNED';
  const statusClass = status === 'CONFIRMED' ? 'badge--success' : status === 'CANCELLED' ? 'badge--danger' : 'badge--warning';
  const statusLabel = status === 'CONFIRMED' ? 'Bestätigt' : status === 'CANCELLED' ? 'Abgesagt' : 'Geplant';
  
  // Filter assignments by type
  const workers = assignments.filter(a => (a.resourceType || a.resource_type) === 'WORKER');
  const vehicles = assignments.filter(a => (a.resourceType || a.resource_type) === 'VEHICLE');
  const devices = assignments.filter(a => (a.resourceType || a.resource_type) === 'DEVICE');
  
  // Viaplano-Slot: Kein category, Standard „Projekt“
  const category = item.category || 'PROJEKT';
  const categoryLabels = {
    'PROJEKT': 'Projekt',
    'SCHULUNG': 'Schulung',
    'BUERO': 'Büro',
    'TRAINING': 'Training',
    'KRANK': 'Krank',
    'MEETING': 'Meeting'
  };
  const categoryLabel = categoryLabels[category] || category;
  
  // ⚠️ Warn if no location set (required for resource assignments)
  const hasLocation = !!(item.locationId || item.location_id);
  const locationWarning = !hasLocation ? 'dispatch-card--no-location' : '';

  return `
    <div class="dispatch-card ${locationWarning}" data-dispatch-item-id="${item.id}">
      <!-- EINSATZORT: PROMINENT HEADER -->
      <div class="dispatch-card__location-header ${!hasLocation ? 'dispatch-card__location-header--missing' : ''}">
        <div class="dispatch-card__location-icon">
          ${hasLocation ? '📍' : '⚠️'}
        </div>
        <div class="dispatch-card__location-info">
          <div class="dispatch-card__location-name">
            ${hasLocation ? `<strong>${locationCode}</strong>` : '<strong>Kein Einsatzort</strong>'}
          </div>
          ${locationAddress && hasLocation ? `
            <div class="dispatch-card__location-address">${locationAddress}</div>
          ` : ''}
          ${!hasLocation ? `
            <div class="dispatch-card__location-warning">Bitte Einsatzort setzen, bevor Ressourcen zugewiesen werden</div>
          ` : ''}
        </div>
        <div class="dispatch-card__meta-badges">
          <span class="badge badge--sm badge--primary">${categoryLabel}</span>
          <span class="badge badge--sm ${statusClass}">${statusLabel}</span>
        </div>
      </div>
      
      <!-- TIME & NOTE -->
      <div class="dispatch-card__body">
        <div class="dispatch-card__time-row">
          <span class="dispatch-card__time-icon">⏰</span>
          <span class="dispatch-card__time-text">${timeDisplay}</span>
        </div>
        ${item.note ? `
          <div class="dispatch-card__note">
            💬 ${item.note}
          </div>
        ` : ''}
        <!-- RESSOURCEN: GRUPPIERT & VISUELL KLAR -->
        <div class="dispatch-card__resources-section">
          <h4 class="dispatch-card__section-title">Zugewiesene Ressourcen</h4>
          
          <div 
            class="dispatch-card__resource-group dispatch-card__resource-group--workers ${workers.length > 0 ? '' : 'dispatch-card__resource-group--empty'} ${!hasLocation ? 'dispatch-card__resource-group--disabled' : ''}"
            data-drop="WORKER"
            data-dispatch-id="${item.id}"
            data-dispatch-item-id="${item.id}"
            data-resource-type="WORKER"
          >
            <div class="dispatch-card__resource-header">
              <span class="dispatch-card__resource-icon">👤</span>
              <strong class="dispatch-card__resource-label">Personal</strong>
              <span class="dispatch-card__resource-count">${workers.length}</span>
            </div>
            <div class="dispatch-card__resource-list">
              ${workers.length > 0 ? workers.map(w => renderResourcePill(w, canEdit)).join('') : `<span class="dropzone-placeholder">${hasLocation ? 'Personal zuweisen...' : '⚠️ Erst Einsatzort setzen'}</span>`}
            </div>
          </div>
          
          <div 
            class="dispatch-card__resource-group dispatch-card__resource-group--vehicles ${vehicles.length > 0 ? '' : 'dispatch-card__resource-group--empty'} ${!hasLocation ? 'dispatch-card__resource-group--disabled' : ''}"
            data-drop="VEHICLE"
            data-dispatch-id="${item.id}"
            data-dispatch-item-id="${item.id}"
            data-resource-type="VEHICLE"
          >
            <div class="dispatch-card__resource-header">
              <span class="dispatch-card__resource-icon">🚗</span>
              <strong class="dispatch-card__resource-label">Fahrzeuge</strong>
              <span class="dispatch-card__resource-count">${vehicles.length}</span>
            </div>
            <div class="dispatch-card__resource-list">
              ${vehicles.length > 0 ? vehicles.map(v => renderResourcePill(v, canEdit)).join('') : `<span class="dropzone-placeholder">${hasLocation ? 'Fahrzeuge zuweisen...' : '⚠️ Erst Einsatzort setzen'}</span>`}
            </div>
          </div>
          
          <div 
            class="dispatch-card__resource-group dispatch-card__resource-group--devices ${devices.length > 0 ? '' : 'dispatch-card__resource-group--empty'} ${!hasLocation ? 'dispatch-card__resource-group--disabled' : ''}"
            data-drop="DEVICE"
            data-dispatch-id="${item.id}"
            data-dispatch-item-id="${item.id}"
            data-resource-type="DEVICE"
          >
            <div class="dispatch-card__resource-header">
              <span class="dispatch-card__resource-icon">🔧</span>
              <strong class="dispatch-card__resource-label">Geräte</strong>
              <span class="dispatch-card__resource-count">${devices.length}</span>
            </div>
            <div class="dispatch-card__resource-list">
              ${devices.length > 0 ? devices.map(d => renderResourcePill(d, canEdit)).join('') : `<span class="dropzone-placeholder">${hasLocation ? 'Geräte zuweisen...' : '⚠️ Erst Einsatzort setzen'}</span>`}
            </div>
          </div>
        </div>
          <div class="dispatch-card__resources">
            ${vehicles.length > 0 ? vehicles.map(v => renderResourcePill(v, canEdit)).join('') : '<em class="dropzone-placeholder">Ziehen zum Zuweisen</em>'}
          </div>
        </div>
        <div 
          class="dispatch-card__section dispatch-card__section--drop-zone ${devices.length > 0 ? '' : 'dispatch-card__section--empty'}"
          data-drop="DEVICE"
          data-dispatch-id="${item.id}"
          data-dispatch-item-id="${item.id}"
          data-resource-type="DEVICE"
        >
          <strong>Geräte:</strong>
          <div class="dispatch-card__resources">
            ${devices.length > 0 ? devices.map(d => renderResourcePill(d, canEdit)).join('') : '<em class="dropzone-placeholder">Ziehen zum Zuweisen</em>'}
          </div>
        </div>
      </div>
      ${canEdit && !item.assignmentId ? `
        <div class="dispatch-card__actions">
          <button class="btn-icon" data-action="edit-dispatch-item" data-dispatch-item-id="${item.id}" title="Bearbeiten">✏️</button>
          <button class="btn-icon" data-action="delete-dispatch-item" data-dispatch-item-id="${item.id}" title="Löschen">🗑️</button>
        </div>
      ` : ''}
    </div>
  `;
}

