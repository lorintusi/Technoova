/**
 * Medical Certificates Handlers
 * Handles CRUD operations for medical certificates
 */

import { on } from './events.js';
import { api } from '../api/endpoints.js';
import { getState, setState, setMedicalCertificates, removeMedicalCertificate } from '../state/index.js';
import { renderApp } from '../views/renderApp.js';
import { showToast } from '../utils/ui.js';

/**
 * Load medical certificates
 */
export async function loadMedicalCertificates(filters = {}) {
  try {
    const response = await api.getMedicalCertificates(filters);
    if (response.success) {
      const certificates = (response.data || []).map(cert => ({
        ...cert,
        downloadUrl: api.getMedicalCertificateDownloadUrl(cert.id)
      }));
      setMedicalCertificates(certificates);
      return { success: true, certificates };
    }
    return { success: false, error: response.error || 'Fehler beim Laden' };
  } catch (error) {
    console.error('Error loading medical certificates:', error);
    return { success: false, error: error.message || 'Unbekannter Fehler' };
  }
}

/**
 * Bind medical certificates handlers
 */
export function bindMedicalCertificatesHandlers() {
  // Load certificates when tab is opened (lazy loading)
  on('click', '.management__tab[data-tab="medical"]', async (e) => {
    const state = getState();
    if (state.data.medicalCertificates.length === 0) {
      // Load certificates
      await loadMedicalCertificates();
      renderApp();
    }
  });
  
  // Apply filters
  on('click', '#btn-apply-filters', async (e) => {
    e.preventDefault();
    const state = getState();
    const dateFrom = document.getElementById('filter-date-from')?.value || null;
    const dateTo = document.getElementById('filter-date-to')?.value || null;
    const workerId = document.getElementById('filter-worker')?.value || null;
    
    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (workerId) filters.workerId = workerId;
    
    await loadMedicalCertificates(filters);
    renderApp();
  });
  
  // Download certificate
  on('click', '[data-action="download-certificate"]', (e) => {
    // Link will handle download naturally, but we can track it
    const certificateId = e.target.closest('[data-action="download-certificate"]')?.getAttribute('data-certificate-id');
    if (certificateId) {
      console.log('Downloading certificate:', certificateId);
      // Link href will trigger download
    }
  });
  
  // Delete certificate
  on('click', '[data-action="delete-certificate"]', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const certificateId = e.target.closest('[data-action="delete-certificate"]')?.getAttribute('data-certificate-id');
    if (!certificateId) return;
    
    const state = getState();
    const certificate = state.data.medicalCertificates.find(c => c.id === certificateId);
    if (!certificate) return;
    
    if (!confirm(`Möchten Sie das Arztzeugnis "${certificate.filenameOriginal || certificateId}" wirklich löschen?`)) {
      return;
    }
    
    // Disable button during request
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '⏳';
    
    try {
      const response = await api.deleteMedicalCertificate(certificateId);
      if (response.success) {
        removeMedicalCertificate(certificateId);
        renderApp();
        showToast('Arztzeugnis gelöscht', 'success');
      } else {
        let errorMessage = response.error || 'Fehler beim Löschen';
        if (response.status === 403 || response.status === 401) {
          errorMessage = 'Keine Berechtigung';
        } else if (response.status >= 500) {
          errorMessage = 'Serverfehler';
        }
        showToast(`Fehler: ${errorMessage}`, 'error');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      let errorMessage = error.message || 'Fehler beim Löschen';
      if (error.status === 403 || error.status === 401) {
        errorMessage = 'Keine Berechtigung';
      } else if (error.status >= 500) {
        errorMessage = 'Serverfehler';
      }
      showToast(`Fehler: ${errorMessage}`, 'error');
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });
}

