/**
 * Device Management View
 * CRUD interface for devices
 */

import { getDevices } from '../../state/index.js';
import { renderResponsiveList } from '../../components/responsiveList.js';

/**
 * Render device management view
 */
export function renderDeviceManagementView() {
  const devices = getDevices();
  
  const listHtml = renderResponsiveList(devices, {
    entityName: 'Gerät',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Typ' },
      { 
        key: 'serial_number', 
        label: 'Seriennummer',
        render: (value, item) => item.serialNumber || item.serial_number || '-'
      },
      { 
        key: 'status', 
        label: 'Status',
        render: (value) => getStatusBadge(value)
      }
    ],
    onEdit: true,
    onDelete: true,
    emptyMessage: 'Keine Geräte vorhanden. Erstellen Sie Ihr erstes Gerät.',
    onAdd: true
  });
  
  return `
    <div class="device-management">
      <div class="management-header">
        <div class="management-header__content">
          <h2>Geräteverwaltung</h2>
          <p>Geräte verwalten, die für die Planung verwendet werden.</p>
        </div>
        <div class="management-header__actions">
          <button class="btn btn--primary" id="btn-add-device">
            <span class="btn-icon">+</span>
            <span class="btn-text">Gerät hinzufügen</span>
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

