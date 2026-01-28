/**
 * Handler für Einsatzorte-Modal
 * Liste, Neu, Bearbeiten, Löschen, Speichern, Abbrechen
 */

import { on } from './events.js';
import { getState, setState } from '../state/index.js';
import { api } from '../api/endpoints.js';
import { getLocationById } from '../state/selectors.js';
import {
  openLocationModal,
  closeLocationModal,
  setLocationModalContent,
  renderLocationModalList,
  renderLocationModalForm
} from '../views/modals/locationModal.js';
import { renderApp } from '../views/renderApp.js';
import { showToast } from '../utils/ui.js';

export function bindLocationModalHandlers() {
  // „Verwalten“ öffnet Modal (wenn Kontext Einsatzorte) – Einsatzorte-Tab zeigt Liste im Sidebar
  on('click', '#btn-locations-manage', (e) => {
    e.preventDefault();
    openLocationModal();
  });

  // Modal schließen nur über ✕ (kein Schließen bei Klick außerhalb)
  on('click', '#btn-close-location-modal', (e) => {
    e.preventDefault();
    closeLocationModal();
  });

  // Liste: „Neuer Einsatzort“ → Formular (Create)
  on('click', '[data-action="location-new"]', (e) => {
    e.preventDefault();
    setLocationModalContent(renderLocationModalForm(null));
  });

  // Liste: „Bearbeiten“ → Formular (Edit)
  on('click', '[data-action="location-edit"]', (e) => {
    e.preventDefault();
    const id = e.target.closest('[data-action="location-edit"]')?.getAttribute('data-location-id');
    if (!id) return;
    const location = getLocationById(id);
    if (location) setLocationModalContent(renderLocationModalForm(location));
  });

  // Liste: „Löschen“
  on('click', '[data-action="location-delete"]', async (e) => {
    e.preventDefault();
    const id = e.target.closest('[data-action="location-delete"]')?.getAttribute('data-location-id');
    if (!id) return;
    const loc = getLocationById(id);
    const name = loc?.name || loc?.code || `#${id}`;
    if (!confirm(`Einsatzort „${name}“ wirklich löschen?`)) return;
    try {
      const res = await api.deleteLocation(id);
      if (res && (res.success !== false)) {
        const state = getState();
        const filtered = (state.data.locations || []).filter((l) => String(l.id) !== String(id));
        setState({ data: { ...state.data, locations: filtered } });
        setLocationModalContent(renderLocationModalList());
        renderApp();
        showToast('Einsatzort gelöscht', 'success');
      } else {
        showToast(res?.error || 'Löschen fehlgeschlagen', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Löschen', 'error');
    }
  });

  // Formular: Abbrechen → zurück zur Liste
  on('click', '[data-action="location-cancel"]', (e) => {
    e.preventDefault();
    setLocationModalContent(renderLocationModalList());
  });

  // Formular: Speichern (Create/Update)
  on('submit', '#form-location', async (e) => {
    e.preventDefault();
    const form = e.target;
    const locationId = form.getAttribute('data-location-id');
    const isEdit = !!locationId;
    const name = form.querySelector('[name="name"]')?.value?.trim();
    const address = form.querySelector('[name="address"]')?.value?.trim() || null;
    const code = form.querySelector('[name="code"]')?.value?.trim() || null;
    const projectNumber = form.querySelector('[name="project_number"]')?.value?.trim() || null;
    const status = form.querySelector('[name="status"]')?.value || 'aktiv';

    if (!name) {
      showToast('Name / Bezeichnung ist Pflicht', 'error');
      return;
    }

    const payload = {
      name,
      address: address || undefined,
      code: code || undefined,
      project_number: projectNumber || undefined,
      projektnummer: projectNumber || undefined,
      status
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Speichere…';
    }

    try {
      let res;
      if (isEdit) {
        res = await api.updateLocation(locationId, payload);
      } else {
        res = await api.createLocation(payload);
      }
      // API-Client liefert bei Erfolg teils das Objekt direkt, teils { success, data }
      const d = res?.data ?? (res && typeof res.id !== 'undefined' ? res : null);
      if (res && (res.success !== false) && d) {
        const state = getState();
        const locations = state.data.locations || [];
        const normalized = {
          id: d.id,
          name: d.name,
          address: d.address ?? d.adresse,
          adresse: d.address ?? d.adresse,
          code: d.code ?? d.referenz,
          referenz: d.code ?? d.referenz,
          project_number: d.project_number ?? d.projektnummer,
          projektnummer: d.project_number ?? d.projektnummer,
          status: d.status ?? 'aktiv'
        };
        const idx = locations.findIndex((l) => String(l.id) === String(normalized.id));
        const newList = idx >= 0
          ? locations.map((l, i) => (i === idx ? normalized : l))
          : [...locations, normalized];
        setState({ data: { ...state.data, locations: newList } });
        setLocationModalContent(renderLocationModalList());
        renderApp();
        showToast(isEdit ? 'Einsatzort gespeichert' : 'Einsatzort angelegt', 'success');
      } else {
        showToast(res?.error || 'Speichern fehlgeschlagen', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Speichern', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}
