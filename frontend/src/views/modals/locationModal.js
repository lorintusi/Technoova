/**
 * Einsatzorte-Modal: Liste + Anlegen/Bearbeiten
 * Felder: Name, Adresse, Referenz/Kundencode, Projektnummer, Status (aktiv/inaktiv)
 */

import { getState } from '../../state/index.js';
import { getLocations } from '../../state/selectors.js';

function locationLabel(loc) {
  return loc.name || loc.code || loc.address || `#${loc.id}`;
}

/**
 * Liste der Einsatzorte + Button „Neuer Einsatzort“
 */
export function renderLocationModalList() {
  const locations = getLocations();
  const rows = locations.map((loc) => {
    const name = locationLabel(loc);
    const projektnummer = loc.project_number ?? loc.projektnummer ?? '—';
    const status = (loc.status || 'aktiv').toLowerCase();
    return `
      <tr data-location-id="${loc.id}">
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(String(projektnummer))}</td>
        <td><span class="location-status location-status--${status === 'inaktiv' ? 'inaktiv' : 'aktiv'}">${status === 'inaktiv' ? 'Inaktiv' : 'Aktiv'}</span></td>
        <td>
          <button type="button" class="btn btn--ghost btn--sm" data-action="location-edit" data-location-id="${loc.id}">Bearbeiten</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="location-delete" data-location-id="${loc.id}">Löschen</button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="location-modal__list">
      <table class="location-table">
        <thead>
          <tr>
            <th>Name / Bezeichnung</th>
            <th>Projektnummer</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="location-modal__actions">
        <button type="button" class="btn btn--primary" data-action="location-new">+ Neuer Einsatzort</button>
      </div>
    </div>`;
}

/**
 * Formular Anlegen/Bearbeiten (Name, Adresse, Referenz, Projektnummer, Status)
 */
export function renderLocationModalForm(location = null) {
  const isEdit = !!location;
  const name = location?.name ?? location?.code ?? '';
  const address = location?.address ?? location?.adresse ?? '';
  const code = location?.code ?? location?.referenz ?? '';
  const projectNumber = location?.project_number ?? location?.projektnummer ?? '';
  const status = (location?.status || 'aktiv').toLowerCase();
  const statusInaktiv = status === 'inaktiv' || status === 'inactive';

  return `
    <div class="location-modal__form">
      <form id="form-location" data-location-id="${location?.id ?? ''}">
        <div class="modal-section">
          <div class="modal-section__title">Einsatzort</div>
          <div class="modal-section__content">
            <div class="field">
              <label for="location-name">Name / Bezeichnung *</label>
              <input type="text" id="location-name" name="name" class="input" required
                value="${escapeAttr(name)}" placeholder="z. B. Baustelle Musterstrasse" />
            </div>
            <div class="field">
              <label for="location-address">Adresse</label>
              <input type="text" id="location-address" name="address" class="input"
                value="${escapeAttr(address)}" placeholder="Straße, PLZ Ort" />
            </div>
            <div class="field">
              <label for="location-code">Referenz / Kundencode</label>
              <input type="text" id="location-code" name="code" class="input"
                value="${escapeAttr(code)}" placeholder="z. B. Kunde-123" />
            </div>
            <div class="field">
              <label for="location-project-number">Projektnummer</label>
              <input type="text" id="location-project-number" name="project_number" class="input"
                value="${escapeAttr(projectNumber)}" placeholder="z. B. 2025-001" />
            </div>
            <div class="field">
              <label for="location-status">Status</label>
              <select id="location-status" name="status" class="input">
                <option value="aktiv" ${!statusInaktiv ? 'selected' : ''}>Aktiv</option>
                <option value="inaktiv" ${statusInaktiv ? 'selected' : ''}>Inaktiv</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" data-action="location-cancel">Abbrechen</button>
          <button type="submit" class="btn btn--primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
        </div>
      </form>
    </div>`;
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Vollständiges Modal (Overlay + Header + Content mit Liste)
 */
function renderLocationModal() {
  return `
    <div class="modal-overlay location-modal-overlay" data-modal="location-modal">
      <div class="modal modal--wide" role="dialog" aria-modal="true">
        <div class="modal__header">
          <div class="modal__title">Einsatzorte</div>
          <button type="button" class="btn btn--ghost" id="btn-close-location-modal" aria-label="Schließen">✕</button>
        </div>
        <div class="location-modal__content">
          ${renderLocationModalList()}
        </div>
      </div>
    </div>`;
}

/**
 * Modal öffnen (Liste)
 */
export function openLocationModal() {
  closeLocationModal();
  const root = document.getElementById('modal-root') || document.body;
  root.insertAdjacentHTML('beforeend', renderLocationModal());
}

/**
 * Modal schließen
 */
export function closeLocationModal() {
  const el = document.querySelector('[data-modal="location-modal"]');
  if (el) el.remove();
}

/**
 * Inhalt des Modals ersetzen (für Handler: Liste ↔ Formular wechseln)
 */
export function setLocationModalContent(html) {
  const content = document.querySelector('.location-modal__content');
  if (content) content.innerHTML = html;
}
