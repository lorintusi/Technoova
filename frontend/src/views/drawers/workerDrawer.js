/**
 * Worker (Personal) Create/Edit Drawer
 */

export function renderWorkerDrawer(worker = null) {
  const isEdit = !!worker;
  const title = isEdit ? 'Personal bearbeiten' : 'Personal hinzufügen';
  const submitText = isEdit ? 'Speichern' : 'Hinzufügen';
  
  const values = {
    name: worker?.name || '',
    role: worker?.role || '',
    company: worker?.company || '',
    status: worker?.status || 'Arbeitsbereit',
    contact_phone: worker?.contact_phone || worker?.contact?.phone || '',
    contact_email: worker?.contact_email || worker?.contact?.email || '',
    is_admin: worker?.is_admin || worker?.isAdmin || false
  };
  
  return `
    <div class="drawer__header">
      <h2 class="drawer__title">${title}</h2>
      <button type="button" class="drawer__close" data-action="close-drawer">×</button>
    </div>
    <div class="drawer__body">
      <form class="drawer__form" id="worker-form">
        <input type="hidden" name="id" value="${worker?.id || ''}">
        
        <div class="drawer__form-group">
          <label class="drawer__form-label drawer__form-label--required">Name</label>
          <input type="text" class="drawer__form-input" name="name" placeholder="z.B. Max Mustermann" value="${values.name}" required />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Funktion/Titel</label>
          <input type="text" class="drawer__form-input" name="role" placeholder="z.B. Monteur, Teamleiter" value="${values.role}" />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Firma</label>
          <input type="text" class="drawer__form-input" name="company" placeholder="z.B. AFT Bau GmbH" value="${values.company}" />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Status</label>
          <select class="drawer__form-select" name="status">
            <option value="Arbeitsbereit" ${values.status === 'Arbeitsbereit' ? 'selected' : ''}>Arbeitsbereit</option>
            <option value="Urlaub" ${values.status === 'Urlaub' ? 'selected' : ''}>Urlaub</option>
            <option value="Krank" ${values.status === 'Krank' ? 'selected' : ''}>Krank</option>
            <option value="Nicht verfügbar" ${values.status === 'Nicht verfügbar' ? 'selected' : ''}>Nicht verfügbar</option>
          </select>
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">Telefon</label>
          <input type="tel" class="drawer__form-input" name="contact_phone" placeholder="+41 79 123 45 67" value="${values.contact_phone}" />
        </div>
        
        <div class="drawer__form-group">
          <label class="drawer__form-label">E-Mail</label>
          <input type="email" class="drawer__form-input" name="contact_email" placeholder="max.mustermann@firma.ch" value="${values.contact_email}" />
        </div>
        
        <div class="drawer__form-group">
          <div class="drawer__form-toggle">
            <div class="drawer__toggle-switch ${values.is_admin ? 'drawer__toggle-switch--active' : ''}" data-toggle="is_admin">
              <input type="checkbox" name="is_admin" style="display: none;" ${values.is_admin ? 'checked' : ''} />
            </div>
            <label class="drawer__toggle-label">Admin-Rechte</label>
          </div>
          <div class="drawer__form-help">Admin kann alle Ressourcen verwalten</div>
        </div>
      </form>
    </div>
    <div class="drawer__footer">
      <button type="button" class="drawer__btn drawer__btn--secondary" data-action="close-drawer">Abbrechen</button>
      <button type="submit" class="drawer__btn drawer__btn--primary" data-action="save-worker">${submitText}</button>
    </div>
  `;
}

