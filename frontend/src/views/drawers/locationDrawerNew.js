/**
 * Location (Einsatzort) Create/Edit Drawer
 * TODO: Add autocomplete + map integration
 */

export function renderLocationDrawer(location = null) {
  const isEdit = !!location;
  const title = isEdit ? 'Einsatzort bearbeiten' : 'Einsatzort erstellen';
  const submitText = isEdit ? 'Speichern' : 'Erstellen';
  
  const values = {
    name: location?.name || '',
    code: location?.code || '',
    address: location?.address || '',
    description: location?.description || '',
    default_work_time: location?.default_work_time || location?.defaultWorkTime || '08:00',
    default_departure_time: location?.default_departure_time || location?.defaultDepartureTime || '07:00',
    contact_name: location?.contact_name || location?.contactName || '',
    contact_phone: location?.contact_phone || location?.contactPhone || '',
    is_archived: location?.is_archived || location?.isArchived || false,
    status: location?.status || 'Geplant'
  };
  
  return `
    <div class="drawer__header">
      <h2 class="drawer__title">${title}</h2>
      <button type="button" class="drawer__close" data-action="close-drawer">×</button>
    </div>
    <div class="drawer__body">
      <form class="drawer__form" id="location-form">
        <input type="hidden" name="id" value="${location?.id || ''}">
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Adresse</label>
          <div class="address-autocomplete">
            <input 
              type="text" 
              class="drawer__form-input" 
              id="address-input"
              name="address" 
              placeholder="z.B. Bahnhofstrasse 1, 8000 Zürich" 
              value="${values.address}" 
              autocomplete="off"
              required 
            />
            <div class="address-autocomplete__results" id="address-results" style="display: none;"></div>
          </div>
          <div class="drawer__form-help">Adresse wird für die Planung und Navigation verwendet</div>
          <input type="hidden" name="latitude" id="location-lat" value="${location?.latitude || location?.lat || ''}" />
          <input type="hidden" name="longitude" id="location-lon" value="${location?.longitude || location?.lon || ''}" />
          ${values.address && (location?.latitude || location?.lat) ? `
            <div class="location-map-preview" id="map-preview">
              <div class="location-map-preview__placeholder">
                📍 Karte wird bei Speichern geladen
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Name/Bezeichnung</label>
          <input type="text" class="drawer__form-input" name="name" placeholder="z.B. Baustelle Müller" value="${values.name}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Projekt-Code / ID</label>
          <input type="text" class="drawer__form-input" name="code" placeholder="z.B. 25-001" value="${values.code}" />
          <div class="drawer__form-help">Interner Code für die Identifikation</div>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Standard-Arbeitszeit</label>
          <input type="time" class="drawer__form-input" name="default_work_time" value="${values.default_work_time}" />
          <div class="drawer__form-help">Standardmäßige Ankunftszeit am Einsatzort</div>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Standard-Abfahrtszeit</label>
          <input type="time" class="drawer__form-input" name="default_departure_time" value="${values.default_departure_time}" />
          <div class="drawer__form-help">Standardmäßige Abfahrt vom Lager/Büro</div>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Beschreibung</label>
          <textarea class="drawer__form-textarea" name="description" placeholder="Optional: Details zum Einsatzort">${values.description}</textarea>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Kontaktperson</label>
          <input type="text" class="drawer__form-input" name="contact_name" placeholder="z.B. Hans Müller" value="${values.contact_name}" />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Kontakt-Telefon</label>
          <input type="tel" class="drawer__form-input" name="contact_phone" placeholder="+41 79 123 45 67" value="${values.contact_phone}" />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Status</label>
          <select class="drawer__form-select" name="status">
            <option value="Geplant" ${values.status === 'Geplant' ? 'selected' : ''}>Geplant</option>
            <option value="In Ausführung" ${values.status === 'In Ausführung' ? 'selected' : ''}>In Ausführung</option>
            <option value="Abgeschlossen" ${values.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
          </select>
        </div>
        
        <div class="drawer__form-group">
          <div class="drawer__form-toggle">
            <div class="drawer__toggle-switch ${values.is_archived ? 'drawer__toggle-switch--active' : ''}" data-toggle="is_archived">
              <input type="checkbox" name="is_archived" style="display: none;" ${values.is_archived ? 'checked' : ''} />
            </div>
            <label class="drawer__toggle-label">Archiviert</label>
          </div>
          <div class="drawer__form-help">Archivierte Einsatzorte werden ausgeblendet</div>
        </div>
      </form>
    </div>
    <div class="drawer__footer">
      <button type="button" class="drawer__btn drawer__btn--secondary" data-action="close-drawer">Abbrechen</button>
      <button type="submit" class="drawer__btn drawer__btn--primary" data-action="save-location">${submitText}</button>
    </div>
  `;
}

