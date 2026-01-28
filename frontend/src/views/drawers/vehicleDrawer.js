/**
 * Vehicle Create/Edit Drawer
 */

export function renderVehicleDrawer(vehicle = null) {
  const isEdit = !!vehicle;
  const title = isEdit ? 'Fahrzeug bearbeiten' : 'Fahrzeug hinzufügen';
  const submitText = isEdit ? 'Speichern' : 'Hinzufügen';
  
  const values = {
    name: vehicle?.name || '',
    license_plate: vehicle?.license_plate || vehicle?.licensePlate || '',
    type: vehicle?.type || 'Transporter',
    status: vehicle?.status || 'Verfügbar'
  };
  
  return `
    <div class="drawer__header">
      <h2 class="drawer__title">${title}</h2>
      <button type="button" class="drawer__close" data-action="close-drawer">×</button>
    </div>
    <div class="drawer__body">
      <form class="drawer__form" id="vehicle-form">
        <input type="hidden" name="id" value="${vehicle?.id || ''}">
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Name</label>
          <input type="text" class="drawer__form-input" name="name" placeholder="z.B. Sprinter 1" value="${values.name}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Kennzeichen</label>
          <input type="text" class="drawer__form-input" name="license_plate" placeholder="z.B. ZH 123456" value="${values.license_plate}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Typ</label>
          <select class="drawer__form-select" name="type">
            <option value="Transporter" ${values.type === 'Transporter' ? 'selected' : ''}>Transporter</option>
            <option value="PKW" ${values.type === 'PKW' ? 'selected' : ''}>PKW</option>
            <option value="LKW" ${values.type === 'LKW' ? 'selected' : ''}>LKW</option>
            <option value="Anhänger" ${values.type === 'Anhänger' ? 'selected' : ''}>Anhänger</option>
          </select>
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
      <button type="submit" class="drawer__btn drawer__btn--primary" data-action="save-vehicle">${submitText}</button>
    </div>
  `;
}

