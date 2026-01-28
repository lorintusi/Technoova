/**
 * Medical Certificates Management View
 * Admin view for managing medical certificates
 */

import { getState, getMedicalCertificates } from '../../state/index.js';
import { isAdmin } from '../../utils/permissions.js';
import { formatDateForDisplay } from '../../utils/format.js';
import { showLoadingState, showEmpty, showError } from '../../utils/loadingStates.js';

/**
 * Render medical certificates view
 */
export function renderMedicalCertificatesView() {
  const state = getState();
  const currentUser = state.data.currentUser;
  const certificates = getMedicalCertificates();
  
  const userIsAdmin = isAdmin();
  
  // Filter by current user if not admin
  const filteredCertificates = userIsAdmin 
    ? certificates 
    : certificates.filter(c => c.workerId === currentUser?.workerId);
  
  return `
    <div class="medical-certificates-management">
      <div class="medical-certificates-management__header">
        <div>
          <h2>Arztzeugnisse</h2>
          <p>Verwaltung und Übersicht aller hochgeladenen Arztzeugnisse.</p>
        </div>
        <div class="medical-certificates-management__filters">
          <div class="filter-group">
            <label for="filter-date-from">Von:</label>
            <input type="date" id="filter-date-from" class="input input--small" />
          </div>
          <div class="filter-group">
            <label for="filter-date-to">Bis:</label>
            <input type="date" id="filter-date-to" class="input input--small" />
          </div>
          ${userIsAdmin ? `
            <div class="filter-group">
              <label for="filter-worker">Mitarbeiter:</label>
              <select id="filter-worker" class="input input--small">
                <option value="">Alle</option>
                ${(state.data.workers || []).map(worker => `
                  <option value="${worker.id}">${worker.name}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          <button class="btn btn--secondary" id="btn-apply-filters">Filter anwenden</button>
        </div>
      </div>
      
      ${filteredCertificates.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">🏥</div>
          <div class="empty-state__title">Keine Arztzeugnisse vorhanden</div>
          <div class="empty-state__message">Arztzeugnisse werden automatisch erstellt, wenn ein Mitarbeiter mit Kategorie "KRANK" geplant wird.</div>
        </div>
      ` : `
        <div class="medical-certificates-table-container">
          <table class="medical-certificates-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mitarbeiter</th>
                <th>Kategorie</th>
                <th>Datei</th>
                <th>Hochgeladen am</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCertificates.map(cert => renderCertificateRow(cert, userIsAdmin)).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

/**
 * Render certificate row
 */
function renderCertificateRow(certificate, userIsAdmin) {
  const date = formatDateForDisplay(certificate.date);
  const uploadedAt = certificate.uploadedAt 
    ? new Date(certificate.uploadedAt).toLocaleDateString('de-CH')
    : '—';
  
  const category = certificate.planningCategory === 'KRANK' ? 'Krank' : certificate.planningCategory || '—';
  const fileSize = certificate.sizeBytes 
    ? (certificate.sizeBytes < 1024 
        ? `${certificate.sizeBytes} B` 
        : `${(certificate.sizeBytes / 1024).toFixed(1)} KB`)
    : '—';
  
  return `
    <tr data-certificate-id="${certificate.id}">
      <td>${date}</td>
      <td>${certificate.workerName || '—'}</td>
      <td><span class="badge badge--category">${category}</span></td>
      <td>
        <div class="certificate-file-info">
          <span class="certificate-file-name">${certificate.filenameOriginal || '—'}</span>
          <span class="certificate-file-size">${fileSize}</span>
        </div>
      </td>
      <td>${uploadedAt}</td>
      <td>
        <div class="certificate-actions">
          <a href="${certificate.downloadUrl || '#'}" 
             class="btn-icon" 
             data-action="download-certificate" 
             data-certificate-id="${certificate.id}"
             title="Herunterladen"
             download>⬇️</a>
          ${userIsAdmin ? `
            <button class="btn-icon" 
                    data-action="delete-certificate" 
                    data-certificate-id="${certificate.id}"
                    title="Löschen">🗑️</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

