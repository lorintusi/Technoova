/**
 * Vehicle Management View
 * CRUD interface for vehicles
 */

import { getState, getVehicles } from '../../state/index.js';
import { renderResponsiveList } from '../../components/responsiveList.js';

/**
 * Render vehicle management view
 */
export function renderVehicleManagementView() {
  const vehicles = getVehicles();
  
  const listHtml = renderResponsiveList(vehicles, {
    entityName: 'Fahrzeug',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Typ' },
      { 
        key: 'license_plate', 
        label: 'Kennzeichen',
        render: (value, item) => item.licensePlate || item.license_plate || '-'
      },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => getStatusBadge(value)
      }
    ],
    onEdit: true,
    onDelete: true,
    emptyMessage: 'Keine Fahrzeuge vorhanden. Erstellen Sie Ihr erstes Fahrzeug.',
    onAdd: true
  });
  
  return `
    <div class="vehicle-management">
      <div class="management-header">
        <div class="management-header__content">
          <h2>Fahrzeugverwaltung</h2>
          <p>Fahrzeuge verwalten, die für die Planung verwendet werden.</p>
        </div>
        <div class="management-header__actions">
          <button class="btn btn--primary" id="btn-add-vehicle">
            <span class="btn-icon">+</span>
            <span class="btn-text">Fahrzeug hinzufügen</span>
          </button>
        </div>
      </div>
      
      ${listHtml}
    </div>
  `;
}


/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const statusMap = {
    'available': { label: 'Verfügbar', class: 'badge--success' },
    'in_use': { label: 'Im Einsatz', class: 'badge--warning' },
    'maintenance': { label: 'Wartung', class: 'badge--warning' },
    'unavailable': { label: 'Nicht verfügbar', class: 'badge--danger' }
  };
  
  const statusInfo = statusMap[status] || { label: status || 'Unbekannt', class: '' };
  
  return `<span class="badge ${statusInfo.class}">${statusInfo.label}</span>`;
}

