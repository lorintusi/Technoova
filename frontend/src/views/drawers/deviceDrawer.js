/**
 * Device (Gerät) Create/Edit Drawer
 */

export function renderDeviceDrawer(device = null) {
  const isEdit = !!device;
  const title = isEdit ? 'Gerät bearbeiten' : 'Gerät hinzufügen';
  const submitText = isEdit ? 'Speichern' : 'Hinzufügen';
  
  const values = {
    name: device?.name || '',
    type: device?.type || 'Werkzeug',
    serial_number: device?.serial_number || device?.serialNumber || '',
    status: device?.status || 'Verfügbar'
  };
  
  return `
    <div class="drawer__header">
      <h2 class="drawer__title">${title}</h2>
      <button type="button" class="drawer__close" data-action="close-drawer">×</button>
    </div>
    <div class="drawer__body">
      <form class="drawer__form" id="device-form">
        <input type="hidden" name="id" value="${device?.id || ''}">
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Name</label>
          <input type="text" class="drawer__form-input" name="name" placeholder="z.B. Bohrmaschine Hilti" value="${values.name}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Typ</label>
          <select class="drawer__form-select" name="type">
            <option value="Werkzeug" ${values.type === 'Werkzeug' ? 'selected' : ''}>Werkzeug</option>
            <option value="Maschine" ${values.type === 'Maschine' ? 'selected' : ''}>Maschine</option>
            <option value="Messgerät" ${values.type === 'Messgerät' ? 'selected' : ''}>Messgerät</option>
            <option value="Sicherheitsausrüstung" ${values.type === 'Sicherheitsausrüstung' ? 'selected' : ''}>Sicherheitsausrüstung</option>
            <option value="Sonstiges" ${values.type === 'Sonstiges' ? 'selected' : ''}>Sonstiges</option>
          </select>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Seriennummer</label>
          <input type="text" class="drawer__form-input" name="serial_number" placeholder="Optional" value="${values.serial_number}" />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Status</label>
          <select class="drawer__form-select" name="status">
            <option value="Verfügbar" ${values.status === 'Verfügbar' ? 'selected' : ''}>Verfügbar</option>
            <option value="Im Einsatz" ${values.status === 'Im Einsatz' ? 'selected' : ''}>Im Einsatz</option>
            <option value="Wartung" ${values.status === 'Wartung' ? 'selected' : ''}>Wartung</option>
            <option value="Defekt" ${values.status === 'Defekt' ? 'selected' : ''}>Defekt</option>
          </select>
        </div>
      </form>
    </div>
    <div class="drawer__footer">
      <button type="button" class="drawer__btn drawer__btn--secondary" data-action="close-drawer">Abbrechen</button>
      <button type="submit" class="drawer__btn drawer__btn--primary" data-action="save-device">${submitText}</button>
    </div>
  `;
}

